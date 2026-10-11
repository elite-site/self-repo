import { client } from '@/shared/api/client';
import { VotingCampaign } from '../types';

export const votingApi = {
  async getVotingCampaigns(): Promise<VotingCampaign[]> {
    const res = await client.get('/student/voting');
    return res.data;
  },

  async castVote(campaignId: string, candidateId: string): Promise<{ success: boolean; message?: string }> {
    const res = await client.post(`/student/voting/${campaignId}/vote`, { candidateId });
    return res.data;
  },
};
