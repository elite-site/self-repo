import { Request } from 'express';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { INTERNAL_EVENT_ID } from '../../config/constants';
import { driveService } from '../drive.service';
import { ActivityService } from '../activity.service';
import { getMaxVideoSizeMb } from '../limits.service';
import { AppError } from '../../utils/appError';
import { deleteStoredFile, recordStudentVideoSubmission } from './videoRecord.service';
import { invalidateAllVideoCaches } from './videoStream.service';
import {
  validateVideoSessionPayload,
  validateVideoStreamHeaders,
} from '../../validators/student/video.schema';

const EVENT_ID = INTERNAL_EVENT_ID;
const EVENT_NAME = 'Self Introduction';

export async function withdrawStudentVideo(studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { rollNo: true, name: true },
  });
  if (!student) {
    throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'video.service:withdrawStudentVideo');
  }

  const [submissions, introVideos] = await Promise.all([
    prisma.submission.findMany({
      where: { rollNo: student.rollNo },
      select: { id: true, videoDriveId: true, driveFolderPath: true },
    }),
    prisma.introVideo.findMany({
      where: { studentId },
      select: { id: true, driveFileId: true },
    }),
  ]);

  if (submissions.length === 0 && introVideos.length === 0) {
    throw new AppError('NOT_FOUND', 'You have no submitted video to delete.', 404, 'video.service:withdrawStudentVideo');
  }

  const fileIds = new Set<string>();
  for (const s of submissions) {
    if (s.videoDriveId) fileIds.add(s.videoDriveId);
  }
  for (const v of introVideos) {
    if (v.driveFileId) fileIds.add(v.driveFileId);
  }
  const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const folderPath = submissions[0]?.driveFolderPath || `Students/${cleanRollNo}`;

  await prisma.$transaction([
    prisma.submission.deleteMany({ where: { id: { in: submissions.map((s) => s.id) } } }),
    prisma.introVideo.deleteMany({ where: { id: { in: introVideos.map((v) => v.id) } } }),
  ]);

  for (const fileId of fileIds) {
    deleteStoredFile(fileId, folderPath);
  }

  invalidateAllVideoCaches({
    studentId,
    rollNo: student.rollNo,
    introVideoIds: introVideos.map((v) => v.id),
    submissionIds: submissions.map((s) => s.id),
    driveFileIds: Array.from(fileIds),
  });

  await ActivityService.log({
    eventId: EVENT_ID,
    category: 'APPLICATION',
    action: 'Student deleted introduction video',
    details: `Roll: ${student.rollNo}, files removed: ${fileIds.size}`,
    applicantName: student.name,
    userEmail: student.rollNo,
    status: 'SUCCESS',
  }).catch(() => {});
}

export async function setVideoVisibility(studentId: string, isPublic: boolean) {
  const introVideo = await prisma.introVideo.findFirst({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
  });

  if (!introVideo || !introVideo.driveFileId) {
    throw new AppError('NO_VIDEO', 'Upload an introduction video first.', 404, 'video.service:setVideoVisibility');
  }

  if (isPublic && introVideo.status !== 'APPROVED') {
    throw new AppError('NOT_APPROVED', 'Your video is still awaiting faculty approval, so it cannot be published yet.', 409, 'video.service:setVideoVisibility');
  }

  const updated = await prisma.introVideo.update({
    where: { id: introVideo.id },
    data: {
      isPublic,
      publishedAt: isPublic ? new Date() : null,
    },
    select: { id: true, isPublic: true, publishedAt: true, status: true },
  });

  return {
    success: true,
    isPublic: updated.isPublic,
    publishedAt: updated.publishedAt,
    message: isPublic
      ? 'Your video is now visible on the public page.'
      : 'Your video has been removed from the public page.',
  };
}

export async function createVideoSession(studentId: string, body: any, clientOrigin?: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true },
  });

  if (!student) {
    throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'video.service:createVideoSession');
  }

  const maxVideoSizeMb = await getMaxVideoSizeMb();
  const { sizeNum, cleanMime, ext } = validateVideoSessionPayload(body, maxVideoSizeMb);

  if (driveService.isUsingMock) {
    throw new AppError('NOT_IMPLEMENTED', 'Direct Google Drive upload is not supported in mock mode.', 501, 'video.service:createVideoSession');
  }

  const { folderId } = await driveService.resolveStudentFolder({
    eventName: EVENT_NAME,
    eventYear: env.EVENT_YEAR,
    year: student.year,
    section: student.section,
    branch: student.branch,
    rollNo: student.rollNo,
    name: student.name,
  });

  const fileExt = ext ? `.${ext}` : '.mp4';
  const clean = (s: string) => s.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const videoFileName = `${clean(student.rollNo)}_video${fileExt}`;

  const sessionUrl = await driveService.createResumableUploadSession(
    videoFileName,
    cleanMime,
    sizeNum,
    folderId,
    clientOrigin,
  );

  if (!sessionUrl) {
    throw new AppError('NOT_IMPLEMENTED', 'Direct Drive upload session could not be established.', 501, 'video.service:createVideoSession');
  }

  const CHUNK_SIZE = 8 * 1024 * 1024;
  return { sessionUrl, chunkSize: CHUNK_SIZE };
}

export async function completeVideoUpload(studentId: string, driveFileId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true },
  });

  if (!student) {
    throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'video.service:completeVideoUpload');
  }

  const { folderId, relativePath } = await driveService.resolveStudentFolder({
    eventName: EVENT_NAME,
    eventYear: env.EVENT_YEAR,
    year: student.year,
    section: student.section,
    branch: student.branch,
    rollNo: student.rollNo,
    name: student.name,
  });

  const maxVideoSizeMb = await getMaxVideoSizeMb();
  const maxBytes = maxVideoSizeMb * 1024 * 1024;

  const verifyResult = await driveService.verifyUploadedVideoFile(driveFileId, folderId, maxBytes);

  if (!verifyResult.valid || !verifyResult.fileMeta) {
    deleteStoredFile(driveFileId, relativePath);
    throw new AppError('VALIDATION_ERROR', verifyResult.error || 'Video validation failed.', 400, 'video.service:completeVideoUpload');
  }

  const submission = await recordStudentVideoSubmission({
    student,
    driveFileId,
    origFilename: verifyResult.fileMeta.name,
    rawMime: verifyResult.fileMeta.mimeType,
    contentLength: verifyResult.fileMeta.size,
    relativePath,
    source: 'direct',
  });

  return {
    id: submission.id,
    videoDriveId: driveFileId,
  };
}

export async function streamVideoUpload(studentId: string, req: Request) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true },
  });

  if (!student) {
    req.resume();
    throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'video.service:streamVideoUpload');
  }

  const maxVideoSizeMb = env.MAX_VIDEO_SIZE_MB;
  let parsedHeaders;
  try {
    parsedHeaders = validateVideoStreamHeaders(req.headers, maxVideoSizeMb, student.rollNo);
  } catch (err) {
    req.resume();
    throw err;
  }

  const { contentLength, rawMime, origFilename } = parsedHeaders;

  const { folderId, relativePath } = await driveService.resolveStudentFolder({
    eventName: EVENT_NAME,
    eventYear: env.EVENT_YEAR,
    year: student.year,
    section: student.section,
    branch: student.branch,
    rollNo: student.rollNo,
    name: student.name,
  });

  const ext = path.extname(origFilename) || '.mp4';
  const clean = (s: string) => s.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const videoFileName = `${clean(student.rollNo)}_video${ext}`;

  const sessionUrl = await driveService.createResumableUploadSession(
    videoFileName,
    rawMime,
    contentLength,
    folderId,
  );

  const driveFileId = await driveService.streamUploadToDrive(
    sessionUrl,
    rawMime,
    contentLength,
    req,
    { relativePath, fileName: videoFileName },
  );

  const submission = await recordStudentVideoSubmission({
    student,
    driveFileId,
    origFilename,
    rawMime,
    contentLength,
    relativePath,
    source: 'stream',
  });

  return {
    id: submission.id,
    videoDriveId: driveFileId,
  };
}
