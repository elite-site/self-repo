import { Router, Request, Response } from 'express';
import { requireStudentAuth } from '../middleware/studentAuth';
import { prisma } from '../lib/prisma';
import { profilePhotoUpload } from '../middleware/upload';
import { driveService } from '../services/drive.service';
import { env } from '../config/env';

/**
 * Trust-boundary check for the professional link fields.
 *
 * The edit form accepts every common paste format (full URL, no protocol,
 * `www.`, `@handle`, bare username) and normalises it to a canonical https URL
 * before sending — see `web/src/utils/socialLinks.ts`, which is unit tested from
 * this package. The API is deliberately stricter than the UI: it stores exactly
 * what it is given, so anything that is not already an absolute http(s) URL is
 * rejected. That keeps `javascript:`, `data:` and bare strings out of the
 * `href` the public profile renders.
 */
const SAFE_LINK_RE = /^https?:\/\/[^\s<>"'`\\]+$/i;

function assertSafeLink(field: string, value: unknown): string | { error: string } {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (!SAFE_LINK_RE.test(raw)) {
    return { error: `${field} must be an absolute http:// or https:// link.` };
  }
  return raw;
}

const router = Router();
router.use(requireStudentAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: {
          include: {
            skills: { include: { skill: true } }
          }
        },
        changeRequests: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!student) return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });

    const submission = await prisma.submission.findFirst({
      where: { rollNo: student.rollNo },
      orderBy: { submittedAt: 'desc' }
    });
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({
      id: student.id,
      rollNo: student.rollNo,
      name: student.name,
      year: student.year,
      section: student.section,
      branch: student.branch,
      email: student.email,
      bio: student.profile?.biography || '',
      biography: student.profile?.biography || '',
      photoUrl: student.profile?.photoUrl || null,
      photoDriveId: student.profile?.photoDriveId || null,
      photoOffsetX: student.profile?.photoOffsetX ?? 0,
      photoOffsetY: student.profile?.photoOffsetY ?? 0,
      photoZoom: student.profile?.photoZoom ?? 1,
      githubUrl: student.profile?.githubUrl || '',
      linkedinUrl: student.profile?.linkedinUrl || '',
      portfolioUrl: student.profile?.portfolioUrl || '',
      skills: (student.profile?.skills || []).map(s => s.skill.name),
      skillObjects: (student.profile?.skills || []).map(s => s.skill),
      isPublic: student.profile?.isPublic || false,
      submission: submission ? {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        videoUploaded: Boolean(submission.videoDriveId),
        reviewText: submission.reviewText || null,
        reviewPros: submission.reviewPros || [],
        reviewCons: submission.reviewCons || [],
        reviewedAt: submission.reviewedAt || null,
      } : null,
      changeRequests: student.changeRequests || []
    });
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      return res.json({});
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    const { biography, bio } = req.body;
    // Prefer `bio` over `biography` — the edit form sends `bio` explicitly,
    // but `...profile` spread also includes `biography` with the OLD value.
    const bioText = bio !== undefined ? bio : (biography !== undefined ? biography : undefined);
    if (bioText && bioText.length > 300) {
      return res.status(400).json({ error: 'Biography max 300 chars' });
    }

    // Validate the professional link fields. The client normalises the accepted
    // paste formats; this is the server-side guarantee that only a real,
    // safe absolute URL is ever persisted.
    const linkFields = ['githubUrl', 'linkedinUrl', 'portfolioUrl'] as const;
    const normalizedLinks: Record<string, string> = {};
    for (const field of linkFields) {
      if (req.body[field] === undefined) continue;
      const result = assertSafeLink(field, req.body[field]);
      if (typeof result !== 'string') {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          field,
          message: result.error,
        });
      }
      normalizedLinks[field] = result;
    }

    // Build update data — only include fields that were actually sent
    const updateData: any = {};
    if (bioText !== undefined) updateData.biography = bioText;
    if (normalizedLinks.githubUrl !== undefined) updateData.githubUrl = normalizedLinks.githubUrl;
    if (normalizedLinks.linkedinUrl !== undefined) updateData.linkedinUrl = normalizedLinks.linkedinUrl;
    if (normalizedLinks.portfolioUrl !== undefined) updateData.portfolioUrl = normalizedLinks.portfolioUrl;

    const profile = await prisma.studentProfile.upsert({
      where: { studentId },
      update: updateData,
      create: {
        studentId,
        biography: bioText || '',
        githubUrl: normalizedLinks.githubUrl || '',
        linkedinUrl: normalizedLinks.linkedinUrl || '',
        portfolioUrl: normalizedLinks.portfolioUrl || '',
      },
    });
    res.json(profile);
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return res.json({});
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/photo', profilePhotoUpload, async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const studentId = req.student?.studentId || (req as any).studentId;

    // Parse crop/adjust metadata from form body
    const photoOffsetX = req.body.photoOffsetX != null ? parseFloat(req.body.photoOffsetX) : undefined;
    const photoOffsetY = req.body.photoOffsetY != null ? parseFloat(req.body.photoOffsetY) : undefined;
    const photoZoom = req.body.photoZoom != null ? parseFloat(req.body.photoZoom) : undefined;

    // A failed storage write must not be swallowed. Previously the catch was
    // empty, so a Drive outage still returned 200 and persisted the placeholder
    // photoUrl ('mock_url'), leaving the student with a permanently broken
    // avatar and no indication that anything had failed.
    let driveFileId: string;
    let photoUrl: string;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, name: true, year: true, section: true },
    });
    const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
    const cleanName = student?.name ? student.name.replace(/[^a-zA-Z0-9]/g, '') : '';
    const studentFolder = cleanName ? `${cleanRollNo}_${cleanName}` : cleanRollNo;
    const relativePath = `Profiles/${student?.year || 'All'}-${student?.section || 'All'}/${studentFolder}`;
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `Photo_${cleanRollNo}_${Date.now()}.${ext}`;

    try {
      driveFileId = await driveService.uploadFile(
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        fileName,
        env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
        relativePath
      );
      if (!driveFileId) {
        throw new Error('Storage returned no file id for the profile photo.');
      }
      photoUrl = `/api/public/media/photo/${driveFileId}`;
    } catch (err: any) {
      console.error('Profile photo upload to storage failed:', err);
      return res.status(502).json({
        error: 'PHOTO_UPLOAD_FAILED',
        message: 'Could not save your photo. Please try again.',
      });
    }

    const updateData: any = { photoDriveId: driveFileId, photoUrl };
    if (photoOffsetX !== undefined && !isNaN(photoOffsetX)) updateData.photoOffsetX = photoOffsetX;
    if (photoOffsetY !== undefined && !isNaN(photoOffsetY)) updateData.photoOffsetY = photoOffsetY;
    if (photoZoom !== undefined && !isNaN(photoZoom)) updateData.photoZoom = photoZoom;

    const profile = await prisma.studentProfile.upsert({
      where: { studentId },
      update: updateData,
      create: { studentId, ...updateData }
    });
    res.json({
      photoUrl: profile.photoUrl || photoUrl,
      photoOffsetX: profile.photoOffsetX,
      photoOffsetY: profile.photoOffsetY,
      photoZoom: profile.photoZoom
    });
  } catch (err: any) {
    // A missing table is a deployment/migration problem, not a client error, and
    // must not be papered over with a fake photo URL.
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      console.error('studentProfile table is missing — run prisma migrations:', err.message);
      return res.status(500).json({
        error: 'PROFILE_STORAGE_UNAVAILABLE',
        message: 'Profile storage is not initialised yet. Please try again later.',
      });
    }
    console.error('Error saving profile photo:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/skills', async (req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    res.json(skills);
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return res.json([]);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/skills', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const { skillIds, skillNames } = req.body;

    // Ensure profile exists
    const profile = await prisma.studentProfile.upsert({
      where: { studentId },
      update: {},
      create: { studentId }
    });

    // Resolve skill IDs — accept either skillIds directly or skillNames to resolve
    let resolvedIds: string[] = [];

    if (Array.isArray(skillIds) && skillIds.length > 0) {
      resolvedIds = skillIds;
    } else if (Array.isArray(skillNames) && skillNames.length > 0) {
      // Look up existing skills by name
      const existingSkills = await prisma.skill.findMany({
        where: { name: { in: skillNames } }
      });
      const existingMap = new Map(existingSkills.map(s => [s.name, s.id]));

      // Create missing skills
      const missingNames = skillNames.filter((n: string) => !existingMap.has(n));
      if (missingNames.length > 0) {
        await prisma.skill.createMany({
          data: missingNames.map((name: string) => ({ name, isActive: true })),
          skipDuplicates: true
        });
        // Re-fetch to get IDs of newly created skills
        const newSkills = await prisma.skill.findMany({
          where: { name: { in: missingNames } }
        });
        newSkills.forEach(s => existingMap.set(s.name, s.id));
      }

      resolvedIds = skillNames
        .map((n: string) => existingMap.get(n))
        .filter((id: string | undefined): id is string => !!id);
    }

    // Replace all student skills
    await prisma.studentSkill.deleteMany({ where: { profileId: profile.id } });
    if (resolvedIds.length > 0) {
      await prisma.studentSkill.createMany({
        data: resolvedIds.map((id: string) => ({ profileId: profile.id, skillId: id })),
        skipDuplicates: true
      });
    }

    const skills = await prisma.studentSkill.findMany({
      where: { profileId: profile.id },
      include: { skill: true }
    });
    res.json({ skills: skills.map(s => s.skill) });
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return res.json({ skills: [] });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/change-request', async (req: Request, res: Response) => {
  try {
    const { fieldName, currentValue, requestedValue, reason, type } = req.body;
    if (type === 'skill') {
      const reqRecord = await prisma.skillRequest.create({
        data: {
          studentId: (req as any).studentId,
          skillName: requestedValue,
          reason,
          category: fieldName || 'OTHER'
        }
      });
      return res.json({ success: true, id: reqRecord.id });
    } else {
      const reqRecord = await prisma.changeRequest.create({
        data: {
          studentId: (req as any).studentId,
          fieldName,
          currentValue,
          requestedValue,
          reason
        }
      });
      return res.json({ success: true, id: reqRecord.id });
    }
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return res.json({ success: true, id: 'mock_id' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/change-requests', async (req: Request, res: Response) => {
  try {
    const academic = await prisma.changeRequest.findMany({ where: { studentId: (req as any).studentId } });
    const skills = await prisma.skillRequest.findMany({ where: { studentId: (req as any).studentId } });
    res.json({ changeRequests: academic, skillRequests: skills });
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return res.json({ changeRequests: [], skillRequests: [] });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
