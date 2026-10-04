import { Router, Request, Response } from 'express';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ActivityService } from '../services/activity.service';
import {
  countAnnouncementAudience,
  deliverAnnouncementNotifications,
  resolveAnnouncementTarget,
} from '../services/announcement.service';
import { getDefaultMaxVideoSizeMb, getMaxVideoHardCapMb, VIDEO_SIZE_SETTING_KEY } from '../services/limits.service';
import { notifyStudent, notifyVideoChangeRequested } from '../services/notification.service';
import { driveService } from '../services/drive.service';
import { invalidateStudentEventsCache } from './student.events.routes';
import { env } from '../config/env';

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
      select: {
        id: true,
        rollNo: true,
        status: true,
        submittedAt: true,
        videoDriveId: true,
        reviewText: true,
        reviewPros: true,
        reviewCons: true,
        reviewedAt: true,
      },
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
        projects: { orderBy: { displayOrder: 'asc' }, take: 100 },
        // `thumbnail` is deliberately not selected on any of the collections
        // below. Each row would otherwise drag a WebP blob into memory only for
        // the map below to throw it away; the previews are served by
        // /api/public/media/thumbnail/:type/:id.
        achievements: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true, studentId: true, categoryId: true, title: true, description: true,
            organization: true, achievedAt: true, proofDriveId: true, proofUrl: true,
            status: true, reviewNote: true, reviewedBy: true, reviewedAt: true,
            isPublic: true, createdAt: true, updatedAt: true, category: true,
          },
        },
        certificates: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true, studentId: true, title: true, issuer: true, issuedAt: true,
            fileDriveId: true, status: true, reviewNote: true, reviewedBy: true,
            reviewedAt: true, isPublic: true, createdAt: true, updatedAt: true,
          },
        },
        introVideos: {
          orderBy: { submittedAt: 'desc' },
          take: 100,
          select: {
            id: true, studentId: true, driveFileId: true, mimeType: true, sizeMb: true,
            filename: true, status: true, reviewNote: true, reviewedBy: true,
            reviewedAt: true, isActive: true, submittedAt: true, updatedAt: true,
            isPublic: true, publishedAt: true, changeRequestedAt: true, changeRequestNote: true,
          },
        },
        resumes: {
          orderBy: { submittedAt: 'desc' },
          take: 100,
          select: {
            id: true, studentId: true, driveFileId: true, filename: true, sizeMb: true,
            status: true, reviewNote: true, reviewedBy: true, reviewedAt: true,
            isActive: true, isPublic: true, submittedAt: true, updatedAt: true,
          },
        },
        registrations: { include: { event: true, team: true }, take: 100 },
      },
    });
    if (!student) return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
    const submissions = await prisma.submission.findMany({
      where: { rollNo: student.rollNo },
      orderBy: { submittedAt: 'desc' },
    });

    const introVideos = (student.introVideos || []).map((v) => {
      return {
        ...v,
        streamUrl: `/api/public/videos/stream/${v.id}`,
        thumbnailUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/thumbnail/video/${v.id}?v=${encodeURIComponent(v.driveFileId.trim())}` : null,
        watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(v.driveFileId) : null,
        previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(v.driveFileId) : null,
      };
    });
    const resumes = (student.resumes || []).map((r) => {
      return {
        ...r,
        fileUrl: r.driveFileId ? `/api/public/media/resume/${r.id}` : null,
        thumbnailUrl: r.driveFileId ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}` : null,
        previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(r.driveFileId) : null,
        watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(r.driveFileId) : null,
      };
    });
    const achievements = (student.achievements || []).map((a) => {
      return {
        ...a,
        proofUrl: a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.id}` : null),
        thumbnailUrl: a.proofDriveId ? `/api/public/media/thumbnail/achievement/${a.id}?v=${encodeURIComponent(a.proofDriveId)}` : null,
        watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(a.proofDriveId) : null,
        previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(a.proofDriveId) : null,
      };
    });
    const certificates = (student.certificates || []).map((c) => {
      return {
        ...c,
        fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null,
        thumbnailUrl: c.fileDriveId ? `/api/public/media/thumbnail/certificate/${c.id}?v=${encodeURIComponent(c.fileDriveId)}` : null,
        previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(c.fileDriveId) : null,
        watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(c.fileDriveId) : null,
      };
    });

    const photoUrl = (student.profile?.photoDriveId || student.profile?.photoUrl)
      ? `/api/public/media/photo/${student.profile?.id || student.id}`
      : student.profile?.photoUrl || null;

    res.json({
      ...student,
      profile: student.profile
        ? {
            ...student.profile,
            photoUrl: photoUrl || undefined,
          }
        : null,
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
        actionUrl: '/resume',
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
        actionUrl: '/portfolio/achievements',
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
        actionUrl: '/portfolio/certificates',
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
        actionUrl: '/portfolio/projects',
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
      let item = await prisma.introVideo.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        const fallback = await prisma.introVideo.findFirst({
          where: {
            OR: [
              { id: itemId, studentId: student.id },
              { id: itemId, student: { rollNo: student.rollNo } },
              { studentId: student.id },
              { student: { rollNo: student.rollNo } },
            ],
          },
          orderBy: { submittedAt: 'desc' },
        });
        if (fallback) {
          item = fallback;
        }
      }

      const submissions = await prisma.submission.findMany({
        where: {
          OR: [
            { rollNo: student.rollNo },
            { id: student.id },
            { rollNo: student.id },
            { id: itemId },
          ],
        },
      });

      if (!item && !submissions.some((s) => Boolean(s.videoDriveId))) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Video not found.' });
      }

      // a) If item.driveFileId, delete it from Google Drive / mock storage via driveService.deleteFileById
      if (item?.driveFileId) {
        const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
        const studentRelativePath = `Students/${cleanRollNo}`;
        await driveService.deleteFileById(item.driveFileId, studentRelativePath).catch(() => {});
      }

      // b) Reset all IntroVideo rows for this student: wipe Drive ID, thumbnail, and set status to CHANGES_REQUESTED
      await prisma.introVideo.updateMany({
        where: {
          OR: [
            { studentId: student.id },
            { student: { rollNo: student.rollNo } },
          ],
        },
        data: {
          driveFileId: null,
          thumbnail: null,
          filename: null,
          mimeType: null,
          sizeMb: null,
          status: 'CHANGES_REQUESTED',
          reviewNote: reasonText || 'Video removed by administrator.',
          isPublic: false,
          publishedAt: null,
          changeRequestedAt: new Date(),
          changeRequestNote: reasonText || 'Your previous video was removed. Please upload a new one.',
        },
      });

      // c) Also find any Submission row matching the student's rollNo or id. If submission.videoDriveId exists, delete that Drive file too, and update submission.videoDriveId = null.
      for (const sub of submissions) {
        if (sub.videoDriveId) {
          if (!item || sub.videoDriveId !== item.driveFileId) {
            await driveService.deleteFileById(sub.videoDriveId, sub.driveFolderPath).catch(() => {});
          }
          await prisma.submission.update({
            where: { id: sub.id },
            data: { videoDriveId: null },
          });
        }
      }

      // e) Add audit logging and student notification
      await notifyStudent({
        studentId: student.id,
        title: 'Introduction Video Deleted',
        message: reasonText
          ? `Your introduction video was removed by administrator. Reason: "${reasonText}".`
          : 'Your introduction video was removed by administrator.',
        actionUrl: '/intro-video',
      });

      await ActivityService.log({
        category: 'ADMIN',
        action: 'DELETE_VIDEO',
        details: `Admin deleted video (${itemId}) for student ${student.rollNo}${reasonText ? ` (Reason: ${reasonText})` : ''}`,
        applicantName: student.name,
        userEmail: (req as any).user?.email || 'admin',
      });
    } else if (normalizedType === 'resume' || normalizedType === 'resumes') {
      const item = await prisma.resume.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Resume not found.' });
      }
      const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const studentRelativePath = `Students/${cleanRollNo}`;
      if (item.driveFileId) {
        await driveService.deleteFileById(item.driveFileId, studentRelativePath).catch(() => {});
      }
      await prisma.resume.delete({ where: { id: itemId } });
      await notifyStudent({
        studentId: student.id,
        title: 'Resume Deleted',
        message: reasonText
          ? `Your resume was removed by administrator. Reason: "${reasonText}".`
          : 'Your resume was removed by administrator.',
        actionUrl: '/resume',
      });
    } else if (normalizedType === 'achievement' || normalizedType === 'achievements') {
      const item = await prisma.achievement.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Achievement not found.' });
      }
      const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const studentRelativePath = `Students/${cleanRollNo}`;
      if (item.proofDriveId) {
        await driveService.deleteFileById(item.proofDriveId, studentRelativePath).catch(() => {});
      }
      await prisma.achievement.delete({ where: { id: itemId } });
      await notifyStudent({
        studentId: student.id,
        title: 'Achievement Deleted',
        message: reasonText
          ? `Your achievement "${item.title}" was removed by administrator. Reason: "${reasonText}".`
          : `Your achievement "${item.title}" was removed by administrator.`,
        actionUrl: '/portfolio/achievements',
      });
    } else if (normalizedType === 'certificate' || normalizedType === 'certificates') {
      const item = await prisma.certificate.findUnique({ where: { id: itemId } });
      if (!item || item.studentId !== student.id) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
      }
      const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const studentRelativePath = `Students/${cleanRollNo}`;
      if (item.fileDriveId) {
        await driveService.deleteFileById(item.fileDriveId, studentRelativePath).catch(() => {});
      }
      await prisma.certificate.delete({ where: { id: itemId } });
      await notifyStudent({
        studentId: student.id,
        title: 'Certificate Deleted',
        message: reasonText
          ? `Your certificate "${item.title}" was removed by administrator. Reason: "${reasonText}".`
          : `Your certificate "${item.title}" was removed by administrator.`,
        actionUrl: '/portfolio/certificates',
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
        actionUrl: '/portfolio/projects',
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
      take: 200,
      select: {
        id: true, studentId: true, driveFileId: true, mimeType: true, sizeMb: true,
        filename: true, status: true, reviewNote: true, reviewedBy: true,
        reviewedAt: true, isActive: true, submittedAt: true, updatedAt: true,
        isPublic: true, publishedAt: true, changeRequestedAt: true, changeRequestNote: true,
        student: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
    const mappedVideos = videos.map((v) => {
      return {
        ...v,
        thumbnailUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/thumbnail/video/${v.id}?v=${encodeURIComponent(v.driveFileId.trim())}` : null,
      };
    });
    res.json({ videos: mappedVideos, resumes: [], achievements: [], certificates: [] });
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
      return prisma.resume.update({ where: { id }, data: { status, reviewNote: reason, isPublic: status === 'APPROVED' } });
    case 'achievements':
      return prisma.achievement.update({ where: { id }, data: { status, reviewNote: reason, isPublic: status === 'APPROVED' } });
    case 'certificates':
      return prisma.certificate.update({ where: { id }, data: { status, reviewNote: reason, isPublic: status === 'APPROVED' } });
    case 'projects':
      return prisma.project.update({ where: { id }, data: { status, reviewNote: reason, isPublic: status === 'APPROVED' } });
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

/** Event types the admin wizard offers. Anything else is rejected. */
const EVENT_TYPES = ['HACKATHON', 'WORKSHOP', 'COMPETITION', 'SEMINAR', 'OTHER'] as const;
const EVENT_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'] as const;

/**
 * Normalises and validates the scheduling/eligibility block of an event body.
 *
 * Every field here was previously collected by the admin wizard and then
 * discarded, so it needs real parsing rather than a blind spread: an invalid
 * date string would otherwise reach Prisma and surface as a 500.
 *
 * Returns either `{ ok: true, data }` or `{ ok: false, message }`. Callers
 * return 400 with the message rather than guessing at a default.
 */
function parseEventPayload(rawBody: any, { partial }: { partial: boolean }) {
  // A request with no JSON body leaves `req.body` undefined, which used to throw
  // a TypeError here and surface as a 500 instead of a 400.
  if (rawBody === undefined || rawBody === null || typeof rawBody !== 'object') {
    return { ok: false as const, message: 'A JSON request body is required.' };
  }
  const body = rawBody as Record<string, any>;
  const data: Record<string, unknown> = {};

  const rawName = body.name ?? body.title;
  if (rawName !== undefined || !partial) {
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) return { ok: false as const, message: 'Event title is required.' };
    if (name.length > 200) return { ok: false as const, message: 'Event title must be 200 characters or fewer.' };
    data.name = name;
    data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  if (body.description !== undefined) {
    data.description = typeof body.description === 'string' ? body.description.trim() || null : null;
  }

  if (body.type !== undefined) {
    const type = String(body.type).toUpperCase();
    if (type !== 'GENERAL' && !(EVENT_TYPES as readonly string[]).includes(type)) {
      return { ok: false as const, message: `Unknown event type: ${body.type}` };
    }
    data.type = type;
  }

  if (body.year !== undefined) {
    const year = parseInt(String(body.year), 10);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return { ok: false as const, message: 'Year must be between 2000 and 2100.' };
    }
    data.year = year;
  }

  if (body.status !== undefined) {
    const status = String(body.status).toUpperCase();
    if (!(EVENT_STATUSES as readonly string[]).includes(status)) {
      return { ok: false as const, message: `Unknown event status: ${body.status}` };
    }
    data.status = status;
  }

  // Dates arrive from <input type="datetime-local"> as `YYYY-MM-DDTHH:mm`,
  // which is local time with no zone. `new Date(str)` parses that as local,
  // but a bare date-only string is parsed as UTC midnight, which shifts the
  // day backwards for anyone west of Greenwich. Pin date-only values to noon
  // so the stored date always matches the day the admin typed.
  for (const field of ['registrationStart', 'registrationEnd', 'eventDate'] as const) {
    if (body[field] === undefined) continue;
    const raw = body[field];
    if (raw === null || raw === '') {
      data[field] = null;
      continue;
    }
    // Must be a string. `new Date` also accepts numbers and booleans, coercing
    // them to epoch-ish dates (`true` -> 1970-01-01), which stored a plausible
    // but meaningless timestamp instead of rejecting the request.
    if (typeof raw !== 'string') {
      return { ok: false as const, message: `Invalid ${field} date.` };
    }
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
    if (Number.isNaN(date.getTime())) {
      return { ok: false as const, message: `Invalid ${field} date.` };
    }
    data[field] = date;
  }

  const start = data.registrationStart as Date | null | undefined;
  const end = data.registrationEnd as Date | null | undefined;
  // Only compare when the request supplied both, so a partial edit that sets
  // just one bound is not rejected against an unknown other bound.
  if (body.registrationStart !== undefined && body.registrationEnd !== undefined && start && end && start > end) {
    return { ok: false as const, message: 'Registration end must be after registration start.' };
  }

  if (body.eligibilityYears !== undefined) {
    if (!Array.isArray(body.eligibilityYears)) {
      return { ok: false as const, message: 'Eligibility years must be a list.' };
    }
    const years: number[] = (body.eligibilityYears as unknown[]).map((y) => parseInt(String(y), 10));
    if (years.some((y: number) => !Number.isFinite(y) || y < 1 || y > 4)) {
      return { ok: false as const, message: 'Eligibility years must be between 1 and 4.' };
    }
    data.eligibilityYears = [...new Set(years)].sort((a: number, b: number) => a - b);
  }

  for (const field of ['minCompletion'] as const) {
    if (body[field] === undefined) continue;
    const value = parseInt(String(body[field]), 10);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return { ok: false as const, message: 'Minimum profile completion must be between 0 and 100.' };
    }
    data[field] = value;
  }

  for (const field of ['notifyOnOpen', 'notifyReminder', 'teamEnabled'] as const) {
    if (body[field] === undefined) continue;
    // `Boolean("false")` is true, so a form-encoded or stringly-typed `"false"`
    // would switch the flag on rather than off.
    if (typeof body[field] !== 'boolean') {
      return { ok: false as const, message: `${field} must be a boolean.` };
    }
    data[field] = body[field];
  }

  for (const field of ['teamMin', 'teamMax'] as const) {
    if (body[field] === undefined) continue;
    const value = parseInt(String(body[field]), 10);
    if (!Number.isFinite(value) || value < 1 || value > 20) {
      return { ok: false as const, message: `${field === 'teamMin' ? 'Minimum' : 'Maximum'} team members must be between 1 and 20.` };
    }
    data[field] = value;
  }

  // Only comparable when both bounds are in this payload. A partial update that
  // sends just one bound would otherwise compare a real number against
  // `undefined`, which is always false, and write a min above the stored max.
  // `PUT /events/:id` re-checks this against the merged row.
  if (
    data.teamMin !== undefined &&
    data.teamMax !== undefined &&
    typeof data.teamMin === 'number' &&
    typeof data.teamMax === 'number' &&
    data.teamMin > data.teamMax
  ) {
    return { ok: false as const, message: 'Maximum team members cannot be lower than the minimum.' };
  }

  return { ok: true as const, data };
}

router.post('/events', async (req: Request, res: Response) => {
  try {
    const parsed = parseEventPayload(req.body, { partial: false });
    if (!parsed.ok) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.message });
    }

    // Matches the existing convention: a readable slug plus the last four
    // digits of the epoch, so ids stay sortable and collision-resistant enough
    // for admin-created events.
    const id = `${parsed.data.slug}-${Date.now().toString().slice(-4)}`;

    const event = await prisma.event.create({
      data: { id, ...parsed.data } as any,
    });
    invalidateStudentEventsCache();
    res.status(201).json(event);
  } catch (err: any) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not create the event.' });
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
    const parsed = parseEventPayload(req.body, { partial: true });
    if (!parsed.ok) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.message });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'No fields to update.' });
    }

    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });

    // Validate against the merged row, not just the payload. A request that
    // sends only `teamMin` cannot be checked inside the parser (the other bound
    // is not there yet), so `teamMin: 10` on an event whose max is 4 would pass
    // both here and in Prisma.
    const mergedMin = parsed.data.teamMin ?? existing.teamMin;
    const mergedMax = parsed.data.teamMax ?? existing.teamMax;
    if (mergedMin > mergedMax) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Maximum team members cannot be lower than the minimum.',
      });
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: parsed.data as any,
    });
    invalidateStudentEventsCache();
    res.json(event);
  } catch (err: any) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the event.' });
  }
});

/**
 * Sets an event's status.
 *
 * Existence is checked before the update because Prisma raises P2025 for an
 * unknown id, which used to surface as a 500 carrying the raw driver message to
 * the client. Distinguishing "no such event" from a real failure also stops the
 * error handler from leaking internals in production.
 */
async function setEventStatus(req: Request, res: Response, status: 'OPEN' | 'CLOSED' | 'ARCHIVED') {
  try {
    const existing = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found.' });
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status },
    });
    invalidateStudentEventsCache();
    res.json(event);
  } catch (err: any) {
    console.error(`Error setting event ${req.params.id} to ${status}:`, err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the event.' });
  }
}

router.post('/events/:id/publish', (req: Request, res: Response) => setEventStatus(req, res, 'OPEN'));

router.post('/events/:id/close', (req: Request, res: Response) => setEventStatus(req, res, 'CLOSED'));

router.post('/events/:id/archive', (req: Request, res: Response) => setEventStatus(req, res, 'ARCHIVED'));

router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Guard the internal self-introduction event (Submission.eventId defaults to this).
    if (id === env.ACTIVE_EVENT_ID) {
      return res.status(400).json({
        error: 'PROTECTED_EVENT',
        message: 'The active self-introduction event cannot be deleted.',
      });
    }

    const existing = await prisma.event.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    }

    // Tally dependents for the audit log.
    const [registrations, submissions, formFields, teams, votes, emailLogs] = await Promise.all([
      prisma.eventRegistration.count({ where: { eventId: id } }),
      prisma.submission.count({ where: { eventId: id } }),
      prisma.registrationFormField.count({ where: { eventId: id } }),
      prisma.team.count({ where: { eventId: id } }),
      prisma.vote.count({ where: { campaign: { eventId: id } } }),
      prisma.emailLog.count({ where: { eventId: id } }),
    ]);

    const dependents = { registrations, submissions, formFields, teams, votes, emailLogs };
    const totalDependents = Object.values(dependents).reduce((sum, n) => sum + n, 0);

    // Child-first cascade so ON DELETE RESTRICT never fires.
    await prisma.$transaction(async (tx) => {
      // Answers hang off both registrations and form fields.
      await tx.registrationAnswer.deleteMany({
        where: {
          OR: [
            { registration: { eventId: id } },
            { field: { eventId: id } },
          ],
        },
      });

      // Team members & invitations before teams.
      await tx.teamMember.deleteMany({ where: { team: { eventId: id } } });
      await tx.teamInvitation.deleteMany({ where: { team: { eventId: id } } });

      // Votes → candidates → campaigns.
      await tx.vote.deleteMany({ where: { campaign: { eventId: id } } });
      await tx.votingCandidate.deleteMany({ where: { campaign: { eventId: id } } });
      await tx.votingCampaign.deleteMany({ where: { eventId: id } });

      // Direct children of Event.
      await tx.eventRegistration.deleteMany({ where: { eventId: id } });
      await tx.registrationFormField.deleteMany({ where: { eventId: id } });
      await tx.team.deleteMany({ where: { eventId: id } });
      await tx.submission.deleteMany({ where: { eventId: id } });
      await tx.emailLog.deleteMany({ where: { eventId: id } });

      // Finally the event itself.
      await tx.event.delete({ where: { id } });
    });

    invalidateStudentEventsCache();

    await ActivityService.log({
      category: 'ADMIN',
      action: 'EVENT_DELETE',
      details: `Deleted event "${existing.name}" (${id}) plus ${totalDependents} dependent records: ${JSON.stringify(dependents)}`,
      userEmail: (req as any).user?.email || req.adminUser?.email || 'admin',
    });

    res.json({ success: true, message: `Event "${existing.name}" deleted successfully.` });
  } catch (err: any) {
    console.error(`Error deleting event ${req.params.id}:`, err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not delete the event.' });
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
router.get('/announcements/preview', async (req: Request, res: Response) => {
  try {
    const target = resolveAnnouncementTarget({
      audience: req.query.audience,
      targetYear: req.query.targetYear,
      targetSection: req.query.targetSection,
    });
    res.json({ count: await countAnnouncementAudience(target) });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

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
    const { title, message, body, content, priority, targetYear, targetSection, targetAll, audience, scheduledAt } = req.body;
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isFutureScheduled = scheduledDate !== null && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();

    // `audience` is what the admin UI sends (ALL / YEAR_1..YEAR_4); targetYear and
    // friends are kept for older callers. Both resolve to the same target here.
    const resolved = resolveAnnouncementTarget({ audience, targetYear, targetSection, targetAll });

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message: message || body || content || '',
        priority: priority || 'normal',
        targetYear: resolved.targetYear,
        targetSection: resolved.targetSection,
        targetAll: resolved.targetAll,
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

    // Claim the transition atomically, mirroring
    // admin.api.routes.ts (the surface the admin client actually calls). Kept in
    // step so this duplicate route cannot become a double-delivery trap if it is
    // ever wired up. Only the caller that wins the claim fans out notifications.
    const claimed = await prisma.announcement.updateMany({
      where: { id: req.params.id, status: { not: 'PUBLISHED' } },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    const announcement =
      claimed.count > 0
        ? await prisma.announcement.findUnique({ where: { id: req.params.id } })
        : existing;

    if (claimed.count > 0 && announcement) {
      await deliverAnnouncementNotifications({
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        targetAll: announcement.targetAll,
        targetYear: announcement.targetYear,
        targetSection: announcement.targetSection,
      });
    }

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
      // Must match what is actually enforced when no override is stored, or the
      // admin sees a limit the portal does not apply.
      max_video_size_mb: String(getDefaultMaxVideoSizeMb()),
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

    // The video ceiling is enforced on every upload, so reject a value that could
    // never be applied rather than storing it and silently ignoring it later.
    if (entries.some(([key]) => key === VIDEO_SIZE_SETTING_KEY)) {
      const raw = entries.find(([key]) => key === VIDEO_SIZE_SETTING_KEY)![1];
      const parsed = parseInt(String(raw), 10);
      const cap = getMaxVideoHardCapMb();
      if (!Number.isFinite(parsed) || parsed < 1) {
        return res
          .status(400)
          .json({ error: 'VALIDATION_ERROR', field: VIDEO_SIZE_SETTING_KEY, message: 'Video size must be a number of megabytes, at least 1.' });
      }
      if (parsed > cap) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          field: VIDEO_SIZE_SETTING_KEY,
          message: `Video size cannot exceed the ${cap} MB hard ceiling.`,
        });
      }
    }

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
