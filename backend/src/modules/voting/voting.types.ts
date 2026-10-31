export interface CreateVotingCampaignInput {
  title: string;
  description?: string | null;
  votingStart?: string | Date | null;
  votingEnd?: string | Date | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  eventId?: string | null;
}

export interface UpdateVotingCampaignInput {
  status?: string;
  title?: string;
  description?: string | null;
}
