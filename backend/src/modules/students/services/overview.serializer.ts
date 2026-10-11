import type { StudentStatus } from '@prisma/client';

export interface StudentProfileData {
  id: string;
  rollNo: string;
  email: string | null;
  name: string;
  year: number;
  section: string;
  branch: string;
  status: StudentStatus;
  graduatedAt: Date | null;
  profile?: {
    id?: string;
    photoDriveId?: string | null;
    photoUrl?: string | null;
    photoOffsetX?: number | null;
    photoOffsetY?: number | null;
    photoZoom?: number | null;
    biography?: string | null;
  } | null;
}

export function serializeStudentView(
  student: StudentProfileData,
  submission: any | null,
  introVideo: any | null = null,
  maxVideoSizeMb: number = 25
) {
  const photoUrl = (student.profile?.photoDriveId || student.profile?.photoUrl)
    ? `/api/public/media/photo/${student.profile?.id || student.id}`
    : null;

  return {
    id: student.id,
    rollNo: student.rollNo,
    email: student.email ?? null,
    name: student.name,
    year: student.year,
    section: student.section,
    branch: student.branch,
    status: student.status,
    graduatedAt: student.graduatedAt,
    photoUrl: photoUrl || undefined,
    viewUrl: photoUrl || undefined,
    hasPhoto: Boolean(photoUrl),
    photoOffsetX: student.profile?.photoOffsetX ?? 0,
    photoOffsetY: student.profile?.photoOffsetY ?? 0,
    photoZoom: student.profile?.photoZoom ?? 1,
    bio: student.profile?.biography || undefined,
    biography: student.profile?.biography || undefined,
    maxVideoSizeMb,
    submission: submission
      ? {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          videoUploaded: Boolean(submission.videoDriveId),
          reviewText: submission.reviewText || null,
          reviewPros: submission.reviewPros || [],
          reviewCons: submission.reviewCons || [],
          reviewedAt: submission.reviewedAt || null,
        }
      : null,
    video: introVideo
      ? {
          id: introVideo.id,
          status: introVideo.status,
          reviewNote: introVideo.reviewNote || null,
          isPublic: Boolean(introVideo.isPublic),
          publishedAt: introVideo.publishedAt || null,
          changeRequestedAt: introVideo.changeRequestedAt || null,
          changeRequestNote: introVideo.changeRequestNote || null,
          submittedAt: introVideo.submittedAt,
          filename: introVideo.filename || null,
          mimeType: introVideo.mimeType || null,
          sizeMb: introVideo.sizeMb ?? null,
          hasFile: Boolean(introVideo.driveFileId && introVideo.driveFileId.trim() !== ''),
          driveFileId: (introVideo.driveFileId && introVideo.driveFileId.trim() !== '') ? introVideo.driveFileId.trim() : null,
          thumbnailUrl: (introVideo.driveFileId && introVideo.driveFileId.trim() !== '')
            ? `/api/public/media/thumbnail/video/${introVideo.id}?v=${encodeURIComponent(introVideo.driveFileId.trim())}`
            : null,
        }
      : null,
  };
}
