import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

export async function inviteTeamMember(teamId: string, studentId: string, rollNo: string) {
  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new AppError('NOT_FOUND', 'Team not found', 404);
    }
    if (team.leaderId !== studentId) {
      throw new AppError('FORBIDDEN', 'Only the team lead can invite members.', 403);
    }

    const student = await prisma.student.findUnique({ where: { rollNo } });
    if (!student) {
      throw new AppError('NOT_FOUND', 'Student not found', 404);
    }

    if (student.id === team.leaderId) {
      throw new AppError('SELF_INVITE', 'You are already the leader of this team.', 400);
    }

    const existing = await prisma.teamInvitation.findUnique({
      where: { teamId_studentId: { teamId: team.id, studentId: student.id } },
    });
    if (existing?.status === 'PENDING') {
      return { status: 200, invite: existing };
    }

    const invite = await prisma.teamInvitation.upsert({
      where: { teamId_studentId: { teamId: team.id, studentId: student.id } },
      update: { status: 'PENDING', declineNote: null, respondedAt: null, invitedAt: new Date() },
      create: { teamId: team.id, studentId: student.id, status: 'PENDING' },
    });
    return { status: 201, invite };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[teamInvitations.service:inviteTeamMember] teamId=${teamId} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function getTeamInvitations(studentId: string) {
  try {
    return await prisma.teamInvitation.findMany({
      where: { studentId, status: 'PENDING' },
      include: { team: true },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[teamInvitations.service:getTeamInvitations] studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function acceptTeamInvitation(inviteId: string, studentId: string) {
  try {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { status: true } });
    if (!student || student.status !== 'ACTIVE') {
      throw new AppError('NOT_ACTIVE', 'Your account is no longer active for this activity.', 403);
    }

    const invite = await prisma.teamInvitation.findFirst({
      where: { id: inviteId, studentId },
    });
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

    await prisma.$transaction([
      prisma.teamInvitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      }),
      prisma.teamMember.upsert({
        where: { teamId_studentId: { teamId: invite.teamId, studentId: invite.studentId } },
        update: {},
        create: { teamId: invite.teamId, studentId: invite.studentId },
      }),
    ]);
    return { message: 'Accepted' };
  } catch (err: any) {
    if (err.code === 'P2002') {
      throw new AppError('ALREADY_MEMBER', 'You are already a member of this team.', 409);
    }
    if (err instanceof AppError) throw err;
    console.error(`[teamInvitations.service:acceptTeamInvitation] inviteId=${inviteId} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function declineTeamInvitation(inviteId: string, studentId: string) {
  try {
    const updated = await prisma.teamInvitation.updateMany({
      where: { id: inviteId, studentId },
      data: { status: 'DECLINED' },
    });
    if (updated.count === 0) {
      throw new AppError('NOT_FOUND', 'Not found', 404);
    }
    return { message: 'Declined' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[teamInvitations.service:declineTeamInvitation] inviteId=${inviteId} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}
