import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { INTERNAL_EVENT_ID } from '../../config/constants';
import { driveService } from '../drive.service';
import { ActivityService } from '../activity.service';
import { invalidateAllVideoCaches } from './videoStream.service';

const EVENT_ID = INTERNAL_EVENT_ID;
const EVENT_NAME = 'Self Introduction';

export function deleteStoredFile(fileId: string | null | undefined, relativePath?: string): void {
  if (!fileId) return;
  try {
    void Promise.resolve(driveService.deleteFileById(fileId, relativePath)).catch((err) => {
      console.warn(`Could not delete superseded file ${fileId}:`, err);
    });
  } catch (err) {
    console.warn(`Could not delete superseded file ${fileId}:`, err);
  }
}

export async function purgeSupersededIntroVideos(
  studentId: string,
  keepId: string,
  protectedFileId?: string | null,
): Promise<string[]> {
  try {
    const stale = (await prisma.introVideo.findMany({
      where: { studentId, id: { not: keepId } },
      select: { id: true, driveFileId: true },
    })) ?? [];

    if (stale.length === 0) return [];

    await prisma.introVideo.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });

    return stale
      .map((v) => v.driveFileId)
      .filter((fileId): fileId is string => Boolean(fileId) && fileId !== protectedFileId);
  } catch (err) {
    console.warn('[videoRecord.service:purgeSupersededIntroVideos] Warning:', err);
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

  const existing = await prisma.submission.findFirst({
    where: { rollNo: student.rollNo },
    orderBy: { submittedAt: 'desc' },
  });
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

  const dbEvent = await prisma.event.findUnique({ where: { id: EVENT_ID } });
  if (!dbEvent) {
    await prisma.event.create({
      data: {
        id: EVENT_ID,
        name: EVENT_NAME,
        slug: 'self-introduction',
        year: env.EVENT_YEAR,
        status: 'OPEN',
      },
    });
  }

  const submission = existing
    ? await prisma.submission.update({ where: { id: existing.id }, data: submissionData })
    : await prisma.submission.create({ data: { eventId: EVENT_ID, ...submissionData } });

  const sizeMb = parseFloat((contentLength / 1024 / 1024).toFixed(2));
  try {
    const iv = await prisma.introVideo.findFirst({
      where: { studentId: student.id },
      orderBy: { submittedAt: 'desc' },
    });

    let thumbnailBuffer: Buffer | null = null;
    try {
      thumbnailBuffer = await driveService.generateThumbnail(driveFileId, 'video');
    } catch (thumbErr) {
      console.warn('Could not generate thumbnail for re-uploaded intro video:', thumbErr);
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

    let keptId: string;
    if (iv) {
      const updated = await prisma.introVideo.update({ where: { id: iv.id }, data: ivData });
      keptId = updated.id;
    } else {
      const created = await prisma.introVideo.create({ data: { studentId: student.id, ...ivData } });
      keptId = created.id;
    }

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
            await prisma.introVideo.update({ where: { id: keptId }, data: { thumbnail: bgThumb } });
          }
        } catch {}
      }, 3000);
    }
  } catch (e) {
    console.warn('[videoRecord.service:recordStudentVideoSubmission] introVideo sync failed:', e);
  }

  ActivityService.log({
    eventId: EVENT_ID,
    category: 'APPLICATION',
    action: existing ? `Student re-uploaded video (${source})` : `Application submitted (${source})`,
    details: `Roll: ${student.rollNo}, Branch: ${student.branch}, Size: ${sizeMb} MB`,
    applicantName: student.name,
    userEmail: student.rollNo,
    status: 'SUCCESS',
  }).catch(() => {});

  return { id: submission.id, videoDriveId: driveFileId };
}
