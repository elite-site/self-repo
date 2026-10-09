import { Router, Request, Response } from 'express';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAdminAuth);

// ── Voting
router.get('/voting', async (_req: Request, res: Response) => {
  try {
    const campaigns = await prisma.votingCampaign.findMany({
      include: {
        event: true,
        _count: { select: { candidates: true, votes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      campaigns.map((c) => ({
        ...c,
        totalVotes: c._count.votes,
        candidateCount: c._count.candidates,
        eventTitle: c.event?.name,
      }))
    );
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/voting', async (req: Request, res: Response) => {
  try {
    const { title, description, rule, fixedCount, startsAt, endsAt, eventId } = req.body;
    const campaign = await prisma.votingCampaign.create({
      data: {
        title,
        description,
        rule: rule || 'ONE_TOTAL',
        fixedCount: fixedCount ? parseInt(String(fixedCount), 10) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        eventId: eventId || null,
        status: 'DRAFT',
      },
    });
    res.status(201).json(campaign);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.get('/voting/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.votingCampaign.findUnique({
      where: { id: req.params.id },
      include: {
        event: true,
        candidates: {
          include: {
            _count: { select: { votes: true } },
          },
        },
        _count: { select: { votes: true } },
      },
    });
    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND', message: 'Campaign not found' });
    res.json(campaign);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/voting/:id/activate', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.votingCampaign.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
    });
    res.json(campaign);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/voting/:id/close', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.votingCampaign.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' },
    });
    res.json(campaign);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/voting/:id/finalize', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.votingCampaign.update({
      where: { id: req.params.id },
      data: { status: 'FINALIZED', finalizedAt: new Date() },
    });
    res.json(campaign);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.get('/voting/:id/results', async (req: Request, res: Response) => {
  try {
    const [campaign, candidateVotes] = await Promise.all([
      prisma.votingCampaign.findUnique({
        where: { id: req.params.id },
        include: {
          candidates: true,
        },
      }),
      prisma.vote.groupBy({
        by: ['candidateId'],
        where: { campaignId: req.params.id },
        _count: { id: true },
      }),
    ]);

    if (!campaign) return res.status(404).json({ error: 'NOT_FOUND', message: 'Campaign not found' });

    const studentIds = campaign.candidates.map((c) => c.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, rollNo: true, year: true, section: true, status: true, graduatedAt: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const voteCountMap = new Map(candidateVotes.map((cv) => [cv.candidateId, cv._count.id]));
    const totalVotes = candidateVotes.reduce((acc, cv) => acc + cv._count.id, 0);

    const candidatesWithVotes = campaign.candidates.map((cand) => ({
      candidateId: cand.id,
      studentId: cand.studentId,
      student: studentMap.get(cand.studentId) || null,
      votes: voteCountMap.get(cand.id) || 0,
      percentage: totalVotes > 0 ? (((voteCountMap.get(cand.id) || 0) / totalVotes) * 100).toFixed(1) : '0',
    }));

    candidatesWithVotes.sort((a, b) => b.votes - a.votes);

    res.json({
      campaign,
      totalVotes,
      candidates: candidatesWithVotes,
    });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});


export default router;
