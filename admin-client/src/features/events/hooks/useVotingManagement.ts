import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../api';
import { VotingCampaign } from '../types';

export const useVotingManagement = () => {
  const [campaigns, setCampaigns] = useState<VotingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventsApi.getVotingCampaigns();
      setCampaigns(res.campaigns || []);
    } catch {
      setError('Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleActivate = async (id: string) => {
    if (!window.confirm('Activate this voting campaign? Students will be able to vote immediately.')) return;
    setActivating(id);
    try {
      await eventsApi.activateVotingCampaign(id);
      fetchCampaigns();
    } catch {
      // noop
    } finally {
      setActivating(null);
    }
  };

  const handleClose = async (id: string) => {
    if (!window.confirm('Close this campaign? No more votes will be accepted.')) return;
    try {
      await eventsApi.closeVotingCampaign(id);
      fetchCampaigns();
    } catch {
      // noop
    }
  };

  return {
    campaigns,
    loading,
    error,
    showCreate,
    setShowCreate,
    activating,
    fetchCampaigns,
    handleActivate,
    handleClose,
  };
};
