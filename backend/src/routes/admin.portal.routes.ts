import { Router, Request, Response } from 'express';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ActivityService } from '../services/activity.service';
import { deliverAnnouncementNotifications } from '../services/announcement.service';
import { notifyStudent, notifyVideoChangeRequested, notifyAllStudentsAboutEvent } from '../services/notification.service';
import { driveService } from '../services/drive.service';
import { invalidateStudentEventsCache } from './student.events.routes';
import { env } from '../config/env';
import { EXCLUDE_INTERNAL_EVENT, isInternalEvent } from '../config/constants';

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
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        profile: { include: { skills: { include: { skill: true } } } },
        projects: true,
        achievements: { include: { category: true } },
        certificates: true,
        introVideos: true,
        resumes: true,
        registrations: { include: { event: true, team: true } },
        githubAccount: true,
        githubRepos: {
          orderBy: [
            { isShowcased: 'desc' },
            { showcaseRank: 'asc' },
            { stars: 'desc' },
          ],
        },
        githubSkills: {
          include: { skill: true },
          orderBy: { repoCount: 'desc' },
        },
      },
    });
    if (!student) return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
    const submissions = await prisma.submission.findMany({
      where: { rollNo: student.rollNo },
      orderBy: { submittedAt: 'desc' },
    });


    const introVideos = (student.introVideos || []).map((v) => {
      const fileId = (v.driveFileId && v.driveFileId.trim()) ? v.driveFileId.trim() : v.id;
      return {
        ...v,
        streamUrl: fileId ? `/api/public/media/video/${fileId}?stream=true` : null,
        thumbnailUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/thumbnail/video/${v.id}?v=${encodeURIComponent(v.driveFileId.trim())}` : null,
        watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(v.driveFileId) : null,
        previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(v.driveFileId) : null,
      };
    });

    if (introVideos.length === 0 && submissions[0]?.videoDriveId) {
      const sub = submissions[0];
      const subDriveId = (sub.videoDriveId || '').trim();
      introVideos.push({
        id: sub.id,
        studentId: student.id,
        driveFileId: subDriveId,
        mimeType: 'video/mp4',
        sizeMb: null,
        filename: 'intro_video.mp4',
        status: (sub.status === 'REJECTED' ? 'REJECTED' : sub.status === 'REVIEWED' ? 'APPROVED' : 'PENDING') as any,
        reviewNote: sub.reviewText,
        reviewedBy: sub.reviewedBy,
        reviewedAt: sub.reviewedAt,
        isActive: true,
        submittedAt: sub.submittedAt,
        updatedAt: sub.updatedAt,
        isPublic: false,
        publishedAt: null,
        changeRequestedAt: null,
        changeRequestNote: null,
        streamUrl: `/api/public/media/video/${subDriveId}?stream=true`,
        thumbnailUrl: `/api/public/media/thumbnail/video/${sub.id}?v=${encodeURIComponent(subDriveId)}`,
        watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(subDriveId) : null,
        previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(subDriveId) : null,
      } as any);
    }
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

// ── Moderation
router.get('/moderation', async (req: Request, res: Response) => {
  try {
    const [videos, resumes, achievements, certificates] = await Promise.all([
      prisma.introVideo.findMany({
        where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        include: { student: true },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.resume.findMany({
        where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        include: { student: true },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.achievement.findMany({
        where: { status: 'PENDING' },
        include: { student: true, category: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.certificate.findMany({
        where: { status: 'PENDING' },
        include: { student: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const mappedVideos = videos.map((v) => {
      const fileId = (v.driveFileId && v.driveFileId.trim()) ? v.driveFileId.trim() : v.id;
      return {
        ...v,
        fileUrl: fileId ? `/api/public/media/video/${fileId}?stream=true` : null,
        thumbnailUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/thumbnail/video/${v.id}?v=${encodeURIComponent(v.driveFileId.trim())}` : null,
      };
    });
    res.json({ videos: mappedVideos, resumes, achievements, certificates });
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
      where: EXCLUDE_INTERNAL_EVENT,
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

const EVENT_TYPES = ['HACKATHON', 'WORKSHOP', 'COMPETITION', 'SEMINAR', 'OTHER'] as const;
const EVENT_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'] as const;

/**
 * Validates and normalises an event payload for create/update.
 *
 * The seven-step wizard collects a rich set of fields (dates, eligibility, team
 * size, reminders). Before this parser existed, every one of those fields was
 * silently discarded, so it needs real parsing rather than a blind spread: an
 * invalid date string would otherwise reach Prisma and surface as a 500.
 *
 * Returns either `{ ok: true, data }` or `{ ok: false, message }`. Callers
 * return 400 with the message rather than guessing at a default.
 */
function parseEventPayload(rawBody: any, { partial }: { partial: boolean }) {
  if (rawBody === undefined || rawBody === null || typeof rawBody !== 'object') {
    return { ok: false as const, message: 'A JSON request body is required.' };
  }

  const body = rawBody;
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
    if (body[field] !== undefined) data[field] = Boolean(body[field]);
  }

  for (const field of ['teamMin', 'teamMax'] as const) {
    if (body[field] === undefined) continue;
    const value = parseInt(String(body[field]), 10);
    if (!Number.isFinite(value) || value < 1 || value > 20) {
      return { ok: false as const, message: `${field === 'teamMin' ? 'Minimum' : 'Maximum'} team members must be between 1 and 20.` };
    }
    data[field] = value;
  }

  if (
    (body.teamMin !== undefined || body.teamMax !== undefined) &&
    (data.teamMin as number) > (data.teamMax as number)
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

    const id = `${parsed.data.slug}-${Date.now().toString().slice(-4)}`;

    const event = await prisma.event.create({
      data: { id, ...parsed.data } as any,
    });
    invalidateStudentEventsCache();

    // Send the event created by the admin to all the students
    await notifyAllStudentsAboutEvent({
      id: event.id,
      name: event.name,
      description: event.description,
      slug: event.slug,
      eligibilityYears: event.eligibilityYears,
    });
    res.status(201).json(event);
  } catch (err: any) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not create the event.' });
  }
});

router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

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
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

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
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }
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

    if (status === 'OPEN') {
      await notifyAllStudentsAboutEvent({
        id: event.id,
        name: event.name,
        description: event.description,
        slug: event.slug,
        eligibilityYears: event.eligibilityYears,
      });
    }

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
  const { id } = req.params;
  try {
    // Submission.eventId defaults to this row — deleting it would strand every
    // submission in the portal.
    if (isInternalEvent(id)) {
      return res.status(403).json({
        error: 'PROTECTED_EVENT',
        message: 'The internal submission event cannot be deleted.',
      });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!event) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    }

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

    if (totalDependents > 0 && !req.body?.force) {
      return res.status(409).json({
        error: 'CONFIRMATION_REQUIRED',
        message: `This event has ${totalDependents} dependent record(s). Resend with { "force": true } to delete them.`,
        dependents,
      });
    }

    // Child-first: answers hang off both registrations and form fields, team rows
    // hang off teams, and votes hang off candidates.
    const deleted = await prisma.$transaction(async (tx) => {
      if (registrations > 0 || formFields > 0) {
        await tx.registrationAnswer.deleteMany({
          where: { OR: [{ registration: { eventId: id } }, { field: { eventId: id } }] },
        });
      }
      if (teams > 0) {
        await tx.teamMember.deleteMany({ where: { team: { eventId: id } } });
        await tx.teamInvitation.deleteMany({ where: { team: { eventId: id } } });
      }
      if (votes > 0) {
        await tx.vote.deleteMany({ where: { campaign: { eventId: id } } });
        await tx.votingCandidate.deleteMany({ where: { campaign: { eventId: id } } });
        await tx.votingCampaign.deleteMany({ where: { eventId: id } });
      }
      if (registrations > 0) {
        await tx.eventRegistration.deleteMany({ where: { eventId: id } });
      }
      if (formFields > 0) {
        await tx.registrationFormField.deleteMany({ where: { eventId: id } });
      }
      if (teams > 0) {
        await tx.team.deleteMany({ where: { eventId: id } });
      }
      if (submissions > 0) {
        await tx.submission.deleteMany({ where: { eventId: id } });
      }
      if (emailLogs > 0) {
        await tx.emailLog.deleteMany({ where: { eventId: id } });
      }
      return tx.event.delete({ where: { id } });
    }, { timeout: 20000, maxWait: 10000 });
    invalidateStudentEventsCache();

    await ActivityService.log({
      category: 'ADMIN',
      action: 'EVENT_DELETE',
      details: `Deleted event "${event.name}" (${id}) plus ${totalDependents} dependent records: ${JSON.stringify(dependents)}`,
      userEmail: req.adminUser?.email,
    });

    res.json({ success: true, deleted, dependents });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/events/:id/registrations', async (req: Request, res: Response) => {
  try {
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

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
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

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
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

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
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

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
      prisma.event.count({ where: EXCLUDE_INTERNAL_EVENT }),
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

// ── GitHub Integration Management (Admin)

router.get('/github/overview', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '25', search } = req.query;
    const p = Math.max(1, parseInt(String(page), 10));
    const l = Math.max(1, Math.min(100, parseInt(String(limit), 10)));
    const skip = (p - 1) * l;

    const studentWhere: any = {};
    if (search) {
      studentWhere.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { rollNo: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const where: any = search ? { student: studentWhere } : {};

    const [totalConnected, total, accounts] = await Promise.all([
      prisma.githubAccount.count(),
      prisma.githubAccount.count({ where }),
      prisma.githubAccount.findMany({
        where,
        skip,
        take: l,
        orderBy: { connectedAt: 'desc' },
        include: {
          student: {
            select: { id: true, name: true, rollNo: true, year: true, section: true },
          },
        },
      }),
    ]);

    const studentIds = accounts.map((a) => a.studentId);
    const [repoCounts, showcasedCounts] = await Promise.all([
      prisma.githubRepo.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: studentIds },
          removedFromGithub: false,
        },
        _count: { id: true },
      }),
      prisma.githubRepo.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: studentIds },
          isShowcased: true,
          removedFromGithub: false,
        },
        _count: { id: true },
      }),
    ]);

    const repoCountMap = new Map(repoCounts.map((rc) => [rc.studentId, rc._count.id]));
    const showcasedMap = new Map(showcasedCounts.map((sc) => [sc.studentId, sc._count.id]));

    res.json({
      totalConnected,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      accounts: accounts.map((acc) => ({
        id: acc.id,
        studentId: acc.studentId,
        student: acc.student,
        githubUserId: String(acc.githubUserId),
        login: acc.login,
        avatarUrl: acc.avatarUrl,
        connectedAt: acc.connectedAt,
        lastSyncedAt: acc.lastSyncedAt,
        syncStatus: acc.syncStatus,
        syncError: acc.syncError,
        reposCount: repoCountMap.get(acc.studentId) || 0,
        showcasedCount: showcasedMap.get(acc.studentId) || 0,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/github/logs', async (req: Request, res: Response) => {
  try {
    const { status, filter } = req.query;
    const where: any = {};

    if (status) {
      const statuses = String(status).split(',').map((s) => s.trim()) as any[];
      where.status = { in: statuses };
    } else if (filter === 'errors' || filter === 'failed') {
      where.status = { in: ['FAILED', 'SKIPPED_RATE_LIMIT'] };
    }

    const logs = await prisma.githubSyncLog.findMany({
      where,
      take: 20,
      orderBy: { startedAt: 'desc' },
      include: {
        student: {
          select: { id: true, name: true, rollNo: true },
        },
      },
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/github/resync/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;
    const account = await prisma.githubAccount.findUnique({
      where: { studentId },
    });
    if (!account) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Student does not have a connected GitHub account.' });
    }

    const { githubSyncService } = await import('../services/github.sync.service');
    const { GithubSyncTrigger } = await import('@prisma/client');
    const result = await githubSyncService.queueSync(studentId, GithubSyncTrigger.MANUAL);
    res.json({ success: true, ...result });
  } catch (err: any) {
    if (err.name === 'GithubSyncCooldownError') {
      return res.status(429).json({ error: 'SYNC_COOLDOWN', message: err.message, secondsRemaining: err.secondsRemaining });
    }
    if (err.name === 'GithubSyncDailyCapError') {
      return res.status(429).json({ error: 'SYNC_DAILY_CAP', message: err.message });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/github/projects', async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const p = Math.max(1, parseInt(String(page), 10));
    const l = Math.max(1, Math.min(100, parseInt(String(limit), 10)));
    const skip = (p - 1) * l;

    const where: any = {
      removedFromGithub: false,
      isShowcased: true,
    };
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { student: { name: { contains: String(search), mode: 'insensitive' } } },
        { student: { rollNo: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const [total, repos] = await Promise.all([
      prisma.githubRepo.count({ where }),
      prisma.githubRepo.findMany({
        where,
        skip,
        take: l,
        orderBy: [{ stars: 'desc' }, { pushedAt: 'desc' }],
        include: {
          student: {
            select: { id: true, name: true, rollNo: true, year: true, section: true },
          },
        },
      }),
    ]);

    res.json({
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      items: repos.map((r) => ({
        ...r,
        githubRepoId: String(r.githubRepoId),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
