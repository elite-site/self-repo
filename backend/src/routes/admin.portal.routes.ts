import { Router, Request, Response } from 'express';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ActivityService } from '../services/activity.service';
import { deliverAnnouncementNotifications } from '../services/announcement.service';
import { notifyStudent, notifyVideoChangeRequested } from '../services/notification.service';
import { driveService } from '../services/drive.service';

const router = Router();
router.use(requireAdminAuth);

// ── Students
router.get('/students', async (req: Request, res: Response) => {
  try {
    const { year, section, search, page = '1', limit = '25' } = req.query;
    const where: any = {};
    if (year) where.year = parseInt(String(year), 10);
    if (section) where.section = String(section);
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { rollNo: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const p = Math.max(1, parseInt(String(page), 10));
    const l = Math.max(1, Math.min(100, parseInt(String(limit), 10)));
    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip: (p - 1) * l,
        take: l,
        orderBy: { rollNo: 'asc' },
        include: {
          profile: true,
        },
      }),
    ]);
    const rollNos = students.map((s) => s.rollNo);
    const submissions = await prisma.submission.findMany({
      where: { rollNo: { in: rollNos } },
      orderBy: { submittedAt: 'desc' },
    });
    const studentsWithSubs = students.map((s) => ({
      ...s,
      submissions: submissions.filter((sub) => sub.rollNo === s.rollNo),
    }));
    res.json({ students: studentsWithSubs, total, page: p, totalPages: Math.ceil(total / l) || 1 });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/students/:id', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: req.params.id },
          { rollNo: req.params.id },
        ],
      },
      include: {
        profile: { include: { skills: { include: { skill: true } } } },
        projects: { orderBy: { displayOrder: 'asc' } },
        achievements: { include: { category: true }, orderBy: { createdAt: 'desc' } },
        certificates: { orderBy: { createdAt: 'desc' } },
        introVideos: { orderBy: { submittedAt: 'desc' } },
        resumes: { orderBy: { submittedAt: 'desc' } },
        registrations: { include: { event: true, team: true } },
      },
    });
    if (!student) return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
    const submissions = await prisma.submission.findMany({
      where: { rollNo: student.rollNo },
      orderBy: { submittedAt: 'desc' },
    });

    const introVideos = (student.introVideos || []).map((v) => ({
      ...v,
      streamUrl: `/api/public/videos/stream/${v.id}`,
      watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(v.driveFileId) : null,
      previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(v.driveFileId) : null,
    }));
    const resumes = (student.resumes || []).map((r) => ({
      ...r,
      fileUrl: r.driveFileId ? `/api/public/media/resume/${r.driveFileId}` : null,
      previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(r.driveFileId) : null,
      watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(r.driveFileId) : null,
    }));
    const achievements = (student.achievements || []).map((a) => ({
      ...a,
      proofUrl: a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.proofDriveId}` : null),
      watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(a.proofDriveId) : null,
      previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(a.proofDriveId) : null,
    }));
    const certificates = (student.certificates || []).map((c) => ({
      ...c,
      fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.fileDriveId}` : null,
      previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(c.fileDriveId) : null,
      watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(c.fileDriveId) : null,
    }));

    res.json({
      ...student,
      introVideos,
      resumes,
      achievements,
      certificates,
      submissions,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Admin Item Management (Request Changes & Delete for Video, Resume, Achievement, Certificate, Project)
router.post('/students/:studentId/items/:type/:itemId/request-change', async (req: Request, res: Response) => {
  try {
    const { studentId, type, itemId } = req.params;
    const { note } = req.body;
    const reasonText = (note || '').trim();

    if (!reasonText) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Change request note is required.' });
    }

    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { rollNo: studentId }] },
    });
    if (!student) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found.' });
    }

    const normalizedType = type.toLowerCase().replace(/_/g, '-');
    const reviewerName = (req as any).user?.username || 'Admin';

    if (normalizedType === 'video' || normalizedType === 'intro-video' || normalizedType === 'videos') {
      const item = await prisma.introVideo.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Video not found.' });
      }
      await prisma.introVideo.update({
        where: { id: itemId },
        data: {
          status: 'CHANGES_REQUESTED',
          reviewNote: reasonText,
          changeRequestNote: reasonText,
          changeRequestedAt: new Date(),
          isPublic: false,
          reviewedBy: reviewerName,
          reviewedAt: new Date(),
        },
      });
      await notifyVideoChangeRequested(student.id, reasonText);
    } else if (normalizedType === 'resume' || normalizedType === 'resumes') {
      const item = await prisma.resume.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Resume not found.' });
      }
      await prisma.resume.update({
        where: { id: itemId },
        data: {
          status: 'CHANGES_REQUESTED',
          reviewNote: reasonText,
          reviewedBy: reviewerName,
          reviewedAt: new Date(),
        },
      });
      await notifyStudent({
        studentId: student.id,
        title: 'Resume Revision Requested',
        message: `Admin requested changes on your resume: "${reasonText}". Please upload an updated PDF.`,
        actionUrl: '/dashboard/resume',
      });
    } else if (normalizedType === 'achievement' || normalizedType === 'achievements') {
      const item = await prisma.achievement.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Achievement not found.' });
      }
      await prisma.achievement.update({
        where: { id: itemId },
        data: {
          status: 'CHANGES_REQUESTED',
          reviewNote: reasonText,
          isPublic: false,
          reviewedBy: reviewerName,
          reviewedAt: new Date(),
        },
      });
      await notifyStudent({
        studentId: student.id,
        title: 'Achievement Revision Requested',
        message: `Admin requested changes on your achievement "${item.title}": "${reasonText}".`,
        actionUrl: '/dashboard/achievements',
      });
    } else if (normalizedType === 'certificate' || normalizedType === 'certificates') {
      const item = await prisma.certificate.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
      }
      await prisma.certificate.update({
        where: { id: itemId },
        data: {
          status: 'CHANGES_REQUESTED',
          reviewNote: reasonText,
          isPublic: false,
          reviewedBy: reviewerName,
          reviewedAt: new Date(),
        },
      });
      await notifyStudent({
        studentId: student.id,
        title: 'Certificate Revision Requested',
        message: `Admin requested changes on your certificate "${item.title}": "${reasonText}".`,
        actionUrl: '/dashboard/certificates',
      });
    } else if (normalizedType === 'project' || normalizedType === 'projects') {
      const item = await prisma.project.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Project not found.' });
      }
      await prisma.project.update({
        where: { id: itemId },
        data: {
          status: 'CHANGES_REQUESTED',
          reviewNote: reasonText,
          isPublic: false,
          reviewedBy: reviewerName,
          reviewedAt: new Date(),
        },
      });
      await notifyStudent({
        studentId: student.id,
        title: 'Project Revision Requested',
        message: `Admin requested changes on your project "${item.title}": "${reasonText}".`,
        actionUrl: '/dashboard/projects',
      });
    } else {
      return res.status(400).json({ error: 'BAD_REQUEST', message: `Unknown item type: ${type}` });
    }

    await ActivityService.log({
      category: 'ADMIN',
      action: 'REQUEST_CHANGE',
      details: `Admin requested changes for ${normalizedType} ${itemId} of student ${student.rollNo}: "${reasonText}"`,
      userEmail: (req as any).user?.email || 'admin',
    });

    res.json({ success: true, message: 'Change requested successfully and student notified.' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/students/:studentId/items/:type/:itemId', async (req: Request, res: Response) => {
  try {
    const { studentId, type, itemId } = req.params;
    const reasonText = (req.body?.reason || (req.query as any)?.reason || '').trim();

    const student = await prisma.student.findFirst({
      where: { OR: [{ id: studentId }, { rollNo: studentId }] },
    });
    if (!student) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found.' });
    }

    const normalizedType = type.toLowerCase().replace(/_/g, '-');

    if (normalizedType === 'video' || normalizedType === 'intro-video' || normalizedType === 'videos') {
      const item = await prisma.introVideo.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Video not found.' });
      }
      if (item.driveFileId) {
        await driveService.deleteFileById(item.driveFileId).catch(() => {});
      }
      await prisma.introVideo.delete({ where: { id: itemId } });
      await notifyStudent({
        studentId: student.id,
        title: 'Introduction Video Deleted',
        message: reasonText
          ? `Your introduction video was removed by administrator. Reason: "${reasonText}".`
          : 'Your introduction video was removed by administrator.',
        actionUrl: '/intro-video',
      });
    } else if (normalizedType === 'resume' || normalizedType === 'resumes') {
      const item = await prisma.resume.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Resume not found.' });
      }
      if (item.driveFileId) {
        await driveService.deleteFileById(item.driveFileId).catch(() => {});
      }
      await prisma.resume.delete({ where: { id: itemId } });
      await notifyStudent({
        studentId: student.id,
        title: 'Resume Deleted',
        message: reasonText
          ? `Your resume was removed by administrator. Reason: "${reasonText}".`
          : 'Your resume was removed by administrator.',
        actionUrl: '/dashboard/resume',
      });
    } else if (normalizedType === 'achievement' || normalizedType === 'achievements') {
      const item = await prisma.achievement.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Achievement not found.' });
      }
      if (item.proofDriveId) {
        await driveService.deleteFileById(item.proofDriveId).catch(() => {});
      }
      await prisma.achievement.delete({ where: { id: itemId } });
      await notifyStudent({
        studentId: student.id,
        title: 'Achievement Deleted',
        message: reasonText
          ? `Your achievement "${item.title}" was removed by administrator. Reason: "${reasonText}".`
          : `Your achievement "${item.title}" was removed by administrator.`,
        actionUrl: '/dashboard/achievements',
      });
    } else if (normalizedType === 'certificate' || normalizedType === 'certificates') {
      const item = await prisma.certificate.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
      }
      if (item.fileDriveId) {
        await driveService.deleteFileById(item.fileDriveId).catch(() => {});
      }
      await prisma.certificate.delete({ where: { id: itemId } });
      await notifyStudent({
        studentId: student.id,
        title: 'Certificate Deleted',
        message: reasonText
          ? `Your certificate "${item.title}" was removed by administrator. Reason: "${reasonText}".`
          : `Your certificate "${item.title}" was removed by administrator.`,
        actionUrl: '/dashboard/certificates',
      });
    } else if (normalizedType === 'project' || normalizedType === 'projects') {
      const item = await prisma.project.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Project not found.' });
      }
      await prisma.project.delete({ where: { id: itemId } });
      await notifyStudent({
        studentId: student.id,
        title: 'Project Deleted',
        message: reasonText
          ? `Your project "${item.title}" was removed by administrator. Reason: "${reasonText}".`
          : `Your project "${item.title}" was removed by administrator.`,
        actionUrl: '/dashboard/projects',
      });
    } else {
      return res.status(400).json({ error: 'BAD_REQUEST', message: `Unknown item type: ${type}` });
    }

    await ActivityService.log({
      category: 'ADMIN',
      action: 'DELETE_ITEM',
      details: `Admin deleted ${normalizedType} ${itemId} for student ${student.rollNo}${reasonText ? ` (Reason: ${reasonText})` : ''}`,
      userEmail: (req as any).user?.email || 'admin',
    });

    res.json({ success: true, message: 'Item deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/students/:id/status', async (req: Request, res: Response) => {
  try {
    const { isPublic } = req.body;
    const profile = await prisma.studentProfile.upsert({
      where: { studentId: req.params.id },
      update: { isPublic: Boolean(isPublic) },
      create: { studentId: req.params.id, isPublic: Boolean(isPublic) },
    });
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/students/:id/feature', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Student feature status toggled' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Moderation Queue (Strictly Intro Videos; resumes/achievements/certificates are auto-approved)
router.get('/moderation', async (req: Request, res: Response) => {
  try {
    const videos = await prisma.introVideo.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      include: { student: true },
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ videos, resumes: [], achievements: [], certificates: [] });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

const handleModerationDecision = async (
  type: string,
  id: string,
  status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'HIDDEN',
  reason?: string
) => {
  switch (type) {
    case 'videos': {
      // Approval publishes the video publicly; a rejection or a change request
      // takes it off the public page and tells the student what to do.
      const data: Record<string, unknown> = {
        status,
        reviewNote: reason,
        reviewedAt: new Date(),
      };

      if (status === 'APPROVED') {
        data.isPublic = true;
        data.publishedAt = new Date();
        data.changeRequestedAt = null;
        data.changeRequestNote = null;
      } else {
        data.isPublic = false;
        data.publishedAt = null;
        if (status === 'CHANGES_REQUESTED') {
          data.changeRequestedAt = new Date();
          data.changeRequestNote = reason;
        }
      }

      const updated = await prisma.introVideo.update({ where: { id }, data });

      const video = await prisma.introVideo.findUnique({
        where: { id },
        include: { student: { select: { id: true } } },
      });

      if (video?.student?.id) {
        if (status === 'CHANGES_REQUESTED') {
          await notifyVideoChangeRequested(video.student.id, reason);
        } else if (status === 'APPROVED') {
          await notifyStudent({
            studentId: video.student.id,
            title: 'Introduction video approved and published',
            message: 'Your introduction video was approved and is now visible on the public page.',
          });
        } else if (status === 'REJECTED') {
          await notifyStudent({
            studentId: video.student.id,
            title: 'Introduction video rejected',
            message: reason
              ? `Your introduction video was rejected. Faculty note: "${reason}". You can upload a new version at any time.`
              : 'Your introduction video was rejected. You can upload a new version at any time.',
          });
        }
      }

      return updated;
    }
    case 'resumes':
      return prisma.resume.update({ where: { id }, data: { status, reviewNote: reason } });
    case 'achievements':
      return prisma.achievement.update({ where: { id }, data: { status, reviewNote: reason } });
    case 'certificates':
      return prisma.certificate.update({ where: { id }, data: { status, reviewNote: reason } });
    default:
      throw new Error(`Invalid moderation type: ${type}`);
  }
};

router.post('/moderation/:type/:id/approve', async (req: Request, res: Response) => {
  try {
    await handleModerationDecision(req.params.type, req.params.id, 'APPROVED', req.body.reason);
    res.json({ success: true, message: 'Item approved' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/moderation/:type/:id/reject', async (req: Request, res: Response) => {
  try {
    await handleModerationDecision(req.params.type, req.params.id, 'REJECTED', req.body.reason);
    res.json({ success: true, message: 'Item rejected' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/moderation/:type/:id/request-changes', async (req: Request, res: Response) => {
  try {
    await handleModerationDecision(req.params.type, req.params.id, 'CHANGES_REQUESTED', req.body.reason);
    res.json({ success: true, message: 'Changes requested' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/moderation/:type/:id/hide', async (req: Request, res: Response) => {
  try {
    await handleModerationDecision(req.params.type, req.params.id, 'HIDDEN', req.body.reason);
    res.json({ success: true, message: 'Item hidden' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Events (admin)
router.get('/events', async (_req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { registrations: true, submissions: true },
        },
      },
    });
    res.json({
      events: events.map((e) => ({
        ...e,
        registrationCount: e._count.registrations,
        submissionCount: e._count.submissions,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/events', async (req: Request, res: Response) => {
  try {
    const { title, name, description, year, status } = req.body;
    const eventName = title || name || 'New Event';
    const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `${slug}-${Date.now().toString().slice(-4)}`;

    const event = await prisma.event.create({
      data: {
        id,
        name: eventName,
        slug,
        year: year ? parseInt(String(year), 10) : 2026,
        status: status || 'OPEN',
      },
    });
    res.status(201).json(event);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        formFields: { orderBy: { displayOrder: 'asc' } },
        teams: { include: { members: { include: { student: true } } } },
        _count: { select: { registrations: true } },
      },
    });
    if (!event) return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/events/:id', async (req: Request, res: Response) => {
  try {
    const { name, title, year, status } = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        name: name || title,
        year: year ? parseInt(String(year), 10) : undefined,
        status,
      },
    });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/events/:id/publish', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: 'OPEN' },
    });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/events/:id/close', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' },
    });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/events/:id/archive', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/events/:id/registrations', async (req: Request, res: Response) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId: req.params.id },
      include: {
        student: true,
        event: true,
        team: {
          include: {
            members: {
              include: {
                student: {
                  select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, status: true, graduatedAt: true },
                },
              },
            },
          },
        },
        answers: { include: { field: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
    res.json({ registrations });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/events/:id/form-fields', async (req: Request, res: Response) => {
  try {
    const { label, fieldType, isRequired, options, displayOrder } = req.body;
    const field = await prisma.registrationFormField.create({
      data: {
        eventId: req.params.id,
        label: label || 'Field',
        fieldType: fieldType || 'text',
        isRequired: Boolean(isRequired),
        options: options || [],
        displayOrder: displayOrder || 0,
      },
    });
    res.status(201).json(field);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/events/:id/form-fields/:fieldId', async (req: Request, res: Response) => {
  try {
    const { label, fieldType, isRequired, options, displayOrder } = req.body;
    const field = await prisma.registrationFormField.update({
      where: { id: req.params.fieldId },
      data: {
        label,
        fieldType,
        isRequired: isRequired !== undefined ? Boolean(isRequired) : undefined,
        options,
        displayOrder,
      },
    });
    res.json(field);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/events/:id/form-fields/:fieldId', async (req: Request, res: Response) => {
  try {
    await prisma.registrationFormField.delete({ where: { id: req.params.fieldId } });
    res.json({ success: true, message: 'Form field deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Voting
router.get('/voting', async (_req: Request, res: Response) => {
  try {
    const campaigns = await prisma.votingCampaign.findMany({
      include: {
        event: true,
        _count: { select: { candidates: true, votes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      campaigns.map((c) => ({
        ...c,
        totalVotes: c._count.votes,
        candidateCount: c._count.candidates,
        eventTitle: c.event?.name,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/voting', async (req: Request, res: Response) => {
  try {
    const { title, description, rule, fixedCount, startsAt, endsAt, eventId } = req.body;
    const campaign = await prisma.votingCampaign.create({
      data: {
        title,
        description,
        rule: rule || 'ONE_TOTAL',
        fixedCount: fixedCount ? parseInt(String(fixedCount), 10) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        eventId: eventId || null,
        status: 'DRAFT',
      },
    });
    res.status(201).json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/voting/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.votingCampaign.findUnique({
      where: { id: req.params.id },
      include: {
        event: true,
        candidates: {
          include: {
            _count: { select: { votes: true } },
          },
        },
        _count: { select: { votes: true } },
      },
    });
    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND', message: 'Campaign not found' });
    res.json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/voting/:id/activate', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.votingCampaign.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
    });
    res.json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/voting/:id/close', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.votingCampaign.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' },
    });
    res.json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/voting/:id/finalize', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.votingCampaign.update({
      where: { id: req.params.id },
      data: { status: 'FINALIZED', finalizedAt: new Date() },
    });
    res.json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/voting/:id/results', async (req: Request, res: Response) => {
  try {
    const [campaign, candidateVotes] = await Promise.all([
      prisma.votingCampaign.findUnique({
        where: { id: req.params.id },
        include: {
          candidates: true,
        },
      }),
      prisma.vote.groupBy({
        by: ['candidateId'],
        where: { campaignId: req.params.id },
        _count: { id: true },
      }),
    ]);

    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND', message: 'Campaign not found' });

    const studentIds = campaign.candidates.map((c) => c.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, rollNo: true, year: true, section: true, status: true, graduatedAt: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const voteCountMap = new Map(candidateVotes.map((cv) => [cv.candidateId, cv._count.id]));
    const totalVotes = candidateVotes.reduce((acc, cv) => acc + cv._count.id, 0);

    const candidatesWithVotes = campaign.candidates.map((cand) => ({
      candidateId: cand.id,
      studentId: cand.studentId,
      student: studentMap.get(cand.studentId) || null,
      votes: voteCountMap.get(cand.id) || 0,
      percentage: totalVotes > 0 ? (((voteCountMap.get(cand.id) || 0) / totalVotes) * 100).toFixed(1) : '0',
    }));

    candidatesWithVotes.sort((a, b) => b.votes - a.votes);

    res.json({
      campaign,
      totalVotes,
      candidates: candidatesWithVotes,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Communications / Announcements
router.get('/announcements', async (_req: Request, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(announcements);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/announcements', async (req: Request, res: Response) => {
  try {
    const { title, message, body, content, priority, targetYear, targetSection, targetAll, scheduledAt } = req.body;
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isFutureScheduled = scheduledDate !== null && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();

    const isTargetAll = targetAll === false ? false : (targetAll === true ? true : !(targetYear || targetSection));

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message: message || body || content || '',
        priority: priority || 'normal',
        targetYear: targetYear !== undefined && targetYear !== null && targetYear !== '' ? parseInt(String(targetYear), 10) : null,
        targetSection: targetSection ? String(targetSection) : null,
        targetAll: isTargetAll,
        createdBy: req.adminUser?.username || 'ADMIN',
        scheduledAt: scheduledDate,
        status: isFutureScheduled ? 'SCHEDULED' : 'PUBLISHED',
        publishedAt: isFutureScheduled ? null : (scheduledDate || new Date()),
      },
    });

    // Hold back notifications if scheduled in the future. The publish route
    // below uses the same delivery function, so scheduled announcements get
    // the same canonical target as immediate announcements.
    if (!isFutureScheduled) {
      await deliverAnnouncementNotifications({
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        targetAll: announcement.targetAll,
        targetYear: announcement.targetYear,
        targetSection: announcement.targetSection,
      });
    }

    res.status(201).json(announcement);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/announcements/:id/publish', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found' });
    }

    if (existing.status === 'PUBLISHED') {
      return res.json(existing);
    }

    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    await deliverAnnouncementNotifications({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      targetAll: announcement.targetAll,
      targetYear: announcement.targetYear,
      targetSection: announcement.targetSection,
    });

    res.json(announcement);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Analytics
router.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const [
      totalStudents,
      totalSubmissions,
      totalRated,
      totalProfiles,
      totalProjects,
      totalAchievements,
      totalCertificates,
      totalResumes,
      totalEvents,
      totalRegistrations,
      totalCampaigns,
      totalVotes,
      pendingModerationVideos,
      pendingModerationResumes,
      pendingModerationAchievements,
      pendingModerationCerts,
      byYearSubmissions,
      byRatingGood,
      byRatingAverage,
      byRatingPoor,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { rating: { not: null } } }),
      prisma.studentProfile.count(),
      prisma.project.count(),
      prisma.achievement.count(),
      prisma.certificate.count(),
      prisma.resume.count(),
      prisma.event.count(),
      prisma.eventRegistration.count(),
      prisma.votingCampaign.count(),
      prisma.vote.count(),
      prisma.introVideo.count({ where: { status: 'PENDING' } }),
      prisma.resume.count({ where: { status: 'PENDING' } }),
      prisma.achievement.count({ where: { status: 'PENDING' } }),
      prisma.certificate.count({ where: { status: 'PENDING' } }),
      prisma.submission.groupBy({ by: ['year'], _count: { id: true } }),
      prisma.submission.count({ where: { rating: 'GOOD' } }),
      prisma.submission.count({ where: { rating: 'AVERAGE' } }),
      prisma.submission.count({ where: { rating: 'POOR' } }),
    ]);

    const pendingModeration =
      pendingModerationVideos +
      pendingModerationResumes +
      pendingModerationAchievements +
      pendingModerationCerts;

    res.json({
      summary: {
        totalStudents,
        totalSubmissions,
        totalRated,
        totalProfiles,
        totalProjects,
        totalAchievements,
        totalCertificates,
        totalResumes,
        totalEvents,
        totalRegistrations,
        totalCampaigns,
        totalVotes,
        pendingModeration,
      },
      ratings: {
        good: byRatingGood,
        average: byRatingAverage,
        poor: byRatingPoor,
      },
      yearDistribution: byYearSubmissions.map((y) => ({
        year: y.year,
        count: y._count.id,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Settings
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.portalSettings.findMany();
    const map: Record<string, string> = {
      academic_year: '2026',
      portal_title: 'ELITE Student Portal',
      institution_name: 'Sasi Institute of Technology & Engineering',
      department_name: 'Department of Information Technology',
      max_video_size_mb: '100',
      max_photo_size_mb: '10',
      allowed_email_domain: 'sasi.ac.in',
      auto_approve_projects: 'true',
    };
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    res.json({ settings: map, raw: settings });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        await prisma.portalSettings.upsert({
          where: { key },
          update: { value: String(value), updatedBy: req.adminUser?.username || 'ADMIN' },
          create: { key, value: String(value), updatedBy: req.adminUser?.username || 'ADMIN' },
        });
      }
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Roles & Permissions
router.get('/roles', async (_req: Request, res: Response) => {
  try {
    let roles = await prisma.role.findMany({
      include: {
        permissions: true,
        assignments: { include: { admin: { select: { id: true, username: true, email: true, role: true } } } },
      },
    });

    if (roles.length === 0) {
      // Seed initial roles
      const superAdmin = await prisma.role.create({
        data: { name: 'SUPER_ADMIN', description: 'Full access to all system features and settings', isSystem: true },
      });
      const admin = await prisma.role.create({
        data: { name: 'ADMIN', description: 'Department operations, students, and events', isSystem: true },
      });
      const mod = await prisma.role.create({
        data: { name: 'MODERATOR', description: 'Review submissions and student portfolio items', isSystem: true },
      });
      roles = await prisma.role.findMany({
        include: { permissions: true, assignments: { include: { admin: true } } },
      });
    }

    const admins = await prisma.adminUser.findMany({
      select: { id: true, username: true, email: true, role: true, createdAt: true },
    });

    res.json({ roles, admins });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/roles', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const role = await prisma.role.create({
      data: { name, description, isSystem: false },
    });
    res.status(201).json(role);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: { description },
    });
    res.json(role);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/roles/:id/permissions', async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.rolePermission.findMany({
      where: { roleId: req.params.id },
    });
    res.json(permissions);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/roles/:id/permissions', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Permissions updated' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Change Requests (academic)
router.get('/change-requests', async (_req: Request, res: Response) => {
  try {
    const requests = await prisma.changeRequest.findMany({
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/change-requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const cr = await prisma.changeRequest.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', reviewedBy: req.adminUser?.username || 'ADMIN' },
    });
    res.json({ success: true, changeRequest: cr });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/change-requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const cr = await prisma.changeRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', reviewedBy: req.adminUser?.username || 'ADMIN', reviewNote: req.body.reason },
    });
    res.json({ success: true, changeRequest: cr });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Skill Requests
router.get('/skill-requests', async (_req: Request, res: Response) => {
  try {
    const requests = await prisma.skillRequest.findMany({
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/skill-requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const sr = await prisma.skillRequest.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', reviewedBy: req.adminUser?.username || 'ADMIN' },
    });
    // Create the skill if not exists
    await prisma.skill.upsert({
      where: { name: sr.skillName },
      update: {},
      create: { name: sr.skillName, category: sr.category || 'General', isActive: true },
    });
    res.json({ success: true, skillRequest: sr });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/skill-requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const sr = await prisma.skillRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', reviewedBy: req.adminUser?.username || 'ADMIN', reviewNote: req.body.reason },
    });
    res.json({ success: true, skillRequest: sr });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── Skills
router.get('/skills', async (_req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
    res.json(skills);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/skills', async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;
    const skill = await prisma.skill.create({
      data: { name, category: category || 'General', isActive: true },
    });
    res.status(201).json(skill);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/skills/:id', async (req: Request, res: Response) => {
  try {
    const { name, category, isActive } = req.body;
    const skill = await prisma.skill.update({
      where: { id: req.params.id },
      data: { name, category, isActive },
    });
    res.json(skill);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
