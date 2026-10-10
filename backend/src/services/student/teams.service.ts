import { prisma } from '../../lib/prisma';
import { INTERNAL_EVENT_ID } from '../../config/constants';
import { AppError } from '../../utils/appError';

export async function getTeams(studentId: string) {
  try {
    const teams = await prisma.team.findMany({
      where: {
        eventId: { not: INTERNAL_EVENT_ID },
        OR: [{ leaderId: studentId }, { members: { some: { studentId } } }],
      },
      include: { members: { include: { student: true } }, event: true },
    });
    return teams.map((t) => ({ ...t, isLeader: t.leaderId === studentId }));
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[teams.service:getTeams] studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function createTeam(studentId: string, name: string, eventId?: string) {
  try {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { status: true } });
    if (!student || student.status !== 'ACTIVE') {
      throw new AppError('NOT_ACTIVE', 'Your account is no longer active for this activity.', 403);
    }

    let targetEventId = eventId;
    if (!targetEventId) {
      const activeEvent = await prisma.event.findFirst({
        where: {
          status: 'OPEN',
          id: { not: INTERNAL_EVENT_ID },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!activeEvent || activeEvent.id === INTERNAL_EVENT_ID) {
        throw new AppError('VALIDATION_ERROR', 'No active event available to create a team for.', 400);
      }
      targetEventId = activeEvent.id;
    } else {
      const existingEvent = await prisma.event.findUnique({
        where: { id: targetEventId },
      });
      if (!existingEvent || existingEvent.id === INTERNAL_EVENT_ID) {
        throw new AppError('NOT_FOUND', 'Event not found', 404);
      }
    }

    if (!targetEventId) {
      throw new AppError('VALIDATION_ERROR', 'No active event available to create a team for.', 400);
    }

    return await prisma.team.create({
      data: {
        name,
        eventId: targetEventId,
        leaderId: studentId,
        members: {
          create: { studentId },
        },
      },
      include: {
        event: true,
        members: { include: { student: true } },
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[teams.service:createTeam] studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function deleteTeam(id: string, studentId: string) {
  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: { select: { studentId: true } } },
    });
    if (!team) {
      throw new AppError('NOT_FOUND', 'Team not found', 404);
    }
    if (team.leaderId !== studentId) {
      throw new AppError('FORBIDDEN', 'Only the team lead can remove this team.', 403);
    }

    await prisma.$transaction([
      prisma.eventRegistration.updateMany({
        where: { teamId: team.id },
        data: { teamId: null },
      }),
      prisma.teamInvitation.deleteMany({ where: { teamId: team.id } }),
      prisma.teamMember.deleteMany({ where: { teamId: team.id } }),
      prisma.team.delete({ where: { id: team.id } }),
    ]);

    return {
      success: true,
      message: `Team "${team.name}" has been removed.`,
      removedMembers: team.members.length,
    };
  } catch (err: any) {
    if (err.code === 'P2025') {
      throw new AppError('NOT_FOUND', 'Team not found', 404);
    }
    if (err instanceof AppError) throw err;
    console.error(`[teams.service:deleteTeam] id=${id} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}
