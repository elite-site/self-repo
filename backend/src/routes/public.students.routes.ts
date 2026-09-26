import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, year, section, skills, status } = req.query;
    
    const where: any = { profile: { isPublic: true } };
    
    if (status === 'ACTIVE' || status === 'GRADUATED') where.status = status;
    if (year) where.year = parseInt(year as string);
    if (section) where.section = String(section);
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { rollNo: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      where.profile = {
        ...where.profile,
        skills: { some: { skillId: { in: skillsArray as string[] } } }
      };
    }
    
    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        rollNo: true,
        name: true,
        year: true,
        section: true,
        status: true,
        graduatedAt: true,
        profile: {
          select: {
            photoUrl: true,
            biography: true,
            skills: { include: { skill: true } }
          }
        }
      },
      take: 50
    });
    
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:rollNo', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { rollNo: req.params.rollNo },
      include: {
        profile: { include: { skills: { include: { skill: true } } } },
        projects: { orderBy: { displayOrder: 'asc' } },
        achievements: { where: { status: { in: ['APPROVED', 'PENDING'] } }, include: { category: true }, orderBy: { achievedAt: 'desc' } },
        certificates: { where: { status: 'APPROVED' } },
        resumes: { where: { status: 'APPROVED' }, take: 1, orderBy: { submittedAt: 'desc' } },
        // Only an approved + published video is ever attached to a public
        // profile, so a pending or unapproved recording stays invisible.
        introVideos: {
          where: { status: 'APPROVED', isPublic: true, driveFileId: { not: null } },
          take: 1,
          orderBy: { publishedAt: 'desc' },
          select: { id: true, submittedAt: true, publishedAt: true, sizeMb: true },
        }
      }
    });
    if (!student || !student.profile?.isPublic) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found or not public' });
    }
    const introVideo = student.introVideos?.[0];
    const studentWithProofs = {
      ...student,
      introVideos: undefined,
      introVideo: introVideo
        ? { ...introVideo, streamUrl: `/api/public/videos/stream/${introVideo.id}` }
        : null,
      achievements: student.achievements.map((a: any) => ({
        ...a,
        proofUrl: a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.proofDriveId}` : null)
      }))
    };
    res.json(studentWithProofs);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:rollNo/resume', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { rollNo: req.params.rollNo },
      include: {
        profile: true,
        resumes: { where: { status: 'APPROVED' }, take: 1, orderBy: { submittedAt: 'desc' } }
      }
    });
    
    if (!student || !student.profile?.isPublic || !student.resumes.length) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Resume not available' });
    }
    
    const resume = student.resumes[0];
    if (!resume.driveFileId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Resume file not available' });
    }
    res.redirect(`/api/public/media/resume/${resume.driveFileId}`);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/events', async (_req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
