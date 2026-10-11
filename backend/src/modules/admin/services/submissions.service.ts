import { driveService } from '../../media/drive';
import { ActivityService } from './activity.service';
import { notifyVideoChangeRequested } from '../../students';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';
import {
  INTERNAL_EVENT_ID,
  RATINGS,
  SUBMISSION_STATUSES,
} from '../../../config/constants';
import * as adminRepo from '../admin.repository';
import type { SubmissionQueryParams } from '../admin.types';

export const ACTIVE_EVENT_ID = INTERNAL_EVENT_ID;

export async function listSubmissions(query: SubmissionQueryParams) {
  const eventId = (query.eventId || ACTIVE_EVENT_ID).trim();
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25', 10)));
  const skip = (page - 1) * limit;

  const branch = query.branch;
  const section = query.section;
  const year = query.year ? parseInt(query.year, 10) : undefined;
  const status = query.status;
  const rating = query.rating;
  const search = query.search?.trim();
  const tag = query.tag?.trim().toLowerCase();

  const sortBy = query.sortBy || 'submittedAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const whereClause: any = { eventId };
  const andConditions: any[] = [];

  if (branch) whereClause.branch = branch;
  if (section) whereClause.section = section;
  if (year) whereClause.year = year;
  if (status && SUBMISSION_STATUSES.includes(status as any)) whereClause.status = status;
  if (rating && RATINGS.includes(rating as any)) whereClause.rating = rating;

  if (tag) {
    andConditions.push({
      OR: [
        { reviewPros: { has: tag } },
        { reviewCons: { has: tag } },
      ],
    });
  }

  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (andConditions.length > 0) {
    whereClause.AND = andConditions;
  }

  const [total, submissions] = await Promise.all([
    adminRepo.countSubmissions(whereClause),
    adminRepo.findSubmissions(whereClause, skip, limit, sortBy, sortOrder),
  ]);

  return {
    eventId,
    data: submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSubmissionDetail(id: string) {
  const submission = await adminRepo.findSubmissionById(id);
  if (!submission) return null;

  const introVideo = await adminRepo.findIntroVideoByStudentRoll(submission.rollNo);

  return {
    ...submission,
    introVideo: introVideo
      ? {
          id: introVideo.id,
          status: introVideo.status,
          reviewNote: introVideo.reviewNote,
          isPublic: introVideo.isPublic,
          publishedAt: introVideo.publishedAt,
          changeRequestedAt: introVideo.changeRequestedAt,
          changeRequestNote: introVideo.changeRequestNote,
          driveFileId: introVideo.driveFileId,
          submittedAt: introVideo.submittedAt,
          publicUrl:
            introVideo.isPublic && introVideo.status === 'APPROVED'
              ? `/api/public/videos/stream/${introVideo.id}`
              : null,
        }
      : null,
  };
}

export async function getMediaStreamInfo(id: string, fileKey: string) {
  if (fileKey !== 'video') {
    throw new AppError('MEDIA_NOT_FOUND', `Media ${fileKey} is not available for this portal.`, 404);
  }

  let driveFileId: string | null = null;
  let driveFolderPath: string | undefined;

  const submission = await adminRepo.findSubmissionByDriveOrRoll(id);
  if (submission?.videoDriveId) {
    driveFileId = submission.videoDriveId.trim();
    driveFolderPath = submission.driveFolderPath;
  } else {
    const introVideo = await adminRepo.findIntroVideoByDriveOrRoll(id);
    if (introVideo?.driveFileId) {
      driveFileId = introVideo.driveFileId.trim();
    }
  }

  if (!driveFileId) {
    throw new AppError('MEDIA_NOT_FOUND', `Media ${fileKey} not present for this submission.`, 404);
  }

  return { driveFileId, driveFolderPath };
}

export async function deleteSubmissionVideo(id: string) {
  const submission = await adminRepo.findSubmissionById(id);
  if (!submission) {
    throw new AppError('NOT_FOUND', 'Submission not found', 404);
  }

  if (!submission.videoDriveId) {
    throw new AppError('NO_VIDEO', 'This submission has no video to delete.', 400);
  }

  await driveService.deleteVideo(submission);

  const updated = await adminRepo.updateSubmission(id, {
    videoDriveId: null,
  });

  const student = await adminRepo.findStudentByIdOrRoll(submission.rollNo);

  try {
    await adminRepo.updateIntroVideosByStudent(submission.rollNo, {
      driveFileId: null,
      status: 'CHANGES_REQUESTED',
      reviewNote: 'Video removed by administrator.',
      isPublic: false,
      publishedAt: null,
      changeRequestedAt: new Date(),
      changeRequestNote: 'Your previous video was removed. Please upload a new one.',
    });
  } catch (err) {
    // Non-fatal: legacy video row might not exist for this submission
    logger.warn('Failed to update legacy video record on submission video delete', { error: err });
  }

  if (student?.id) {
    await notifyVideoChangeRequested(
      student.id,
      'Your previous video was removed by the administrator.'
    );
  }

  await ActivityService.log({
    eventId: updated.eventId,
    category: 'ADMIN',
    action: 'Admin deleted student introduction video',
    details: `Video removed for ${updated.rollNo}. Student notified to upload a replacement.`,
    applicantName: updated.name,
    userEmail: updated.email,
    status: 'WARNING',
  });

  return updated;
}

export async function deleteSubmission(id: string) {
  const submission = await adminRepo.findSubmissionById(id);
  if (!submission) {
    throw new AppError('NOT_FOUND', 'Submission not found', 404);
  }

  await driveService.deleteSubmissionFiles(submission);
  await adminRepo.deleteSubmission(id);

  await ActivityService.log({
    eventId: submission.eventId,
    category: 'ADMIN',
    action: 'Admin deleted applicant',
    details: `Purged submission record and Drive files for ${submission.rollNo}`,
    applicantName: submission.name,
    userEmail: submission.email,
    status: 'WARNING',
  });

  return { success: true, message: 'Submission and associated files purged successfully.' };
}
