import * as repo from '../students.repository';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

export async function inviteTeamMember(teamId: string, studentId: string, rollNo: string) {
  try {
    const team = await repo.findTeamById(teamId);
    if (!team) {
      throw new AppError('NOT_FOUND', 'Team not found', 404);
    }
    if (team.leaderId !== studentId) {
      throw new AppError('FORBIDDEN', 'Only the team lead can invite members.', 403);
    }

    const student = await repo.findStudentByRollNoOnly(rollNo);
    if (!student) {
      throw new AppError('NOT_FOUND', 'Student not found', 404);
    }

    if (student.id === team.leaderId) {
      throw new AppError('SELF_INVITE', 'You are already the leader of this team.', 400);
    }

    const existing = await repo.findTeamInvitation(team.id, student.id);
    if (existing?.status === 'PENDING') {
      return { status: 200, invite: existing };
    }

    const invite = await repo.upsertTeamInvitationRecord(team.id, student.id);
    return { status: 201, invite };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[teamInvitations.service:inviteTeamMember] teamId=${teamId} studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function getTeamInvitations(studentId: string) {
  try {
    return await repo.findStudentPendingInvitations(studentId);
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[teamInvitations.service:getTeamInvitations] studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function acceptTeamInvitation(inviteId: string, studentId: string) {
  try {
    const student = await repo.findStudentStatus(studentId);
    if (!student || student.status !== 'ACTIVE') {
      throw new AppError('NOT_ACTIVE', 'Your account is no longer active for this activity.', 403);
    }

    const invite = await repo.findTeamInvitationById(inviteId, studentId);
    if (!invite) throw new AppError('NOT_FOUND', 'Invitation not found', 404);

    if (invite.status !== 'PENDING') {
      throw new AppError(
        'ALREADY_RESPONDED',
        invite.status === 'ACCEPTED'
          ? 'This invitation has already been accepted.'
          : 'This invitation is no longer pending.',
        409
      );
    }

    await repo.acceptTeamInvitationTransaction(invite.id, invite.teamId, invite.studentId);
    return { message: 'Accepted' };
  } catch (err: any) {
    if (err.code === 'P2002') {
      throw new AppError('ALREADY_MEMBER', 'You are already a member of this team.', 409);
    }
    if (err instanceof AppError) throw err;
    logger.error(`[teamInvitations.service:acceptTeamInvitation] inviteId=${inviteId} studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function declineTeamInvitation(inviteId: string, studentId: string) {
  try {
    const updated = await repo.declineTeamInvitationRecord(inviteId, studentId);
    if (updated.count === 0) {
      throw new AppError('NOT_FOUND', 'Not found', 404);
    }
    return { message: 'Declined' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[teamInvitations.service:declineTeamInvitation] inviteId=${inviteId} studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}
