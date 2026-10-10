import path from 'path';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { INTERNAL_EVENT_ID } from '../../config/constants';
import { driveService } from '../drive.service';
import { ActivityService } from '../activity.service';
import { AppError } from '../../utils/appError';

const EVENT_ID = INTERNAL_EVENT_ID;

export async function listStudentResumes(studentId: string) {
  const resumes = await prisma.resume.findMany({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      studentId: true,
      driveFileId: true,
      filename: true,
      sizeMb: true,
      status: true,
      reviewNote: true,
      reviewedBy: true,
      reviewedAt: true,
      isActive: true,
      isPublic: true,
      submittedAt: true,
      updatedAt: true,
    },
  });

  return resumes.map((r) => {
    const { driveFileId: _d, ...rest } = r;
    const viewUrl = r.driveFileId ? `/api/public/media/resume/${r.id}` : null;
    const previewUrl = driveService.getPreviewUrl(r.driveFileId);
    const thumbnailUrl = r.driveFileId
      ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}`
      : null;
    return {
      ...rest,
      hasFile: Boolean(r.driveFileId),
      viewUrl: previewUrl || viewUrl,
      fileUrl: previewUrl || viewUrl,
      previewUrl,
      driveFileId: r.driveFileId || null,
      thumbnailUrl,
    };
  });
}

export async function uploadStudentResume(studentId: string, resumeFile: Express.Multer.File) {
  const [student, existingResume] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
    }),
    prisma.resume.findFirst({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
    }),
  ]);

  if (!student) {
    throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'resume.service:uploadStudentResume');
  }

  const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const relativePath = `Students/${cleanRollNo}`;

  if (existingResume?.driveFileId) {
    try {
      await driveService.deleteFileById(existingResume.driveFileId, relativePath);
    } catch (e) {
      console.warn('[resume.service:uploadStudentResume] Failed to delete old resume:', e);
    }
  }
  await driveService.deleteFilesByPrefix(relativePath, `${cleanRollNo}_resume`).catch(() => {});

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
      console.warn('[resume.service:uploadStudentResume] Failed to generate thumbnail:', thumbErr);
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

  const resume = existingResume
    ? await prisma.resume.update({
        where: { id: existingResume.id },
        data: resumeData,
      })
    : await prisma.resume.create({
        data: {
          studentId,
          ...resumeData,
        },
      });

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
    prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, name: true },
    }),
    prisma.resume.findFirst({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
    }),
  ]);

  if (!student) {
    throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'resume.service:withdrawStudentResume');
  }

  if (!existingResume) {
    throw new AppError('NOT_FOUND', 'You have no resume to delete.', 404, 'resume.service:withdrawStudentResume');
  }

  const fileId = existingResume.driveFileId;
  await prisma.resume.delete({ where: { id: existingResume.id } });

  if (fileId) {
    try {
      const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      await driveService.deleteFileById(fileId, `Students/${cleanRollNo}`);
    } catch (e) {
      console.warn('[resume.service:withdrawStudentResume] Could not delete file:', e);
    }
  }

  await ActivityService.log({
    eventId: EVENT_ID,
    category: 'FILE_UPLOAD',
    action: 'Student deleted resume',
    details: `Roll: ${student.rollNo}`,
    applicantName: student.name,
    userEmail: student.rollNo,
    status: 'SUCCESS',
  }).catch(() => {});
}
