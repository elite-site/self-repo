import * as repo from '../students.repository';
import { env } from '../../../config/env';
import { INTERNAL_EVENT_ID } from '../../../config/constants';
import { driveService } from '../../media/drive';
import { ActivityService } from '../../admin/services/activity.service';
import { invalidateAllVideoCaches } from './videoStream.service';
import { logger } from '../../../utils/logger';

const EVENT_ID = INTERNAL_EVENT_ID;
const EVENT_NAME = 'Self Introduction';

export function deleteStoredFile(fileId: string | null | undefined, relativePath?: string): void {
  if (!fileId) return;
  try {
    void Promise.resolve(driveService.deleteFileById(fileId, relativePath)).catch((err) => {
      logger.warn(`Could not delete superseded file ${fileId}:`, { error: err });
    });
  } catch (err) {
    logger.warn(`Could not delete superseded file ${fileId}:`, { error: err });
  }
}

export async function purgeSupersededIntroVideos(
  studentId: string,
  keepId: string,
  protectedFileId?: string | null,
): Promise<string[]> {
  try {
    const stale = (await repo.findSupersededIntroVideos(studentId, keepId)) ?? [];

    if (stale.length === 0) return [];

    await repo.deleteSupersededIntroVideos(stale.map((v) => v.id));

    return stale
      .map((v) => v.driveFileId)
      .filter((fileId): fileId is string => Boolean(fileId) && fileId !== protectedFileId);
  } catch (err) {
    logger.warn('[videoRecord.service:purgeSupersededIntroVideos] Warning:', { error: err });
    return [];
  }
}

export async function recordStudentVideoSubmission(params: {
  student: {
    id: string;
    rollNo: string;
    name: string;
    email: string | null;
    section: string;
    branch: string;
    year: number;
  };
  driveFileId: string;
  origFilename: string;
  rawMime: string;
  contentLength: number;
  relativePath: string;
  source: 'stream' | 'direct';
}): Promise<{ id: string; videoDriveId: string }> {
  const { student, driveFileId, origFilename, rawMime, contentLength, relativePath, source } = params;

  const existing = await repo.findLatestSubmissionByRollNo(student.rollNo);
  const previousDriveId = existing?.videoDriveId ?? null;

  if (previousDriveId && previousDriveId !== driveFileId) {
    deleteStoredFile(previousDriveId, relativePath);
  }

  const submissionData = {
    name: student.name,
    rollNo: student.rollNo,
    email: student.email ?? '',
    section: student.section,
    branch: student.branch,
    year: student.year,
    videoDriveId: driveFileId,
    mediaType: 'VIDEO' as const,
    driveFolderPath: relativePath,
    status: 'SUBMITTED' as const,
    submittedAt: new Date(),
    reviewText: null,
    reviewPros: [],
    reviewCons: [],
    reviewedAt: null,
    reviewedBy: null,
  };

  await repo.ensureDefaultEventExists(EVENT_ID, EVENT_NAME, env.EVENT_YEAR);
  const submission = await repo.upsertSubmission(existing?.id, submissionData, EVENT_ID);

  const sizeMb = parseFloat((contentLength / 1024 / 1024).toFixed(2));
  try {
    const iv = await repo.findLatestIntroVideo(student.id);

    let thumbnailBuffer: Buffer | null = null;
    try {
      thumbnailBuffer = await driveService.generateThumbnail(driveFileId, 'video');
    } catch (thumbErr) {
      logger.warn('Could not generate thumbnail for re-uploaded intro video:', { error: thumbErr });
    }

    const ivData = {
      driveFileId,
      filename: origFilename,
      mimeType: rawMime,
      sizeMb,
      thumbnail: thumbnailBuffer,
      status: 'PENDING' as const,
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      submittedAt: new Date(),
      isActive: true,
      isPublic: false,
      publishedAt: null,
      changeRequestedAt: null,
      changeRequestNote: null,
    };

    const savedIv = await repo.upsertIntroVideo(iv?.id, student.id, ivData);
    const keptId = savedIv.id;

    const orphaned = await purgeSupersededIntroVideos(student.id, keptId, driveFileId);
    for (const fileId of orphaned) {
      deleteStoredFile(fileId, relativePath);
    }

    invalidateAllVideoCaches({
      studentId: student.id,
      rollNo: student.rollNo,
      introVideoIds: [keptId],
      submissionIds: existing?.videoDriveId ? [existing.videoDriveId] : [],
      driveFileIds: [driveFileId],
    });

    if (!thumbnailBuffer && driveFileId && keptId) {
      setTimeout(async () => {
        try {
          const bgThumb = await driveService.generateThumbnail(driveFileId, 'video');
          if (bgThumb) {
            await repo.updateIntroVideoThumbnail(keptId, bgThumb);
          }
        } catch (err) {
          // Non-fatal: background thumbnail generation failure
          logger.warn('Failed background thumbnail generation for intro video', { keptId, error: err });
        }
      }, 3000);
    }
  } catch (e) {
    logger.warn('[videoRecord.service:recordStudentVideoSubmission] introVideo sync failed:', { error: e });
  }

  ActivityService.logNonBlocking({
    eventId: EVENT_ID,
    category: 'APPLICATION',
    action: existing ? `Student re-uploaded video (${source})` : `Application submitted (${source})`,
    details: `Roll: ${student.rollNo}, Branch: ${student.branch}, Size: ${sizeMb} MB`,
    applicantName: student.name,
    userEmail: student.rollNo,
    status: 'SUCCESS',
  });

  return { id: submission.id, videoDriveId: driveFileId };
}
