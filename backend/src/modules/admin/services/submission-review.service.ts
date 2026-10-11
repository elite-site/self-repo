import { ActivityService } from './activity.service';
import { notifyVideoChangeRequested } from '../../students';
import { AppError } from '../../../utils/appError';
import { RATINGS, RATING_LABELS } from '../../../config/constants';
import * as adminRepo from '../admin.repository';
import { isValidRating, isValidSubmissionStatus } from '../admin.schemas';

export async function updateRating(id: string, rating: unknown) {
  const hasRating = rating !== null && rating !== undefined && rating !== '';
  const normalized = hasRating ? String(rating).toUpperCase() : null;

  if (normalized && !isValidRating(normalized)) {
    throw new AppError('INVALID_RATING', `Invalid rating. Available options: ${RATINGS.join(', ')}.`, 400);
  }

  const updated = await adminRepo.updateSubmission(id, {
    rating: (normalized as any) || null,
    ratedAt: normalized ? new Date() : null,
  });

  await ActivityService.log({
    eventId: updated.eventId,
    category: 'ADMIN',
    action: normalized ? `Admin rated student ${RATING_LABELS[normalized]}` : 'Admin cleared performance rating',
    details: normalized ? `Rating: ${normalized} (${RATING_LABELS[normalized]})` : 'Rating cleared',
    applicantName: updated.name,
    userEmail: updated.email,
    status: 'SUCCESS',
  });

  return updated;
}

export async function updateReview(id: string, reviewText?: string, pros?: any, cons?: any, adminUsername?: string) {
  const normalizedPros = Array.isArray(pros)
    ? (pros as string[]).map((p) => String(p).trim().toLowerCase()).filter(Boolean)
    : [];
  const normalizedCons = Array.isArray(cons)
    ? (cons as string[]).map((c) => String(c).trim().toLowerCase()).filter(Boolean)
    : [];
  const hasReview = Boolean(
    (reviewText && String(reviewText).trim()) || normalizedPros.length > 0 || normalizedCons.length > 0
  );

  const existing = await adminRepo.findSubmissionById(id);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Submission not found', 404);
  }

  const updated = await adminRepo.updateSubmission(
    id,
    hasReview
      ? {
          reviewText: reviewText ? String(reviewText).trim() : null,
          reviewPros: normalizedPros,
          reviewCons: normalizedCons,
          reviewedAt: new Date(),
          reviewedBy: adminUsername || undefined,
          status: 'REVIEWED',
        }
      : {
          reviewText: null,
          reviewPros: [],
          reviewCons: [],
          reviewedAt: null,
          reviewedBy: undefined,
          status: 'SUBMITTED',
        }
  );

  await ActivityService.log({
    eventId: updated.eventId,
    category: 'ADMIN',
    action: hasReview ? 'Admin sent review response to student' : 'Admin cleared review response',
    details: hasReview
      ? `Pros: ${normalizedPros.length}, Cons: ${normalizedCons.length}`
      : 'Review cleared',
    applicantName: updated.name,
    userEmail: updated.email,
    status: 'SUCCESS',
  });

  return updated;
}

export async function updateStatus(id: string, status: string) {
  if (!isValidSubmissionStatus(status)) {
    throw new AppError('INVALID_STATUS', 'Invalid status value provided.', 400);
  }

  const updated = await adminRepo.updateSubmission(id, { status });

  await ActivityService.log({
    eventId: updated.eventId,
    category: 'ADMIN',
    action: `Admin updated status to ${status}`,
    details: `Applicant status set to ${status}`,
    applicantName: updated.name,
    userEmail: updated.email,
    status: 'SUCCESS',
  });

  return updated;
}

export async function requestNewVideo(id: string, reason?: string | null) {
  const submission = await adminRepo.findSubmissionById(id);
  if (!submission) {
    throw new AppError('NOT_FOUND', 'Submission not found', 404);
  }

  const student = await adminRepo.findStudentByIdOrRoll(submission.rollNo);
  const introVideo = await adminRepo.findIntroVideoByStudentRoll(submission.rollNo);

  if (introVideo) {
    await adminRepo.updateIntroVideo(introVideo.id, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reason || 'A new introduction video has been requested.',
      changeRequestedAt: new Date(),
      changeRequestNote: reason,
    });
  }

  if (student?.id) {
    await notifyVideoChangeRequested(student.id, reason);
  }

  await ActivityService.log({
    eventId: submission.eventId,
    category: 'ADMIN',
    action: 'Admin requested a new introduction video',
    details: `New video requested for ${submission.rollNo}${reason ? `: ${reason}` : ''}`,
    applicantName: submission.name,
    userEmail: submission.email,
    status: 'WARNING',
  });

  return { success: true, message: 'The student has been notified and asked to upload a new video.' };
}
