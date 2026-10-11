import { AppError } from '../../../utils/appError';
import { TtlCache } from '../../../utils/ttlCache';
import * as adminRepo from '../admin.repository';
import type {
  CreateVotingCampaignInput,
  UpdateVotingCampaignInput,
} from '../admin.types';

const adminStatsCache = new TtlCache<any>(15_000, 10);

export async function listVotingCampaigns() {
  const campaigns = await adminRepo.findVotingCampaigns();
  return campaigns.map((c) => ({
    ...c,
    totalVotes: c._count.votes,
    candidateCount: c._count.candidates,
    eventTitle: c.event?.name,
  }));
}

export async function createVotingCampaign(data: CreateVotingCampaignInput) {
  return adminRepo.createVotingCampaign({
    title: data.title,
    description: data.description,
    rule: data.rule || 'ONE_TOTAL',
    fixedCount: data.fixedCount ? parseInt(String(data.fixedCount), 10) : null,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    eventId: data.eventId || null,
    status: 'DRAFT',
  });
}

export async function getVotingCampaign(id: string) {
  const campaign = await adminRepo.findVotingCampaignById(id);
  if (!campaign) throw new AppError('NOT_FOUND', 'Campaign not found', 404);
  return {
    ...campaign,
    totalVotes: campaign._count.votes,
    eventTitle: campaign.event?.name,
    candidates: (campaign.candidates || []).map((cand: any) => ({
      ...cand,
      voteCount: cand._count?.votes || 0,
    })),
  };
}

export async function updateVotingCampaign(id: string, data: UpdateVotingCampaignInput) {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.rule !== undefined) updateData.rule = data.rule;
  if (data.fixedCount !== undefined) updateData.fixedCount = data.fixedCount ? parseInt(String(data.fixedCount), 10) : null;
  if (data.startsAt !== undefined) updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
  if (data.endsAt !== undefined) updateData.endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (data.status !== undefined) updateData.status = data.status;

  return adminRepo.updateVotingCampaign(id, updateData);
}

export async function deleteVotingCampaign(id: string) {
  return adminRepo.deleteVotingCampaign(id);
}

export async function addVotingCandidate(campaignId: string, studentId?: string, projectId?: string) {
  return adminRepo.createVotingCandidate({
    campaignId,
    studentId: studentId || null,
    projectId: projectId || null,
  });
}

export async function removeVotingCandidate(candidateId: string) {
  return adminRepo.deleteVotingCandidate(candidateId);
}

export async function getAdminStats(eventId: string) {
  const cached = adminStatsCache.get(eventId);
  if (cached) return { data: cached, cached: true };

  const data = await adminRepo.getAdminStatsCounts(eventId);
  adminStatsCache.set(eventId, data);
  return { data, cached: false };
}

export async function getPortalAnalytics() {
  return adminRepo.getAnalyticsCounts();
}
