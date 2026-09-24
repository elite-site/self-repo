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

    // Populate candidate student info
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
    const studentId = (req as any).studentId;
    const campaignId = req.params.id;
    const { candidateId } = req.body;
    
    // Check campaign active
    const campaign = await prisma.votingCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'INVALID_CAMPAIGN', message: 'Campaign not active' });
    }
    
    // Check if already voted
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
    const notifications = await prisma.notification.findMany({
      where: { studentId: (req as any).studentId },
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

router.post('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { studentId: (req as any).studentId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() }
    });
    res.json({ message: 'All marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const updated = await prisma.notification.updateMany({
      where: { id: req.params.id, studentId: (req as any).studentId },
      data: { status: 'READ', readAt: new Date() }
    });
    if (updated.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.json({ message: 'Marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
