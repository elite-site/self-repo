import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { httpError } from '../middleware/apiError';
import { requireAdminAuth } from '../middleware/auth';
import { ActivityService } from '../services/activity.service';
import { notifyStudent, notifyVideoChangeRequested } from '../services/notification.service';

const router = Router();
router.use(requireAdminAuth);

router.get('/moderation', async (req: Request, res: Response) => {
  try {
    const rawType = String(req.query.type || 'all').toLowerCase();
    const rawStatus = String(req.query.status || 'ALL').toUpperCase();

    const statusFilter =
      rawStatus === 'PENDING_REVIEW'
        ? { in: ['PENDING', 'UNDER_REVIEW'] }
        : rawStatus === 'ALL'
        ? undefined
        : rawStatus;

    const whereClause = statusFilter ? { status: statusFilter } : {};

    const studentSelect = {
      name: true,
      rollNo: true,
      year: true,
      section: true,
      branch: true,
    };

    const [videos, resumes, achievements, certificates, projects] = await Promise.all([
      rawType === 'all' || rawType === 'videos'
        ? prisma.introVideo.findMany({
            where: whereClause as any,
            select: {
              id: true,
              studentId: true,
              driveFileId: true,
              status: true,
              submittedAt: true,
              isPublic: true,
              reviewNote: true,
              student: { select: studentSelect },
            },
            take: 200,
            orderBy: { submittedAt: 'desc' },
          })
        : Promise.resolve([]),
      rawType === 'all' || rawType === 'resumes'
        ? prisma.resume.findMany({
            where: whereClause as any,
            select: {
              id: true,
              studentId: true,
              driveFileId: true,
              filename: true,
              status: true,
              submittedAt: true,
              isPublic: true,
              reviewNote: true,
              student: { select: studentSelect },
            },
            take: 200,
            orderBy: { submittedAt: 'desc' },
          })
        : Promise.resolve([]),
      rawType === 'all' || rawType === 'achievements'
        ? prisma.achievement.findMany({
            where: whereClause as any,
            include: {
              student: { select: studentSelect },
              category: true,
            },
            take: 200,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      rawType === 'all' || rawType === 'certificates'
        ? prisma.certificate.findMany({
            where: whereClause as any,
            select: {
              id: true,
              studentId: true,
              title: true,
              issuer: true,
              fileDriveId: true,
              status: true,
              createdAt: true,
              isPublic: true,
              reviewNote: true,
              student: { select: studentSelect },
            },
            take: 200,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      rawType === 'all' || rawType === 'projects'
        ? prisma.project.findMany({
            where: whereClause as any,
            include: {
              student: { select: studentSelect },
            },
            take: 200,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const mappedVideos = videos.map((v) => ({
      id: v.id,
      type: 'videos' as const,
      itemType: 'video' as const,
      studentId: v.studentId,
      studentName: v.student?.name || 'Unknown',
      studentRoll: v.student?.rollNo || 'Unknown',
      studentYear: v.student?.year,
      studentSection: v.student?.section,
      studentBranch: v.student?.branch,
      title: `${v.student?.name || 'Student'} (${v.student?.rollNo || 'Unknown'})`,
      description: null,
      fileUrl: (v.driveFileId && v.driveFileId.trim())
        ? `/api/public/media/video/${v.driveFileId.trim()}?stream=true`
        : (v.id ? `/api/public/media/video/${v.id}?stream=true` : null),
      thumbnailUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/thumbnail/video/${v.id}?v=${encodeURIComponent(v.driveFileId.trim())}` : null,
      driveFileId: v.driveFileId ? v.driveFileId.trim() : null,
      status: v.status,
      submittedAt: v.submittedAt?.toISOString() || (v as any).createdAt?.toISOString() || new Date().toISOString(),
      isPublic: Boolean(v.isPublic),
      publicUrl: v.isPublic && v.status === 'APPROVED' ? `/api/public/videos/stream/${v.id}` : null,
      reviewNote: v.reviewNote,
    }));

    const mappedResumes = resumes.map((r) => ({
      id: r.id,
      type: 'resumes' as const,
      itemType: 'resume' as const,
      studentId: r.studentId,
      studentName: r.student?.name || 'Unknown',
      studentRoll: r.student?.rollNo || 'Unknown',
      studentYear: r.student?.year,
      studentSection: r.student?.section,
      studentBranch: r.student?.branch,
      title: `${r.student?.name || 'Student'} — Resume`,
      description: null,
      fileUrl: r.driveFileId ? `/api/public/media/resume/${r.id}` : null,
      thumbnailUrl: r.driveFileId ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}` : null,
      driveFileId: r.driveFileId,
      status: r.status,
      submittedAt: r.submittedAt?.toISOString() || (r as any).createdAt?.toISOString() || new Date().toISOString(),
      isPublic: Boolean(r.isPublic),
      reviewNote: r.reviewNote,
    }));

    const mappedAchievements = achievements.map((a) => {
      const proofUrl = a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.id}` : null);
      const thumbnailUrl = a.proofDriveId ? `/api/public/media/thumbnail/achievement/${a.id}?v=${encodeURIComponent(a.proofDriveId)}` : null;
      return {
        id: a.id,
        type: 'achievements' as const,
        itemType: 'achievement' as const,
        studentId: a.studentId,
        studentName: a.student?.name || 'Unknown',
        studentRoll: a.student?.rollNo || 'Unknown',
        studentYear: a.student?.year,
        studentSection: a.student?.section,
        studentBranch: a.student?.branch,
        title: a.title,
        description: a.description,
        organization: a.organization,
        category: a.category?.name || 'Achievement',
        proofUrl,
        fileUrl: proofUrl,
        thumbnailUrl,
        proofDriveId: a.proofDriveId,
        status: a.status,
        submittedAt: (a as any).createdAt?.toISOString() || new Date().toISOString(),
        isPublic: Boolean(a.isPublic),
        reviewNote: a.reviewNote,
      };
    });

    const mappedCertificates = certificates.map((c) => ({
      id: c.id,
      type: 'certificates' as const,
      itemType: 'certificate' as const,
      studentId: c.studentId,
      studentName: c.student?.name || 'Unknown',
      studentRoll: c.student?.rollNo || 'Unknown',
      studentYear: c.student?.year,
      studentSection: c.student?.section,
      studentBranch: c.student?.branch,
      title: c.title,
      description: c.issuer || null,
      fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null,
      thumbnailUrl: c.fileDriveId ? `/api/public/media/thumbnail/certificate/${c.id}?v=${encodeURIComponent(c.fileDriveId)}` : null,
      fileDriveId: c.fileDriveId,
      status: c.status,
      submittedAt: (c as any).createdAt?.toISOString() || new Date().toISOString(),
      isPublic: Boolean(c.isPublic),
      reviewNote: c.reviewNote,
    }));

    const mappedProjects = projects.map((p) => ({
      id: p.id,
      type: 'projects' as const,
      itemType: 'project' as const,
      studentId: p.studentId,
      studentName: p.student?.name || 'Unknown',
      studentRoll: p.student?.rollNo || 'Unknown',
      studentYear: p.student?.year,
      studentSection: p.student?.section,
      studentBranch: p.student?.branch,
      title: p.title,
      description: p.description,
      organization: null,
      category: 'Project',
      proofUrl: p.githubUrl,
      fileUrl: p.driveVideoUrl || p.githubUrl,
      githubUrl: p.githubUrl,
      driveVideoUrl: p.driveVideoUrl,
      status: p.status,
      submittedAt: (p as any).createdAt?.toISOString() || new Date().toISOString(),
      isPublic: Boolean(p.isPublic),
      reviewNote: p.reviewNote,
    }));

    const allItems = [
      ...mappedVideos,
      ...mappedResumes,
      ...mappedCertificates,
      ...mappedProjects,
      ...mappedAchievements,
    ];

    allItems.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
    res.json({
      items: allItems,
      total: allItems.length,
    });
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
});

router.get('/moderation/videos', async (req, res) => {
  try {
    // Only videos still awaiting a decision belong in the queue. Approved
    // videos are managed from the submission detail view (publish/unpublish).
    const videos = await prisma.introVideo.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] } },
      select: {
        id: true,
        studentId: true,
        driveFileId: true,
        status: true,
        submittedAt: true,
        isPublic: true,
        reviewNote: true,
        student: {
          select: {
            name: true,
            rollNo: true,
            year: true,
            section: true,
            branch: true,
          },
        },
      },
      take: 200,
      orderBy: { submittedAt: 'desc' },
    });
    res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
    res.json(videos.map(v => ({
      ...v,
      studentName: v.student?.name || 'Unknown',
      studentRoll: v.student?.rollNo || 'Unknown',
      title: `${v.student?.name} (${v.student?.rollNo})`,
      fileUrl: (v.driveFileId && v.driveFileId.trim())
        ? `/api/public/media/video/${v.driveFileId.trim()}?stream=true`
        : (v.id ? `/api/public/media/video/${v.id}?stream=true` : null),
      thumbnailUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/thumbnail/video/${v.id}?v=${encodeURIComponent(v.driveFileId.trim())}` : null,
      isPublic: Boolean(v.isPublic),
      publicUrl: v.isPublic && v.status === 'APPROVED' ? `/api/public/videos/stream/${v.id}` : null,
    })));
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/moderation/resumes', async (req, res) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      select: {
        id: true,
        studentId: true,
        driveFileId: true,
        filename: true,
        status: true,
        submittedAt: true,
        student: {
          select: {
            name: true,
            rollNo: true,
            year: true,
            section: true,
            branch: true,
          },
        },
      },
      take: 200,
      orderBy: { submittedAt: 'desc' },
    });
    res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
    res.json(resumes.map(r => ({
      ...r,
      studentName: r.student?.name || 'Unknown',
      studentRoll: r.student?.rollNo || 'Unknown',
      title: `${r.student?.name} (${r.student?.rollNo})`,
      fileUrl: r.driveFileId ? `/api/public/media/resume/${r.id}` : null,
    })));
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/moderation/achievements', async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      include: { student: true, category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(achievements.map(a => {
      const proofUrl = a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.id}` : null);
      return {
        ...a,
        studentName: a.student?.name || 'Unknown',
        studentRoll: a.student?.rollNo || 'Unknown',
        submittedAt: a.createdAt,
        title: a.title,
        description: a.description,
        organization: a.organization,
        category: a.category?.name,
        proofUrl,
        fileUrl: proofUrl,
      };
    }));
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/moderation/certificates', async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      include: { student: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(certificates.map(c => ({
      ...c,
      studentName: c.student?.name || 'Unknown',
      studentRoll: c.student?.rollNo || 'Unknown',
      submittedAt: c.createdAt,
      fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null
    })));
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/moderation/videos/:id', async (req, res) => {
  try {
    const { action, reason, publish } = req.body;
    const video = await prisma.introVideo.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true, rollNo: true } } },
    });

    if (!video) {
      return httpError(res, 404, new Error('Video not found'), "NOT_FOUND");
    }

    const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CHANGES_REQUESTED';
    const note = reason ? String(reason) : null;

    // Approval publishes the video on the public page; a rejection un-publishes
    // it so nothing is visible before approval.
    const publishApproved = action === 'approve' ? publish !== false : false;

    const data: Record<string, unknown> = {
      status,
      reviewNote: note,
      reviewedAt: new Date(),
      reviewedBy: req.adminUser?.username || req.adminUser?.email || null,
    };

    if (action === 'approve') {
      data.isPublic = publishApproved;
      data.publishedAt = publishApproved ? (video.publishedAt ?? new Date()) : null;
      data.changeRequestedAt = null;
      data.changeRequestNote = null;
    } else if (action === 'reject') {
      data.isPublic = false;
      data.publishedAt = null;
    } else {
      // Request changes: the student must upload a new take.
      data.changeRequestedAt = new Date();
      data.changeRequestNote = note;
    }

    const updated = await prisma.introVideo.update({
      where: { id: req.params.id },
      data,
    });

    if (video.student?.rollNo) {
      const subStatus = status === 'APPROVED' ? 'REVIEWED' : status === 'REJECTED' ? 'REJECTED' : 'UNDER_REVIEW';
      await prisma.submission.updateMany({
        where: { rollNo: video.student.rollNo },
        data: { status: subStatus },
      }).catch(() => {});
    }
    // Keep the student informed about the decision on their video.
    if (video.student?.id) {
      if (status === 'CHANGES_REQUESTED') {
        await notifyVideoChangeRequested(video.student.id, note);
      } else if (status === 'APPROVED') {
        await notifyStudent({
          studentId: video.student.id,
          title: publishApproved
            ? 'Introduction video approved and published'
            : 'Introduction video approved',
          message: publishApproved
            ? 'Your introduction video was approved and is now visible on the public page.'
            : 'Your introduction video was approved. You can publish it to the public page from your Introduction Video page.',
        });
      } else if (status === 'REJECTED') {
        await notifyStudent({
          studentId: video.student.id,
          title: 'Introduction video rejected',
          message: note
            ? `Your introduction video was rejected. Faculty note: "${note}". You can upload a new version at any time.`
            : 'Your introduction video was rejected. You can upload a new version at any time.',
        });
      }
    }

    res.json({ message: 'Success', video: updated, isPublic: Boolean(updated.isPublic) });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// PATCH /admin/api/moderation/videos/:id/visibility — publish/unpublish an
// approved video on the public showcase without re-running moderation.
router.patch('/moderation/videos/:id/visibility', async (req, res) => {
  try {
    const { isPublic } = req.body || {};

    if (typeof isPublic !== 'boolean') {
      return httpError(res, 400, new Error('isPublic must be true or false'), "VALIDATION_ERROR");
    }

    const video = await prisma.introVideo.findUnique({ where: { id: req.params.id } });

    if (!video) {
      return httpError(res, 404, new Error('Video not found'), "NOT_FOUND");
    }

    if (isPublic && video.status !== 'APPROVED') {
      return httpError(
        res,
        409,
        new Error('Only an approved video can be published publicly.'),
        "NOT_APPROVED",
      );
    }

    const updated = await prisma.introVideo.update({
      where: { id: req.params.id },
      data: { isPublic, publishedAt: isPublic ? new Date() : null },
      select: { id: true, isPublic: true, publishedAt: true, status: true },
    });

    res.json({
      success: true,
      video: updated,
      message: isPublic
        ? 'Video is now visible on the public page.'
        : 'Video has been removed from the public page.',
    });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/moderation/resumes/:id', async (req, res) => {
  try {
    const { action, reason } = req.body;
    const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CHANGES_REQUESTED';
    await prisma.resume.update({
      where: { id: req.params.id },
      data: { status, reviewNote: reason }
    });
    res.json({ message: 'Success' });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/moderation/achievements/:id', async (req, res) => {
  try {
    const { action, reason } = req.body;
    const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : action === 'hide' ? 'HIDDEN' : 'CHANGES_REQUESTED';
    const updated = await prisma.achievement.update({
      where: { id: req.params.id },
      data: { status, reviewNote: reason || null, reviewedAt: new Date() }
    });
    res.json({ message: 'Success', achievement: updated });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

export default router;
