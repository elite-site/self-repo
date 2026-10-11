import * as repo from '../students.repository';
import { ActivityService } from '../../admin/services/activity.service';
import { INTERNAL_EVENT_ID } from '../../../config/constants';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

export async function getRegistrations(studentId: string) {
  try {
    const registrations = await repo.findStudentEventRegistrations(studentId, INTERNAL_EVENT_ID);

    return registrations.map((r) => ({
      ...r,
      eventTitle: r.event?.name || '',
      status: r.status,
      registeredAt: r.registeredAt,
    }));
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[registrations.service:getRegistrations] studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function getRegistrationById(id: string, studentId: string) {
  try {
    const reg = await repo.findRegistrationById(id);

    if (!reg || reg.studentId !== studentId) {
      throw new AppError('NOT_FOUND', 'Registration not found', 404);
    }

    return {
      ...reg,
      eventTitle: reg.event?.name || '',
      status: reg.status,
      registeredAt: reg.registeredAt,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[registrations.service:getRegistrationById] id=${id} studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function cancelRegistration(id: string, studentId: string) {
  try {
    const existing = await repo.findRegistrationForCancel(id, studentId);
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Not found', 404);
    }

    const updated = await repo.updateRegistrationStatus(existing.id, 'CANCELLED');

    await ActivityService.log({
      eventId: existing.eventId,
      category: 'APPLICATION',
      action: `Student cancelled registration for ${existing.event?.name || 'event'}`,
      details: `Student ${existing.student?.name || studentId} cancelled registration`,
      applicantName: existing.student?.name || undefined,
      userEmail: existing.student?.email || undefined,
      status: 'INFO',
    });

    return { message: 'Cancelled successfully', registration: updated };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[registrations.service:cancelRegistration] id=${id} studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}
