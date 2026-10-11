import { useState, useEffect, useRef, useCallback } from 'react';
import { votingApi } from '../api';
import { VotingCampaign } from '../types';

export function useVoting(initialCampaignId?: string) {
  const [campaigns, setCampaigns] = useState<VotingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCampaign, setActiveCampaign] = useState<VotingCampaign | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const deepLinkHandled = useRef(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await votingApi.getVotingCampaigns();
      if (Array.isArray(data)) setCampaigns(data);
    } catch {
      setError('Could not load active voting campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

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
        loadCampaigns();
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
    error,
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
