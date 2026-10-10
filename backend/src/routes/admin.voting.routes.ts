import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { httpError } from '../middleware/apiError';
import { requireAdminAuth } from '../middleware/auth';

const router = Router();
router.use(requireAdminAuth);

router.get('/voting', async (req, res) => {
  try {
    const campaigns = await prisma.votingCampaign.findMany();
    res.json(campaigns);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/voting', async (req, res) => {
  try {
    const { title, description, votingStart, votingEnd, startDate, endDate, eventId } = req.body;
    const campaign = await prisma.votingCampaign.create({
      data: {
        title,
        description,
        startsAt: votingStart || startDate ? new Date(votingStart || startDate) : null,
        endsAt: votingEnd || endDate ? new Date(votingEnd || endDate) : null,
        eventId: eventId || null,
        status: 'DRAFT'
      }
    });
    res.status(201).json(campaign);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/voting/:id', async (req, res) => {
  try {
    const { status, title, description } = req.body;
    const campaign = await prisma.votingCampaign.update({
      where: { id: req.params.id },
      data: { status, title, description }
    });
    res.json(campaign);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/voting/:id/results', async (req, res) => {
  try {
    const votes = await prisma.vote.groupBy({
      by: ['candidateId'],
      where: { campaignId: req.params.id },
      _count: { id: true }
    });
    res.json(votes);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});


export default router;
