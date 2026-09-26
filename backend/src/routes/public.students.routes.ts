import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    const { search, year, section, skills, skillName, status } = req.query;
    
    const where: any = {};
    
    if (status === 'ACTIVE' || status === 'GRADUATED') where.status = status;
    if (year) where.year = parseInt(year as string);
    if (section) where.section = String(section);
    
    if (search) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { rollNo: { contains: term, mode: 'insensitive' } },
        {
          profile: {
            skills: {
              some: {
                skill: { name: { contains: term, mode: 'insensitive' } }
              }
            }
          }
        }
      ];
    }
    
    const skillsFilter = skills || skillName;
    if (skillsFilter) {
      const skillsArray = (Array.isArray(skillsFilter) ? skillsFilter : [skillsFilter]).map(String);
      where.profile = {
        ...where.profile,
        skills: {
          some: {
            OR: [
              { skillId: { in: skillsArray } },
              { skill: { name: { in: skillsArray, mode: 'insensitive' } } }
            ]
          }
        }
      };
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;
    
    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
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
              id: true,
              photoUrl: true,
              photoOffsetX: true,
              photoOffsetY: true,
              photoZoom: true,
              biography: true,
              skills: { include: { skill: true } }
            }
          }
        },
        orderBy: [{ year: 'desc' }, { section: 'asc' }, { rollNo: 'asc' }],
        skip,
        take: limit
      })
    ]);
    
    const mapped = students.map(s => {
      const profile = s.profile ? {
        ...s.profile,
        photoUrl: s.profile.photoUrl ? `/api/public/media/photo/${s.profile.id || s.id}` : null,
        viewUrl: s.profile.photoUrl ? `/api/public/media/photo/${s.profile.id || s.id}` : null,
      } : null;
      return { ...s, profile };
    });

    res.json({
      students: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/public/students/skills — searchable skill categories and items
router.get('/skills', async (_req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' }
    });
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(skills);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:rollNo', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    const student = await prisma.student.findUnique({
      where: { rollNo: req.params.rollNo },
      include: {
        profile: { include: { skills: { include: { skill: true } } } },
        projects: { orderBy: { displayOrder: 'asc' } },
        achievements: { where: { status: 'APPROVED' }, include: { category: true }, orderBy: { achievedAt: 'desc' } },
        certificates: { where: { status: 'APPROVED', isPublic: true } },
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
    if (!student) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
    }
    const introVideo = student.introVideos?.[0];

    const maskedProfile = student.profile ? {
      ...student.profile,
      photoDriveId: undefined,
      photoUrl: (student.profile.photoDriveId || student.profile.photoUrl)
        ? `/api/public/media/photo/${student.profile.id || student.id}`
        : null,
      viewUrl: (student.profile.photoDriveId || student.profile.photoUrl)
        ? `/api/public/media/photo/${student.profile.id || student.id}`
        : null,
    } : null;

    const studentWithProofs = {
      ...student,
      profile: maskedProfile,
      introVideos: undefined,
      introVideo: introVideo
        ? { ...introVideo, streamUrl: `/api/public/videos/stream/${introVideo.id}` }
        : null,
      achievements: student.achievements.map((a: any) => {
        const { proofDriveId: _p, ...rest } = a;
        const viewUrl = a.proofDriveId
          ? `/api/public/media/achievement/${a.id}`
          : (a.proofUrl || null);
        return {
          ...rest,
          viewUrl,
          proofUrl: viewUrl,
        };
      }),
      certificates: student.certificates.map((c: any) => {
        const { fileDriveId: _f, ...rest } = c;
        const viewUrl = c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null;
        return {
          ...rest,
          viewUrl,
          fileUrl: viewUrl,
        };
      }),
      resumes: student.resumes.map((r: any) => {
        const { driveFileId: _d, ...rest } = r;
        const viewUrl = r.driveFileId ? `/api/public/media/resume/${r.id}` : null;
        return {
          ...rest,
          viewUrl,
          fileUrl: viewUrl,
        };
      }),
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
    
    if (!student || !student.resumes.length) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Resume not available' });
    }
    
    const resume = student.resumes[0];
    if (!resume.driveFileId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Resume file not available' });
    }
    res.redirect(`/api/public/media/resume/${resume.id}`);
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
