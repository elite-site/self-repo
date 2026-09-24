import { Router, Request, Response } from 'express';
import { requireStudentAuth } from '../middleware/studentAuth';
import { prisma } from '../lib/prisma';
import { profilePhotoUpload } from '../middleware/upload';
import { driveService } from '../services/drive.service';
import { env } from '../config/env';

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
    const { biography, bio, githubUrl, linkedinUrl, portfolioUrl } = req.body;
    const bioText = biography !== undefined ? biography : bio;
    if (bioText && bioText.length > 300) {
      return res.status(400).json({ error: 'Biography max 300 chars' });
    }
    const profile = await prisma.studentProfile.upsert({
      where: { studentId },
      update: { biography: bioText, githubUrl, linkedinUrl, portfolioUrl },
      create: { studentId, biography: bioText, githubUrl, linkedinUrl, portfolioUrl }
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
    let driveFileId = 'mock_drive_id';
    let photoUrl = 'mock_url';
    try {
      driveFileId = await driveService.uploadFile(
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        `photo_${(req as any).studentId}_${Date.now()}.${req.file.originalname.split('.').pop() || 'jpg'}`,
        env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
        'profiles'
      );
      photoUrl = `/api/public/media/photo/${driveFileId}`;
    } catch(e) { } // Ignore drive errors

    const profile = await prisma.studentProfile.upsert({
      where: { studentId: (req as any).studentId },
      update: { photoDriveId: driveFileId, photoUrl },
      create: { studentId: (req as any).studentId, photoDriveId: driveFileId, photoUrl }
    });
    res.json({ photoUrl: profile.photoUrl || photoUrl });
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return res.json({ photoUrl: 'mock_url' });
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
    const { skillIds } = req.body;
    const profile = await prisma.studentProfile.upsert({
      where: { studentId: (req as any).studentId },
      update: {},
      create: { studentId: (req as any).studentId }
    });
    await prisma.studentSkill.deleteMany({ where: { profileId: profile.id } });
    if (skillIds && skillIds.length > 0) {
      await prisma.studentSkill.createMany({
        data: skillIds.map((id: string) => ({ profileId: profile.id, skillId: id }))
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
