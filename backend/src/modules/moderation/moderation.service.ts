import * as repo from './moderation.repository';
import { parseModerationStatus } from './moderation.schemas';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/appError';
import { notifyStudent, notifyVideoChangeRequested } from '../students';
import { driveService } from '../media/drive';
import { logger } from '../../utils/logger';
import type {
  ModerationDecision,
  ModerationDecisionOptions,
  ModerationDecisionOutcome,
  ModerationItemType,
  ModerationRecord,
  ModerationUpdate,
} from './moderation.types';

const ITEM_LABELS: Record<ModerationItemType, string> = {
  videos: 'Video',
  resumes: 'Resume',
  certificates: 'Certificate',
  achievements: 'Achievement',
  projects: 'Project',
};

/** Maps a project row onto the shape the moderation queue renders. */
function mapProjectItem(p: {
  id: string;
  studentId: string;
  title: string;
  description: string | null;
  githubUrl: string | null;
  driveVideoUrl: string | null;
  status: string;
  isPublic: boolean;
  reviewNote: string | null;
  createdAt: Date;
  student?: { name: string; rollNo: string; year: number; section: string; branch: string } | null;
}) {
  return {
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
    submittedAt: p.createdAt?.toISOString() || new Date().toISOString(),
    isPublic: Boolean(p.isPublic),
    reviewNote: p.reviewNote,
  };
}


export async function getUnifiedModerationItems(rawType: string = 'all', rawStatus: string = 'ALL') {
  const normalizedType = rawType.toLowerCase();
  const statusFilter = parseModerationStatus(rawStatus);
  const whereClause = statusFilter ? { status: statusFilter } : {};

  const [videos, resumes, achievements, certificates, projects] = await Promise.all([
    normalizedType === 'all' || normalizedType === 'videos'
      ? repo.findVideos(whereClause, 200)
      : Promise.resolve([]),
    normalizedType === 'all' || normalizedType === 'resumes'
      ? repo.findResumes(whereClause, 200)
      : Promise.resolve([]),
    normalizedType === 'all' || normalizedType === 'achievements'
      ? repo.findAchievements(whereClause, 200)
      : Promise.resolve([]),
    normalizedType === 'all' || normalizedType === 'certificates'
      ? repo.findCertificates(whereClause, 200)
      : Promise.resolve([]),
    normalizedType === 'all' || normalizedType === 'projects'
      ? repo.findProjects(whereClause, 200)
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

  const mappedProjects = projects.map(mapProjectItem);

  const allItems = [
    ...mappedVideos,
    ...mappedResumes,
    ...mappedCertificates,
    ...mappedProjects,
    ...mappedAchievements,
  ];

  allItems.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return {
    items: allItems,
    total: allItems.length,
  };
}

export async function getVideoModerationQueue() {
  const videos = await repo.findVideosQueue(200);
  return videos.map((v) => ({
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
  }));
}

export async function getResumeModerationQueue() {
  const resumes = await repo.findResumesQueue(200);
  return resumes.map((r) => ({
    ...r,
    studentName: r.student?.name || 'Unknown',
    studentRoll: r.student?.rollNo || 'Unknown',
    title: `${r.student?.name} (${r.student?.rollNo})`,
    fileUrl: r.driveFileId ? `/api/public/media/resume/${r.id}` : null,
  }));
}

export async function getAchievementModerationQueue() {
  const achievements = await repo.findAchievementsQueue();
  return achievements.map((a) => {
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
  });
}

export async function getCertificateModerationQueue() {
  const certificates = await repo.findCertificatesQueue();
  return certificates.map((c) => ({
    ...c,
    studentName: c.student?.name || 'Unknown',
    studentRoll: c.student?.rollNo || 'Unknown',
    submittedAt: c.createdAt,
    fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null,
  }));
}

export async function getProjectModerationQueue() {
  const projects = await repo.findProjects({}, 200);
  return projects.map(mapProjectItem);
}

interface ModerationItemAdapter {
  findById: (id: string) => Promise<ModerationRecord | null>;
  update: (id: string, data: ModerationUpdate) => Promise<ModerationRecord>;
  remove: (id: string) => Promise<unknown>;
}

/** One adapter per queue type so every handler dispatches the same way. */
const ITEM_ADAPTERS: Record<ModerationItemType, ModerationItemAdapter> = {
  videos: { findById: repo.findVideoById, update: repo.updateVideo, remove: repo.deleteVideo },
  resumes: { findById: repo.findResumeById, update: repo.updateResume, remove: repo.deleteResume },
  certificates: {
    findById: repo.findCertificateById,
    update: repo.updateCertificate,
    remove: repo.deleteCertificate,
  },
  achievements: {
    findById: repo.findAchievementById,
    update: repo.updateAchievement,
    remove: repo.deleteAchievement,
  },
  projects: { findById: repo.findProjectById, update: repo.updateProject, remove: repo.deleteProject },
};

/** Keeps the per-type columns each legacy handler wrote. */
function buildDecisionUpdate(
  type: ModerationItemType,
  decision: ModerationDecision,
  note?: string,
  reviewer?: string
): ModerationUpdate {
  if (type === 'achievements') {
    return { status: decision, reviewNote: note ?? null, reviewedAt: new Date() };
  }
  if (type === 'projects') {
    return { status: decision, reviewNote: note ?? null, reviewedAt: new Date(), reviewedBy: reviewer ?? null };
  }
  return { status: decision, reviewNote: note };
}

async function decideVideo(id: string, decision: ModerationDecision, options: ModerationDecisionOptions) {
  const video = await repo.findVideoById(id);
  if (!video) {
    throw new NotFoundError('Video not found');
  }

  const note = options.note ?? null;
  const publishApproved = decision === 'APPROVED' && options.publish !== false;

  const data: ModerationUpdate = {
    status: decision,
    reviewNote: note,
    reviewedAt: new Date(),
    reviewedBy: options.reviewer ?? null,
  };

  if (decision === 'APPROVED') {
    data.isPublic = publishApproved;
    data.publishedAt = publishApproved ? (video.publishedAt ?? new Date()) : null;
    data.changeRequestedAt = null;
    data.changeRequestNote = null;
  } else if (decision === 'REJECTED' || decision === 'HIDDEN') {
    data.isPublic = false;
    data.publishedAt = null;
  } else {
    data.changeRequestedAt = new Date();
    data.changeRequestNote = note;
  }

  const updated = await repo.updateVideo(id, data);

  if (video.student?.rollNo) {
    const submissionStatus =
      decision === 'APPROVED'
        ? 'REVIEWED'
        : decision === 'REJECTED'
        ? 'REJECTED'
        : decision === 'CHANGES_REQUESTED'
        ? 'UNDER_REVIEW'
        : null;
    if (submissionStatus) {
      await repo.updateSubmissionStatusByRollNo(video.student.rollNo, submissionStatus);
    }
  }

  if (video.student?.id) {
    if (decision === 'CHANGES_REQUESTED') {
      await notifyVideoChangeRequested(video.student.id, note);
    } else if (decision === 'APPROVED') {
      await notifyStudent({
        studentId: video.student.id,
        title: publishApproved
          ? 'Introduction video approved and published'
          : 'Introduction video approved',
        message: publishApproved
          ? 'Your introduction video was approved and is now visible on the public page.'
          : 'Your introduction video was approved. You can publish it to the public page from your Introduction Video page.',
      });
    } else if (decision === 'REJECTED') {
      await notifyStudent({
        studentId: video.student.id,
        title: 'Introduction video rejected',
        message: note
          ? `Your introduction video was rejected. Faculty note: "${note}". You can upload a new version at any time.`
          : 'Your introduction video was rejected. You can upload a new version at any time.',
      });
    }
  }

  return { video: updated, isPublic: Boolean(updated.isPublic) };
}

export async function applyModerationDecision(
  type: ModerationItemType,
  id: string,
  decision: ModerationDecision,
  options: ModerationDecisionOptions = {}
): Promise<ModerationDecisionOutcome> {
  if (type === 'videos') {
    const result = await decideVideo(id, decision, options);
    return { type, item: result.video, isPublic: result.isPublic };
  }

  const adapter = ITEM_ADAPTERS[type];
  const existing = await adapter.findById(id);
  if (!existing) {
    throw new NotFoundError(`${ITEM_LABELS[type]} not found`);
  }

  const item = await adapter.update(id, buildDecisionUpdate(type, decision, options.note, options.reviewer));
  return { type, item };
}

export async function updateVideoVisibility(id: string, isPublic: boolean) {
  if (typeof isPublic !== 'boolean') {
    throw new ValidationError('isPublic must be true or false');
  }

  const video = await repo.findVideoById(id);
  if (!video) {
    throw new NotFoundError('Video not found');
  }

  if (isPublic && video.status !== 'APPROVED') {
    throw new ConflictError('Only an approved video can be published publicly.');
  }

  const updated = await repo.updateVideo(id, {
    isPublic,
    publishedAt: isPublic ? new Date() : null,
  });

  return updated;
}

export async function setModerationVisibility(
  type: ModerationItemType,
  id: string,
  isPublic: boolean
): Promise<ModerationDecisionOutcome> {
  if (typeof isPublic !== 'boolean') {
    throw new ValidationError('isPublic must be true or false');
  }

  if (type === 'videos') {
    const item = await updateVideoVisibility(id, isPublic);
    return { type, item, isPublic };
  }

  const adapter = ITEM_ADAPTERS[type];
  const existing = await adapter.findById(id);
  if (!existing) {
    throw new NotFoundError(`${ITEM_LABELS[type]} not found`);
  }

  if (isPublic && existing.status !== 'APPROVED') {
    throw new ConflictError('Only an approved item can be published publicly.');
  }

  const item = await adapter.update(id, { isPublic });
  return { type, item, isPublic };
}

export async function deleteModerationItem(type: ModerationItemType, id: string): Promise<void> {
  const adapter = ITEM_ADAPTERS[type];
  const existing = await adapter.findById(id);
  if (!existing) {
    throw new NotFoundError(`${ITEM_LABELS[type]} not found`);
  }

  const driveFileId = existing.driveFileId ?? existing.fileDriveId ?? existing.proofDriveId ?? null;
  if (driveFileId) {
    try {
      await driveService.deleteFileById(driveFileId);
    } catch (err) {
      // The record still has to be removed: an orphaned Drive file is
      // recoverable, a half-deleted portfolio item is not.
      logger.warn('[moderation] failed to delete the Drive file for a removed item', {
        error: err,
        type,
        id,
      });
    }
  }

  await adapter.remove(id);
}

// Portal Moderation
export async function handlePortalModerationDecision(
  type: string,
  id: string,
  status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'HIDDEN',
  reason?: string
) {
  switch (type) {
    case 'videos': {
      const data: ModerationUpdate = {
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

      const updated = await repo.updateVideo(id, data);
      const video = await repo.findVideoById(id);

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
      return repo.updateResume(id, { status, reviewNote: reason });
    case 'achievements':
      return repo.updateAchievement(id, { status, reviewNote: reason });
    case 'certificates':
      return repo.updateCertificate(id, { status, reviewNote: reason });
    default:
      throw new NotFoundError(`Invalid moderation type: ${type}`);
  }
}
