import { prisma } from '../../lib/prisma';
import { TtlCache } from '../../utils/ttlCache';
import { AppError } from '../../utils/appError';
import { invalidateMediaDriveIdCache } from '../../routes/public.routes';
import { clearVideoListCache } from '../../routes/public.videos.routes';

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
      submission = await prisma.submission.findFirst({
        where: { rollNo: effectiveRollNo },
        orderBy: { submittedAt: 'desc' },
        select: { videoDriveId: true, driveFolderPath: true },
      });
    } else {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { rollNo: true },
      });
      if (!student) {
        throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'videoStream.service:resolveStudentVideoForStream');
      }
      effectiveRollNo = student.rollNo;
      submission = await prisma.submission.findFirst({
        where: { rollNo: student.rollNo },
        orderBy: { submittedAt: 'desc' },
        select: { videoDriveId: true, driveFolderPath: true },
      });
    }

    if (submission?.videoDriveId) {
      studentSubmissionVideoCache.set(cacheKey, {
        videoDriveId: submission.videoDriveId,
        driveFolderPath: submission.driveFolderPath,
      });
    }
  }

  if (!submission?.videoDriveId) {
    const iv = await prisma.introVideo.findFirst({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
      select: { driveFileId: true },
    });
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
