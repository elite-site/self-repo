import * as repo from '../students.repository';
import { INTERNAL_EVENT_ID } from '../../../config/constants';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

export async function getTeams(studentId: string) {
  try {
    const teams = await repo.findTeamsForStudent(studentId, INTERNAL_EVENT_ID);
    return teams.map((t) => ({ ...t, isLeader: t.leaderId === studentId }));
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[teams.service:getTeams] studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function createTeam(studentId: string, name: string, eventId?: string) {
  try {
    const student = await repo.findStudentStatus(studentId);
    if (!student || student.status !== 'ACTIVE') {
      throw new AppError('NOT_ACTIVE', 'Your account is no longer active for this activity.', 403);
    }

    let targetEventId = eventId;
    if (!targetEventId) {
      const activeEvent = await repo.findActiveEventForTeam(INTERNAL_EVENT_ID);
      if (!activeEvent || activeEvent.id === INTERNAL_EVENT_ID) {
        throw new AppError('VALIDATION_ERROR', 'No active event available to create a team for.', 400);
      }
      targetEventId = activeEvent.id;
    } else {
      const existingEvent = await repo.findEventById(targetEventId);
      if (!existingEvent || existingEvent.id === INTERNAL_EVENT_ID) {
        throw new AppError('NOT_FOUND', 'Event not found', 404);
      }
    }

    if (!targetEventId) {
      throw new AppError('VALIDATION_ERROR', 'No active event available to create a team for.', 400);
    }

    return await repo.createTeamWithMember({
      name,
      eventId: targetEventId,
      leaderId: studentId,
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[teams.service:createTeam] studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function deleteTeam(id: string, studentId: string) {
  try {
    const team = await repo.findTeamWithMembers(id);
    if (!team) {
      throw new AppError('NOT_FOUND', 'Team not found', 404);
    }
    if (team.leaderId !== studentId) {
      throw new AppError('FORBIDDEN', 'Only the team lead can remove this team.', 403);
    }

    await repo.deleteTeamTransaction(team.id);

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
    logger.error(`[teams.service:deleteTeam] id=${id} studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}
