import { Router, Request, Response } from 'express';
import path from 'path';
import { requireStudentAuth } from '../middleware/studentAuth';
import { prisma } from '../lib/prisma';
import { profilePhotoUpload } from '../middleware/upload';
import { driveService } from '../services/drive.service';
import { env } from '../config/env';
import { invalidateMediaDriveIdCache } from './public.routes';

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
    const rollNo = req.student?.rollNo;

    const [student, submissionResult, introVideo] = await Promise.all([
      prisma.student.findUnique({
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
      }),
      rollNo
        ? prisma.submission.findFirst({
            where: { rollNo },
            orderBy: { submittedAt: 'desc' },
            select: {
              id: true,
              status: true,
              submittedAt: true,
              videoDriveId: true,
              reviewText: true,
              reviewPros: true,
              reviewCons: true,
              reviewedAt: true,
            },
          })
        : Promise.resolve(null),
      prisma.introVideo.findFirst({
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          status: true,
          reviewNote: true,
          isPublic: true,
          submittedAt: true,
          driveFileId: true,
        },
      })
    ]);

    if (!student) return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });

    let submission = submissionResult;
    if (!submission && student.rollNo && !rollNo) {
      submission = await prisma.submission.findFirst({
        where: { rollNo: student.rollNo },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          videoDriveId: true,
          reviewText: true,
          reviewPros: true,
          reviewCons: true,
          reviewedAt: true,
        },
      });
    }

    res.setHeader('Cache-Control', 'private, max-age=30, must-revalidate');
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
      specialQualities: student.profile?.specialQualities || '',
      photoUrl: (student.profile?.photoDriveId || student.profile?.photoUrl)
        ? `/api/public/media/photo/${student.profile.id || student.id}`
        : null,
      viewUrl: (student.profile?.photoDriveId || student.profile?.photoUrl)
        ? `/api/public/media/photo/${student.profile.id || student.id}`
        : null,
      hasPhoto: Boolean(student.profile?.photoDriveId || student.profile?.photoUrl),
      photoOffsetX: student.profile?.photoOffsetX ?? 0,
      photoOffsetY: student.profile?.photoOffsetY ?? 0,
      photoZoom: student.profile?.photoZoom ?? 1,
      githubUrl: student.profile?.githubUrl || '',
      linkedinUrl: student.profile?.linkedinUrl || '',
      leetcodeUrl: student.profile?.leetcodeUrl || '',
      codechefUrl: student.profile?.codechefUrl || '',
      portfolioUrl: student.profile?.portfolioUrl || '',
      skills: (student.profile?.skills || []).map(s => s.skill.name),
      skillObjects: (student.profile?.skills || []).map(s => s.skill),
      isPublic: student.profile?.isPublic || false,
      video: introVideo ? {
        id: introVideo.id,
        status: introVideo.status,
        reviewNote: introVideo.reviewNote || null,
        isPublic: Boolean(introVideo.isPublic),
        submittedAt: introVideo.submittedAt,
        hasFile: Boolean(introVideo.driveFileId && introVideo.driveFileId.trim() !== ''),
      } : null,
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
    const { biography, bio, specialQualities } = req.body;
    // Prefer `bio` over `biography` — the edit form sends `bio` explicitly,
    // but `...profile` spread also includes `biography` with the OLD value.
    const bioText = bio !== undefined ? bio : (biography !== undefined ? biography : undefined);
    if (bioText && bioText.length > 300) {
      return res.status(400).json({ error: 'Biography max 300 chars' });
    }
    if (specialQualities !== undefined && specialQualities.length > 300) {
      return res.status(400).json({ error: 'Special qualities max 300 chars' });
    }

    // Validate the professional link fields. The client normalises the accepted
    // paste formats; this is the server-side guarantee that only a real,
    // safe absolute URL is ever persisted.
    const linkFields = ['githubUrl', 'linkedinUrl', 'leetcodeUrl', 'codechefUrl', 'portfolioUrl'] as const;
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
    if (specialQualities !== undefined) updateData.specialQualities = specialQualities.trim();
    if (normalizedLinks.githubUrl !== undefined) updateData.githubUrl = normalizedLinks.githubUrl;
    if (normalizedLinks.linkedinUrl !== undefined) updateData.linkedinUrl = normalizedLinks.linkedinUrl;
    if (normalizedLinks.leetcodeUrl !== undefined) updateData.leetcodeUrl = normalizedLinks.leetcodeUrl;
    if (normalizedLinks.codechefUrl !== undefined) updateData.codechefUrl = normalizedLinks.codechefUrl;
    if (normalizedLinks.portfolioUrl !== undefined) updateData.portfolioUrl = normalizedLinks.portfolioUrl;

    const profile = await prisma.studentProfile.upsert({
      where: { studentId },
      update: updateData,
      create: {
        studentId,
        isPublic: true,
        biography: bioText || '',
        specialQualities: specialQualities?.trim() || '',
        githubUrl: normalizedLinks.githubUrl || '',
        linkedinUrl: normalizedLinks.linkedinUrl || '',
        leetcodeUrl: normalizedLinks.leetcodeUrl || '',
        codechefUrl: normalizedLinks.codechefUrl || '',
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
      select: { rollNo: true, name: true, profile: { select: { photoDriveId: true } } },
    });
    const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
    const relativePath = `Students/${cleanRollNo}`;
    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = `${cleanRollNo}_photo${ext}`;

    // Clean up previous photo files from Drive to ensure complete override
    if (student?.profile?.photoDriveId) {
      await driveService.deleteFileById(student.profile.photoDriveId, relativePath).catch(() => {});
    }
    await driveService.deleteFilesByPrefix(relativePath, `${cleanRollNo}_photo`).catch(() => {});
    await driveService.deleteFilesByPrefix(relativePath, 'photo').catch(() => {});

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
      photoUrl = `/api/public/media/photo/${studentId}`;
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
      create: { studentId, isPublic: true, ...updateData }
    });

    invalidateMediaDriveIdCache('photo', studentId);
    if (profile.id) invalidateMediaDriveIdCache('photo', profile.id);

    const ts = Date.now();
    const maskedPhotoUrl = `/api/public/media/photo/${profile.id || studentId}?t=${ts}`;
    res.json({
      photoUrl: maskedPhotoUrl,
      viewUrl: maskedPhotoUrl,
      hasPhoto: true,
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

router.delete('/photo', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, profile: { select: { id: true, photoDriveId: true } } },
    });
    if (student?.profile?.photoDriveId || student?.rollNo) {
      const cleanRollNo = (student?.rollNo || 'STUDENT').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const relativePath = `Students/${cleanRollNo}`;
      if (student?.profile?.photoDriveId) {
        await driveService.deleteFileById(student.profile.photoDriveId, relativePath).catch(() => {});
      }
      await driveService.deleteFilesByPrefix(relativePath, `${cleanRollNo}_photo`).catch(() => {});
      await driveService.deleteFilesByPrefix(relativePath, 'photo').catch(() => {});
    }
    invalidateMediaDriveIdCache('photo', studentId);
    if (student?.profile?.id) invalidateMediaDriveIdCache('photo', student.profile.id);
    await prisma.studentProfile.updateMany({
      where: { studentId },
      data: { photoDriveId: null, photoUrl: null },
    });
    res.json({ success: true, message: 'Profile photo removed.' });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
  if (env.FEATURE_GITHUB_PORTFOLIO) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Skills are now managed via your GitHub connection.',
    });
  }
  try {
    const studentId = (req as any).studentId;
    const { skillIds, skillNames } = req.body;

    // Ensure profile exists
    const profile = await prisma.studentProfile.upsert({
      where: { studentId },
      update: {},
      create: { studentId, isPublic: true }
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
    const studentId = (req as any).studentId;
    const [academic, skills] = await Promise.all([
      prisma.changeRequest.findMany({ where: { studentId } }),
      prisma.skillRequest.findMany({ where: { studentId } }),
    ]);
    res.json({ changeRequests: academic, skillRequests: skills });
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return res.json({ changeRequests: [], skillRequests: [] });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
