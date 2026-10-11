import { Request, Response } from 'express';
import { httpError } from '../../middleware/apiError';
import { AppError } from '../../utils/appError';
import * as service from './voting.service';
import { validateRequiredId, validateVotePayload } from './voting.schemas';

function getStudentId(req: Request): string {
  const studentId = req.student?.studentId || (req as any).studentId;
  if (!studentId) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  return studentId;
}

// Admin controllers
export async function listAdminCampaigns(req: Request, res: Response) {
  try {
    const campaigns = await service.listAdminCampaigns();
    res.json(campaigns);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function createAdminCampaign(req: Request, res: Response) {
  try {
    const campaign = await service.createAdminCampaign(req.body);
    res.status(201).json(campaign);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function updateAdminCampaign(req: Request, res: Response) {
  try {
    const campaign = await service.updateAdminCampaign(req.params.id, req.body);
    res.json(campaign);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function getAdminCampaignResults(req: Request, res: Response) {
  try {
    const results = await service.getAdminCampaignResults(req.params.id);
    res.json(results);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
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
