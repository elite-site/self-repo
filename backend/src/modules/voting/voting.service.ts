import { AppError } from '../../utils/appError';
import * as repo from './voting.repository';
import type {
  CreateVotingCampaignInput,
  UpdateVotingCampaignInput,
} from './voting.types';

function formatCampaign(c: any, studentMap: Map<string, any>) {
  const now = new Date();
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
  const candidates = (c.candidates || []) as any[];
  return {
    ...rest,
    computedStatus,
    statusMessage,
    hasVoted,
    candidates: candidates.map((cand) => ({
      ...cand,
      student: studentMap.get(cand.studentId) || null,
    })),
  };
}

export async function listAdminCampaigns() {
  return repo.findAllCampaigns();
}

export async function createAdminCampaign(input: any) {
  const { title, description, votingStart, votingEnd, startDate, endDate, eventId } = input || {};
  return repo.createCampaignRecord({
    title,
    description,
    startsAt: votingStart || startDate ? new Date(votingStart || startDate) : null,
    endsAt: votingEnd || endDate ? new Date(votingEnd || endDate) : null,
    eventId: eventId || null,
    status: 'DRAFT',
  });
}

export async function updateAdminCampaign(id: string, input: any) {
  const { status, title, description } = input || {};
  return repo.updateCampaignRecord(id, { status, title, description });
}

export async function getAdminCampaignResults(id: string) {
  return repo.getCampaignVoteResults(id);
}

export async function getVotingCampaigns(studentId: string) {
  try {
    const campaigns = await repo.findActiveCampaignsForStudent(studentId);
    const allStudentIds = campaigns.flatMap((c) => c.candidates.map((cand) => (cand as any).studentId));
    const students = await repo.findStudentsByIds(allStudentIds);
    const studentMap = new Map(students.map((s) => [s.id, s]));

    return campaigns.map((c) => formatCampaign(c, studentMap));
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[voting.service:getVotingCampaigns] studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function getVotingCampaignById(campaignId: string, studentId?: string) {
  try {
    const campaign = await repo.findCampaignByIdWithDetails(campaignId, studentId);
    if (!campaign) throw new AppError('NOT_FOUND', 'Campaign not found', 404);

    const candidates = campaign.candidates as any[];
    const studentIds = candidates.map((c) => c.studentId);
    const students = await repo.findStudentsByIds(studentIds);
    const studentMap = new Map(students.map((s) => [s.id, s]));

    return formatCampaign(campaign, studentMap);
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[voting.service:getVotingCampaignById] id=${campaignId} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function castVote(campaignId: string, candidateId: string | undefined, studentId: string) {
  try {
    const student = await repo.findStudentStatusById(studentId);
    if (!student || student.status !== 'ACTIVE') {
      throw new AppError('NOT_ACTIVE', 'Your account is no longer active for this activity.', 403);
    }

    const campaign = await repo.findCampaignById(campaignId);
    if (!campaign) {
      throw new AppError('NOT_FOUND', 'Campaign not found', 404);
    }

    const now = new Date();
    const startsAt = campaign.startsAt ? new Date(campaign.startsAt) : null;
    if (campaign.status === 'SCHEDULED' || Boolean(startsAt && startsAt > now)) {
      throw new AppError('VOTING_NOT_STARTED', 'Voting has not started yet', 400);
    }

    const endsAt = campaign.endsAt ? new Date(campaign.endsAt) : null;
    if (campaign.status === 'CLOSED' || campaign.status === 'FINALIZED' || Boolean(endsAt && endsAt < now)) {
      throw new AppError('VOTING_CLOSED', 'Voting has closed', 400);
    }

    if (campaign.status !== 'ACTIVE') {
      throw new AppError('INVALID_CAMPAIGN', 'Campaign not active', 400);
    }

    return await repo.executeVoteTransaction(campaignId, candidateId, studentId);
  } catch (err: any) {
    if (
      err?.code === 'ALREADY_VOTED' ||
      err?.message === 'ALREADY_VOTED' ||
      err?.code === 'P2002' ||
      err?.message?.includes('Unique constraint') ||
      err?.message?.includes('P2002') ||
      err?.message?.includes('ALREADY_VOTED')
    ) {
      throw new AppError('ALREADY_VOTED', 'You have already voted', 400);
    }
    if (err instanceof AppError) throw err;
    console.error(`[voting.service:castVote] campaignId=${campaignId} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}
