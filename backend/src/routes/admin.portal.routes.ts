import { Router, Request, Response } from 'express';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ActivityService } from '../services/activity.service';
import { deliverAnnouncementNotifications } from '../services/announcement.service';
import { notifyStudent, notifyVideoChangeRequested } from '../services/notification.service';
import { driveService } from '../services/drive.service';
import { env } from '../config/env';
import { EXCLUDE_INTERNAL_EVENT } from '../config/constants';

import portalEventsRoutes from './admin.portal.events.routes';
import portalVotingRoutes from './admin.portal.voting.routes';
import portalSettingsRoutes from './admin.portal.settings.routes';
import portalGithubRoutes from './admin.portal.github.routes';
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.put('/students/:id/feature', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Student feature status toggled' });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/moderation/:type/:id/reject', async (req: Request, res: Response) => {
  try {
    await handleModerationDecision(req.params.type, req.params.id, 'REJECTED', req.body.reason);
    res.json({ success: true, message: 'Item rejected' });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/moderation/:type/:id/request-changes', async (req: Request, res: Response) => {
  try {
    await handleModerationDecision(req.params.type, req.params.id, 'CHANGES_REQUESTED', req.body.reason);
    res.json({ success: true, message: 'Changes requested' });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/moderation/:type/:id/hide', async (req: Request, res: Response) => {
  try {
    await handleModerationDecision(req.params.type, req.params.id, 'HIDDEN', req.body.reason);
    res.json({ success: true, message: 'Item hidden' });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.use(portalEventsRoutes);

router.use(portalVotingRoutes);

// ── Communications / Announcements
router.get('/announcements', async (_req: Request, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(announcements);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.use(portalSettingsRoutes);
router.use(portalGithubRoutes);

export default router;
