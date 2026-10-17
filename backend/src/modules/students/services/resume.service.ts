import path from 'path';
import * as repo from '../students.repository';
import { env } from '../../../config/env';
import { INTERNAL_EVENT_ID } from '../../../config/constants';
import { driveService } from '../../media/drive';
import { ActivityService } from '../../admin/services/activity.service';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

const EVENT_ID = INTERNAL_EVENT_ID;

export async function listStudentResumes(studentId: string) {
  const resumes = await repo.findStudentResumes(studentId);

  return resumes.map((r) => {
    const { driveFileId: _d, ...rest } = r;
    const viewUrl = r.id ? `/api/public/media/resume/${r.id}` : null;
    const thumbnailUrl = r.driveFileId
      ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}`
      : null;
    return {
      ...rest,
      hasFile: Boolean(r.driveFileId),
      viewUrl,
      fileUrl: viewUrl,
      thumbnailUrl,
    };
  });
}

export async function uploadStudentResume(studentId: string, resumeFile: Express.Multer.File) {
  const [student, existingResume] = await Promise.all([
    repo.findStudentById(studentId),
    repo.findStudentResume(studentId),
  ]);

  if (!student) {
    throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'resume.service:uploadStudentResume');
  }

  const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const relativePath = `Students/${cleanRollNo}`;

  if (existingResume?.driveFileId) {
    if (typeof (driveService as any).cleanupFailedUpload === 'function') {
      try {
        await (driveService as any).cleanupFailedUpload([existingResume.driveFileId]);
      } catch (e) {
        logger.warn('[resume.service:uploadStudentResume] Failed cleanupFailedUpload on old resume:', { error: e });
      }
    }
    if (typeof (driveService as any).deleteFileById === 'function') {
      try {
        await (driveService as any).deleteFileById(existingResume.driveFileId, relativePath);
      } catch (e) {
        logger.warn('[resume.service:uploadStudentResume] Failed to delete old resume:', { error: e });
      }
    }
  }
  if (typeof (driveService as any).deleteFilesByPrefix === 'function') {
    await (driveService as any).deleteFilesByPrefix(relativePath, `${cleanRollNo}_resume`).catch(() => {});
  }

  const ext = path.extname(resumeFile.originalname) || '.pdf';
  const fileName = `${cleanRollNo}_resume${ext}`;

  const driveFileId = await driveService.uploadFile(
    {
      buffer: resumeFile.buffer,
      originalname: resumeFile.originalname,
      mimetype: resumeFile.mimetype || 'application/pdf',
      size: resumeFile.size,
    },
    fileName,
    env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
    relativePath
  );

  const sizeMb = parseFloat((resumeFile.size / (1024 * 1024)).toFixed(2));

  let thumbnailBuffer: Buffer | null = null;
  if (driveFileId && typeof driveService.generateThumbnail === 'function') {
    try {
      thumbnailBuffer = await driveService.generateThumbnail(driveFileId, 'resume');
    } catch (thumbErr) {
      logger.warn('[resume.service:uploadStudentResume] Failed to generate thumbnail:', { error: thumbErr });
    }
  }

  const resumeData = {
    driveFileId,
    filename: resumeFile.originalname,
    sizeMb,
    thumbnail: thumbnailBuffer,
    status: 'PENDING' as const,
    isPublic: false,
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    submittedAt: new Date(),
  };

  const resume = await repo.upsertResume(existingResume?.id, studentId, resumeData);

  const { driveFileId: _d, thumbnail: _t, ...rest } = resume;
  const viewUrl = `/api/public/media/resume/${resume.id}`;
  const thumbnailUrl = driveFileId
    ? `/api/public/media/thumbnail/resume/${resume.id}?v=${encodeURIComponent(driveFileId)}`
    : null;

  return {
    ...rest,
    hasFile: true,
    viewUrl,
    fileUrl: viewUrl,
    thumbnailUrl,
  };
}

export async function withdrawStudentResume(studentId: string): Promise<void> {
  const [student, existingResume] = await Promise.all([
    repo.findStudentRollNoAndName(studentId),
    repo.findStudentResume(studentId),
  ]);

  if (!student) {
    throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'resume.service:withdrawStudentResume');
  }

  if (!existingResume) {
    throw new AppError('NOT_FOUND', 'You have no resume to delete.', 404, 'resume.service:withdrawStudentResume');
  }

  const fileId = existingResume.driveFileId;
  await repo.deleteResume(existingResume.id);

  if (fileId) {
    try {
      const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      if (typeof (driveService as any).deleteFileById === 'function') {
        await (driveService as any).deleteFileById(fileId, `Students/${cleanRollNo}`);
      }
    } catch (e) {
      logger.warn('[resume.service:withdrawStudentResume] Could not delete file:', { error: e });
    }
  }

  ActivityService.logNonBlocking({
    eventId: EVENT_ID,
    category: 'FILE_UPLOAD',
    action: 'Student deleted resume',
    details: `Roll: ${student.rollNo}`,
    applicantName: student.name,
    userEmail: student.rollNo,
    status: 'SUCCESS',
  });
}
