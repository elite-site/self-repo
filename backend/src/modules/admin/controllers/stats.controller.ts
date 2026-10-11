import { Request, Response } from 'express';
import { AppError } from '../../../utils/appError';
import * as adminService from '../admin.service';

export async function listVotingCampaigns(_req: Request, res: Response): Promise<void> {
  try {
    const campaigns = await adminService.listVotingCampaigns();
    res.json(campaigns);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function createVotingCampaign(req: Request, res: Response): Promise<void> {
  try {
    const campaign = await adminService.createVotingCampaign(req.body);
    res.status(201).json(campaign);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function getVotingCampaign(req: Request, res: Response): Promise<void> {
  try {
    const campaign = await adminService.getVotingCampaign(req.params.id);
    res.json(campaign);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updateVotingCampaign(req: Request, res: Response): Promise<void> {
  try {
    const campaign = await adminService.updateVotingCampaign(req.params.id, req.body);
    res.json(campaign);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function deleteVotingCampaign(req: Request, res: Response): Promise<void> {
  try {
    await adminService.deleteVotingCampaign(req.params.id);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function addVotingCandidate(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, projectId } = req.body;
    const candidate = await adminService.addVotingCandidate(req.params.id, studentId, projectId);
    res.status(201).json(candidate);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function removeVotingCandidate(req: Request, res: Response): Promise<void> {
  try {
    await adminService.removeVotingCandidate(req.params.candidateId);
    res.json({ success: true, message: 'Candidate removed' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const eventId = ((req.query.eventId as string) || adminService.ACTIVE_EVENT_ID).trim();
    const { data, cached } = await adminService.getAdminStats(eventId);

    if (cached) {
      res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
    }
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_STATS', message: err.message || 'Server error' });
  }
}

export async function getPortalAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const analytics = await adminService.getPortalAnalytics();
    res.json(analytics);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}
