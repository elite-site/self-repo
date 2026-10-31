import { driveService } from '../../media/drive';
import { AppError } from '../../../utils/appError';
import * as adminRepo from '../admin.repository';

export async function getPortalStudentDetail(id: string) {
  const student = await adminRepo.findStudentWithFullProfile(id);
  if (!student) throw new AppError('NOT_FOUND', 'Student not found', 404);

  const submissions = await adminRepo.findSubmissionsByRollNos(undefined, [student.rollNo]);

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

  const resumes = (student.resumes || []).map((r) => ({
    ...r,
    fileUrl: r.driveFileId ? `/api/public/media/resume/${r.id}` : null,
    thumbnailUrl: r.driveFileId ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}` : null,
    previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(r.driveFileId) : null,
    watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(r.driveFileId) : null,
  }));

  const achievements = (student.achievements || []).map((a) => ({
    ...a,
    proofUrl: a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.id}` : null),
    thumbnailUrl: a.proofDriveId ? `/api/public/media/thumbnail/achievement/${a.id}?v=${encodeURIComponent(a.proofDriveId)}` : null,
    watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(a.proofDriveId) : null,
    previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(a.proofDriveId) : null,
  }));

  const certificates = (student.certificates || []).map((c) => ({
    ...c,
    fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null,
    thumbnailUrl: c.fileDriveId ? `/api/public/media/thumbnail/certificate/${c.id}?v=${encodeURIComponent(c.fileDriveId)}` : null,
    previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(c.fileDriveId) : null,
    watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(c.fileDriveId) : null,
  }));

  const photoUrl = (student.profile?.photoDriveId || student.profile?.photoUrl)
    ? `/api/public/media/photo/${student.profile?.id || student.id}`
    : student.profile?.photoUrl || null;

  return {
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
  };
}
