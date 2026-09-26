import { Router, Request, Response } from 'express';
import { requireStudentAuth } from '../middleware/studentAuth';
import { prisma } from '../lib/prisma';
import { ActivityService } from '../services/activity.service';

const router = Router();
router.use(requireStudentAuth);

// --- Voting ---

router.get('/voting', async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const campaigns = await prisma.votingCampaign.findMany({
      where: { status: { in: ['ACTIVE', 'SCHEDULED'] } },
      include: {
        candidates: true,
        event: true,
        votes: {
          where: { voterId: studentId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    const allStudentIds = campaigns.flatMap(c => c.candidates.map(cand => (cand as any).studentId));
    const students = await prisma.student.findMany({
      where: { id: { in: allStudentIds } },
      select: { id: true, name: true, rollNo: true, year: true, section: true }
    });
    const studentMap = new Map(students.map(s => [s.id, s]));

    const now = new Date();
    const result = campaigns.map(c => {
      const startsAt = c.startsAt ? new Date(c.startsAt) : null;
      const endsAt = c.endsAt ? new Date(c.endsAt) : null;
      const notStarted = c.status === 'SCHEDULED' || Boolean(startsAt && startsAt > now);
      const isClosed = c.status === 'CLOSED' || c.status === 'FINALIZED' || Boolean(endsAt && endsAt < now);
      const hasVoted = Boolean((c as any).votes && (c as any).votes.length > 0);

      let computedStatus = 'ACTIVE';
      let statusMessage = 'Voting Active';
      if (notStarted) {
        computedStatus = 'NOT_STARTED';
        statusMessage = 'Voting has not started yet';
      } else if (isClosed) {
        computedStatus = 'CLOSED';
        statusMessage = 'Voting has closed';
      }

      const { votes, ...rest } = c as any;
      return {
        ...rest,
        computedStatus,
        statusMessage,
        hasVoted,
        candidates: c.candidates.map(cand => ({
          ...cand,
          student: studentMap.get((cand as any).studentId) || null
        }))
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/voting/:id', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const includeQuery: any = { candidates: true, event: true };
    if (studentId) {
      includeQuery.votes = { where: { voterId: studentId }, select: { id: true } };
    }

    const campaign = await prisma.votingCampaign.findUnique({
      where: { id: req.params.id },
      include: includeQuery
    });
    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND', message: 'Campaign not found' });

    // Prisma's conditional include produces a broad relation union when the
    // include query is assembled dynamically. The candidates relation is
    // always VotingCandidate records; keep the mapping explicit for the
    // generated client types.
    const candidates = campaign.candidates as any[];
    const studentIds = candidates.map(c => c.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, rollNo: true, year: true, section: true }
    });
    const studentMap = new Map(students.map(s => [s.id, s]));

    const now = new Date();
    const startsAt = campaign.startsAt ? new Date(campaign.startsAt) : null;
    const endsAt = campaign.endsAt ? new Date(campaign.endsAt) : null;
    const notStarted = campaign.status === 'SCHEDULED' || Boolean(startsAt && startsAt > now);
    const isClosed = campaign.status === 'CLOSED' || campaign.status === 'FINALIZED' || Boolean(endsAt && endsAt < now);
    const hasVoted = Boolean((campaign as any).votes && (campaign as any).votes.length > 0);

    let computedStatus = 'ACTIVE';
    let statusMessage = 'Voting Active';
    if (notStarted) {
      computedStatus = 'NOT_STARTED';
      statusMessage = 'Voting has not started yet';
    } else if (isClosed) {
      computedStatus = 'CLOSED';
      statusMessage = 'Voting has closed';
    }

    const { votes, ...rest } = campaign as any;
    res.json({
      ...rest,
      computedStatus,
      statusMessage,
      hasVoted,
      candidates: candidates.map(cand => ({
        ...cand,
        student: studentMap.get((cand as any).studentId) || null
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post(['/voting/:id/vote', '/voting/vote'], async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { status: true } });
    if (!student || student.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'NOT_ACTIVE', message: 'Your account is no longer active for this activity.' });
    }
    const campaignId = req.params.id || req.body.campaignId;
    const { candidateId } = req.body;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'INVALID_CAMPAIGN', message: 'Campaign ID is required' });
    }

    const campaign = await prisma.votingCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Campaign not found' });
    }

    const now = new Date();
    const startsAt = campaign.startsAt ? new Date(campaign.startsAt) : null;
    if (campaign.status === 'SCHEDULED' || Boolean(startsAt && startsAt > now)) {
      return res.status(400).json({ error: 'VOTING_NOT_STARTED', message: 'Voting has not started yet' });
    }

    const endsAt = campaign.endsAt ? new Date(campaign.endsAt) : null;
    if (campaign.status === 'CLOSED' || campaign.status === 'FINALIZED' || Boolean(endsAt && endsAt < now)) {
      return res.status(400).json({ error: 'VOTING_CLOSED', message: 'Voting has closed' });
    }

    if (campaign.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'INVALID_CAMPAIGN', message: 'Campaign not active' });
    }

    const runVote = async (tx: any) => {
      const existingVote = await tx.vote.findFirst({
        where: { campaignId, voterId: studentId }
      });
      if (existingVote) {
        const err: any = new Error('ALREADY_VOTED');
        err.code = 'ALREADY_VOTED';
        throw err;
      }
      
      return await tx.vote.create({
        data: {
          campaignId,
          voterId: studentId,
          candidateId
        }
      });
    };

    let vote;
    if (typeof prisma.$transaction === 'function') {
      const txResult = await prisma.$transaction(async (tx) => runVote(tx));
      vote = txResult !== undefined ? txResult : await runVote(prisma);
    } else {
      vote = await runVote(prisma);
    }

    res.status(201).json(vote);
  } catch (err: any) {
    if (
      err?.code === 'ALREADY_VOTED' ||
      err?.message === 'ALREADY_VOTED' ||
      err?.code === 'P2002' ||
      err?.message?.includes('Unique constraint') ||
      err?.message?.includes('P2002') ||
      err?.message?.includes('ALREADY_VOTED')
    ) {
      return res.status(400).json({ error: 'ALREADY_VOTED', message: 'You have already voted' });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Notifications ---

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;

    const rawLimit = parseInt(String(req.query.limit), 10);
    const rawOffset = parseInt(String(req.query.offset), 10);
    const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 20 : Math.min(rawLimit, 50);
    const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.notification.count({ where: { studentId } }),
      prisma.notification.count({ where: { studentId, status: 'UNREAD' } })
    ]);

    const items = notifications.map(n => ({
      ...n,
      isRead: n.status === 'READ'
    }));
    res.json({
      items,
      total,
      unreadCount,
      hasMore: offset + items.length < total
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

const handleReadAll = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    await prisma.notification.updateMany({
      where: { studentId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() }
    });
    res.json({ message: 'All marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
};

router.post('/notifications/read-all', handleReadAll);
router.patch('/notifications/read-all', handleReadAll);

router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const updated = await prisma.notification.updateMany({
      where: { id: req.params.id, studentId },
      data: { status: 'READ', readAt: new Date() }
    });
    if (updated.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.json({ message: 'Marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Announcements ---

router.get('/announcements/:id', async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const announcement = await prisma.announcement.findFirst({
      where: {
        id: req.params.id,
        status: 'PUBLISHED',
      },
    });

    if (!announcement) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found' });
    }

    // Do not expose a targeted announcement to a student outside its audience.
    if (
      !announcement.targetAll &&
      (announcement.targetYear !== null || announcement.targetSection !== null)
    ) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { year: true, section: true },
      });

      const yearMatches = announcement.targetYear === null || student?.year === announcement.targetYear;
      const sectionMatches =
        announcement.targetSection === null || student?.section === announcement.targetSection;

      if (!student || !yearMatches || !sectionMatches) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found' });
      }
    }

    res.json({
      ...announcement,
      body: announcement.message,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Registrations ---

router.get(['/registrations', '/registrations/all'], async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const registrations = await prisma.eventRegistration.findMany({
      where: { studentId },
      include: {
        event: true,
        student: true,
        team: true,
        answers: { include: { field: true } }
      },
      orderBy: { registeredAt: 'desc' }
    });
    res.json(registrations.map(r => ({
      ...r,
      eventTitle: r.event?.name || '',
      status: r.status,
      registeredAt: r.registeredAt
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/registrations/:id', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const reg = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: {
        event: true,
        student: true,
        team: true,
        answers: { include: { field: true } }
      }
    });
    if (!reg || reg.studentId !== studentId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
    }
    res.json({
      ...reg,
      eventTitle: reg.event?.name || '',
      status: reg.status,
      registeredAt: reg.registeredAt
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/registrations/:id/cancel', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const existing = await prisma.eventRegistration.findFirst({
      where: { id: req.params.id, studentId },
      include: { event: true, student: true }
    });
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });

    const updated = await prisma.eventRegistration.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED' }
    });

    await ActivityService.log({
      eventId: existing.eventId,
      category: 'APPLICATION',
      action: `Student cancelled registration for ${existing.event?.name || 'event'}`,
      details: `Student ${existing.student?.name || studentId} cancelled registration`,
      applicantName: existing.student?.name || undefined,
      userEmail: existing.student?.email || undefined,
      status: 'INFO'
    });

    res.json({ message: 'Cancelled successfully', registration: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Teams ---

router.get('/teams', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { leaderId: studentId },
          { members: { some: { studentId } } }
        ]
      },
      include: { members: { include: { student: true } }, event: true }
    });
    // `isLeader` is derived here rather than in the client so the permission
    // model lives in one place: only the lead can invite or dissolve a team.
    res.json(teams.map((t) => ({ ...t, isLeader: t.leaderId === studentId })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/teams', async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { status: true } });
    if (!student || student.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'NOT_ACTIVE', message: 'Your account is no longer active for this activity.' });
    }

    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Team name is required' });
    }

    let eventId = (req.body?.eventId || req.query?.eventId)?.toString()?.trim();

    if (!eventId) {
      const activeEvent = await prisma.event.findFirst({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' }
      });
      if (!activeEvent) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'No active event available to create a team for.'
        });
      }
      eventId = activeEvent.id;
    } else {
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId }
      });
      if (!existingEvent) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Event not found'
        });
      }
    }

    if (!eventId) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'No active event available to create a team for.'
      });
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        eventId,
        leaderId: studentId,
        members: {
          create: {
            studentId
          }
        }
      },
      include: {
        event: true,
        members: { include: { student: true } }
      }
    });
    return res.status(201).json(team);
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// DELETE /api/student/teams/:id — dissolve a team. Only the team lead may do
// this; an admin dissolving someone's team is a separate, audited action.
// Registrations that referenced the team keep the student registered for the
// event, they just lose the team affiliation, so EventRegistration.teamId is
// cleared before the row goes away (it is a nullable FK).
router.delete('/teams/:id', async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { studentId: true } } },
    });
    if (!team) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found' });
    }
    if (team.leaderId !== studentId) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only the team lead can remove this team.',
      });
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

    res.json({
      success: true,
      message: `Team "${team.name}" has been removed.`,
      removedMembers: team.members.length,
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found' });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/teams/:id/invite', async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found' });
    }
    if (team.leaderId !== studentId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only the team lead can invite members.' });
    }

    const { rollNo } = req.body;
    if (typeof rollNo !== 'string' || !rollNo.trim()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Roll number is required' });
    }

    const student = await prisma.student.findUnique({ where: { rollNo: rollNo.trim() } });
    if (!student) return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });

    // The leader is created as a member together with the team, so inviting
    // yourself produced an invitation that could never be accepted: accepting it
    // re-inserted the same (teamId, studentId) pair and violated the
    // @@unique([teamId, studentId]) constraint on TeamMember.
    if (student.id === team.leaderId) {
      return res.status(400).json({
        error: 'SELF_INVITE',
        message: 'You are already the leader of this team.',
      });
    }

    // Reuse a pending invitation rather than tripping the same unique constraint
    // on TeamInvitation, which surfaced as a bare 500.
    const existing = await prisma.teamInvitation.findUnique({
      where: { teamId_studentId: { teamId: team.id, studentId: student.id } },
    });
    if (existing?.status === 'PENDING') {
      return res.status(200).json(existing);
    }

    const invite = await prisma.teamInvitation.upsert({
      where: { teamId_studentId: { teamId: team.id, studentId: student.id } },
      update: { status: 'PENDING', declineNote: null, respondedAt: null, invitedAt: new Date() },
      create: { teamId: team.id, studentId: student.id, status: 'PENDING' },
    });
    res.status(201).json(invite);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/team-invitations', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const invitations = await prisma.teamInvitation.findMany({
      where: { studentId, status: 'PENDING' },
      include: { team: true }
    });
    res.json(invitations);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/team-invitations/:id/accept', async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { status: true } });
    if (!student || student.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'NOT_ACTIVE', message: 'Your account is no longer active for this activity.' });
    }
    const invite = await prisma.teamInvitation.findFirst({
      where: { id: req.params.id, studentId },
    });
    if (!invite) return res.status(404).json({ error: 'NOT_FOUND', message: 'Invitation not found' });

    // Only a pending invitation can be accepted. Previously a declined (or
    // already accepted) invitation could be replayed, which re-ran the member
    // insert and failed on the unique constraint.
    if (invite.status !== 'PENDING') {
      return res.status(409).json({
        error: 'ALREADY_RESPONDED',
        message:
          invite.status === 'ACCEPTED'
            ? 'This invitation has already been accepted.'
            : 'This invitation is no longer pending.',
      });
    }

    // The leader is already a member of the team they created, and a member can
    // be invited to a second team they already belong to. `upsert` makes the
    // join idempotent so a duplicate membership can no longer abort the whole
    // transaction and leave the invitation stuck as PENDING.
    await prisma.$transaction([
      prisma.teamInvitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() }
      }),
      prisma.teamMember.upsert({
        where: { teamId_studentId: { teamId: invite.teamId, studentId: invite.studentId } },
        update: {},
        create: { teamId: invite.teamId, studentId: invite.studentId },
      }),
    ]);
    res.json({ message: 'Accepted' });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'ALREADY_MEMBER', message: 'You are already a member of this team.' });
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/team-invitations/:id/decline', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const updated = await prisma.teamInvitation.updateMany({
      where: { id: req.params.id, studentId },
      data: { status: 'DECLINED' }
    });
    if (updated.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.json({ message: 'Declined' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
