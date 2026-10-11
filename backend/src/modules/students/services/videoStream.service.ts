import * as repo from '../students.repository';
import { TtlCache } from '../../../utils/ttlCache';
import { AppError } from '../../../utils/appError';
import { invalidateMediaDriveIdCache, clearVideoListCache } from '../../public';

export const studentSubmissionVideoCache = new TtlCache<{ videoDriveId: string; driveFolderPath: string }>(120_000, 500);

export function invalidateAllVideoCaches(params: {
  studentId: string;
  rollNo?: string | null;
  introVideoIds?: string[];
  submissionIds?: string[];
  driveFileIds?: string[];
}) {
  const { studentId, rollNo, introVideoIds = [], submissionIds = [], driveFileIds = [] } = params;

  studentSubmissionVideoCache.delete(studentId);
  if (rollNo) studentSubmissionVideoCache.delete(rollNo);

  invalidateMediaDriveIdCache('video', studentId);
  if (rollNo) invalidateMediaDriveIdCache('video', rollNo);

  for (const id of introVideoIds) {
    if (id) invalidateMediaDriveIdCache('video', id);
  }
  for (const id of submissionIds) {
    if (id) invalidateMediaDriveIdCache('video', id);
  }
  for (const fileId of driveFileIds) {
    if (fileId) invalidateMediaDriveIdCache('video', fileId);
  }

  clearVideoListCache();
}

export async function resolveStudentVideoForStream(studentId: string, rollNo?: string) {
  const cacheKey = rollNo || studentId;
  const cached = studentSubmissionVideoCache.get(cacheKey);
  let submission: { videoDriveId: string | null; driveFolderPath: string } | null = cached || null;
  let effectiveRollNo = rollNo;

  if (!submission) {
    if (effectiveRollNo) {
      submission = await repo.findSubmissionStreamData(effectiveRollNo);
    } else {
      const student = await repo.findStudentRollNoOnly(studentId);
      if (!student) {
        throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'videoStream.service:resolveStudentVideoForStream');
      }
      effectiveRollNo = student.rollNo;
      submission = await repo.findSubmissionStreamData(student.rollNo);
    }

    if (submission?.videoDriveId) {
      studentSubmissionVideoCache.set(cacheKey, {
        videoDriveId: submission.videoDriveId,
        driveFolderPath: submission.driveFolderPath,
      });
    }
  }

  if (!submission?.videoDriveId) {
    const iv = await repo.findIntroVideoStreamData(studentId);
    if (iv?.driveFileId) {
      const cleanRollNo = (effectiveRollNo || studentId).toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      submission = {
        videoDriveId: iv.driveFileId,
        driveFolderPath: `Students/${cleanRollNo}`,
      };
    }
  }

  if (!submission?.videoDriveId) {
    throw new AppError('MEDIA_NOT_FOUND', 'No video has been uploaded yet.', 404, 'videoStream.service:resolveStudentVideoForStream');
  }

  return {
    driveFileId: submission.videoDriveId,
    driveFolderPath: submission.driveFolderPath,
    rollNo: effectiveRollNo || studentId,
  };
}
