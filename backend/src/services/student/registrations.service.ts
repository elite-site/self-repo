import { prisma } from '../../lib/prisma';
import { ActivityService } from '../activity.service';
import { INTERNAL_EVENT_ID } from '../../config/constants';
import { AppError } from '../../utils/appError';

export async function getRegistrations(studentId: string) {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        studentId,
        eventId: { not: INTERNAL_EVENT_ID },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
        event: { status: { notIn: ['CLOSED', 'ARCHIVED'] } },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            type: true,
            eventDate: true,
            registrationEnd: true,
            status: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    return registrations.map((r) => ({
      ...r,
      eventTitle: r.event?.name || '',
      status: r.status,
      registeredAt: r.registeredAt,
    }));
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[registrations.service:getRegistrations] studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function getRegistrationById(id: string, studentId: string) {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id },
      include: {
        event: true,
        student: true,
        team: true,
        answers: { include: { field: true } },
      },
    });

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
    console.error(`[registrations.service:getRegistrationById] id=${id} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function cancelRegistration(id: string, studentId: string) {
  try {
    const existing = await prisma.eventRegistration.findFirst({
      where: { id, studentId },
      include: { event: true, student: true },
    });
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Not found', 404);
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED' },
    });

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
    console.error(`[registrations.service:cancelRegistration] id=${id} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}
