import { Request, Response } from 'express';
import { UnauthorizedError } from '../../utils/appError';
import * as service from './voting.service';
import { validateRequiredId, validateVotePayload } from './voting.schemas';

function getStudentId(req: Request): string {
  const studentId = req.student?.studentId || (req as any).studentId;
  if (!studentId) {
    throw new UnauthorizedError('Authentication required');
  }
  return studentId;
}

// Admin controllers
export async function listAdminCampaigns(_req: Request, res: Response): Promise<void> {
  const campaigns = await service.listAdminCampaigns();
  res.json(campaigns);
}

export async function createAdminCampaign(req: Request, res: Response): Promise<void> {
  const campaign = await service.createAdminCampaign(req.body);
  res.status(201).json(campaign);
}

export async function updateAdminCampaign(req: Request, res: Response): Promise<void> {
  const campaign = await service.updateAdminCampaign(req.params.id, req.body);
  res.json(campaign);
}

export async function getAdminCampaignResults(req: Request, res: Response): Promise<void> {
  const results = await service.getAdminCampaignResults(req.params.id);
  res.json(results);
}

// Student controllers
export async function getVotingCampaigns(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const result = await service.getVotingCampaigns(studentId);
  res.json(result);
}

export async function getVotingCampaignById(req: Request, res: Response): Promise<void> {
  const studentId = (req as any).studentId || req.student?.studentId;
  const id = validateRequiredId(req.params.id, 'Campaign ID');
  const result = await service.getVotingCampaignById(id, studentId);
  res.json(result);
}

export async function postVote(req: Request, res: Response): Promise<void> {
  const studentId = getStudentId(req);
  const { campaignId, candidateId } = validateVotePayload(req.params.id, req.body);
  const vote = await service.castVote(campaignId, candidateId, studentId);
  res.status(201).json(vote);
}
