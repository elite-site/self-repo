import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { votingApi } from '../api';
import { VotingCampaign } from '../types';

export const votingKeys = {
  all: ['voting'] as const,
  campaigns: () => [...votingKeys.all, 'campaigns'] as const,
};

export function useVoting(initialCampaignId?: string) {
  const queryClient = useQueryClient();

  const [activeCampaign, setActiveCampaign] = useState<VotingCampaign | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const deepLinkHandled = useRef(false);

  const { data, isPending, isError, refetch } = useQuery<VotingCampaign[]>({
    queryKey: votingKeys.campaigns(),
    queryFn: async () => {
      const res = await votingApi.getVotingCampaigns();
      return Array.isArray(res) ? res : [];
    },
    staleTime: 60_000,
  });

  const campaigns = data ?? [];
  const loading = isPending && !data;

  const loadCampaigns = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (!initialCampaignId || loading || deepLinkHandled.current) return;
    const match = campaigns.find((c) => c.id === initialCampaignId);
    if (!match) return;
    deepLinkHandled.current = true;
    setActiveCampaign(match);
    setSelectedCandidateId(null);
    setVoteSuccess(false);
    setVoteError(null);
  }, [initialCampaignId, campaigns, loading]);

  const handleOpenVote = (campaign: VotingCampaign) => {
    deepLinkHandled.current = true;
    setActiveCampaign(campaign);
    setSelectedCandidateId(null);
    setVoteSuccess(false);
    setVoteError(null);
  };

  const handleCloseVote = () => {
    if (!submittingVote) {
      setActiveCampaign(null);
    }
  };

  const handleCastVote = async () => {
    if (!activeCampaign || !selectedCandidateId) return;
    setSubmittingVote(true);
    setVoteError(null);

    try {
      await votingApi.castVote(activeCampaign.id, selectedCandidateId);
      setVoteSuccess(true);
      setTimeout(() => {
        setActiveCampaign(null);
        void queryClient.invalidateQueries({ queryKey: votingKeys.campaigns() });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }, 1500);
    } catch (err: any) {
      setVoteError(err.response?.data?.message || 'Failed to submit vote. You may have already voted.');
    } finally {
      setSubmittingVote(false);
    }
  };

  return {
    campaigns,
    loading,
    error: isError && !data ? 'Could not load active voting campaigns.' : null,
    activeCampaign,
    selectedCandidateId,
    setSelectedCandidateId,
    submittingVote,
    voteSuccess,
    voteError,
    loadCampaigns,
    handleOpenVote,
    handleCloseVote,
    handleCastVote,
  };
}
