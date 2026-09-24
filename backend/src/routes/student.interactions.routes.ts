import { Router, Request, Response } from 'express';
import { requireStudentAuth } from '../middleware/studentAuth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireStudentAuth);

// --- Voting ---

router.get('/voting', async (_req: Request, res: Response) => {
  try {
    const campaigns = await prisma.votingCampaign.findMany({
      where: { status: 'ACTIVE' },
      include: { candidates: true }
    });

    const allStudentIds = campaigns.flatMap(c => c.candidates.map(cand => cand.studentId));
    const students = await prisma.student.findMany({
      where: { id: { in: allStudentIds } },
      select: { id: true, name: true, rollNo: true, year: true, section: true }
    });
    const studentMap = new Map(students.map(s => [s.id, s]));

    const result = campaigns.map(c => ({
      ...c,
      candidates: c.candidates.map(cand => ({
        ...cand,
        student: studentMap.get(cand.studentId) || null
      }))
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/voting/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.votingCampaign.findUnique({
      where: { id: req.params.id },
      include: { candidates: true }
    });
    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND', message: 'Campaign not found' });

    const studentIds = campaign.candidates.map(c => c.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, rollNo: true, year: true, section: true }
    });
    const studentMap = new Map(students.map(s => [s.id, s]));

    res.json({
      ...campaign,
      candidates: campaign.candidates.map(cand => ({
        ...cand,
        student: studentMap.get(cand.studentId) || null
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/voting/:id/vote', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const campaignId = req.params.id;
    const { candidateId } = req.body;
    
    const campaign = await prisma.votingCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'INVALID_CAMPAIGN', message: 'Campaign not active' });
    }
    
    const existingVote = await prisma.vote.findFirst({
      where: { campaignId, voterId: studentId }
    });
    if (existingVote) {
      return res.status(400).json({ error: 'ALREADY_VOTED', message: 'You have already voted' });
    }
    
    const vote = await prisma.vote.create({
      data: {
        campaignId,
        voterId: studentId,
        candidateId
      }
    });
    res.status(201).json(vote);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Notifications ---

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const notifications = await prisma.notification.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications.map(n => ({
      ...n,
      isRead: n.status === 'READ'
    })));
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

// --- Registrations ---

router.get(['/registrations', '/registrations/all'], async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const registrations = await prisma.eventRegistration.findMany({
      where: { studentId },
      include: { event: true }
    });
    res.json(registrations.map(r => ({
      ...r,
      eventTitle: r.event.name,
      status: r.status === 'CONFIRMED' ? 'REGISTERED' : r.status,
      registeredAt: r.registeredAt
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/registrations/:id', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });
    if (!reg || reg.studentId !== studentId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
    }
    res.json({
      ...reg,
      eventTitle: reg.event.name,
      status: reg.status === 'CONFIRMED' ? 'REGISTERED' : reg.status,
      registeredAt: reg.registeredAt
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/registrations/:id/cancel', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const reg = await prisma.eventRegistration.updateMany({
      where: { id: req.params.id, studentId },
      data: { status: 'CANCELLED' }
    });
    if (reg.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.json({ message: 'Cancelled successfully' });
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
    res.json(teams);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/teams', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const { name, eventId } = req.body;
    const team = await prisma.team.create({
      data: {
        name,
        eventId,
        leaderId: studentId
      }
    });
    res.status(201).json(team);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/teams/:id/invite', async (req: Request, res: Response) => {
  try {
    const { rollNo } = req.body;
    const student = await prisma.student.findUnique({ where: { rollNo } });
    if (!student) return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
    
    const invite = await prisma.teamInvitation.create({
      data: {
        teamId: req.params.id,
        studentId: student.id,
        status: 'PENDING'
      }
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
    const studentId = (req as any).studentId || req.student?.studentId;
    const invite = await prisma.teamInvitation.findFirst({
      where: { id: req.params.id, studentId }
    });
    if (!invite) return res.status(404).json({ error: 'NOT_FOUND', message: 'Invitation not found' });
    
    await prisma.$transaction([
      prisma.teamInvitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' }
      }),
      prisma.teamMember.create({
        data: { teamId: invite.teamId, studentId: invite.studentId }
      })
    ]);
    res.json({ message: 'Accepted' });
  } catch (err: any) {
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
