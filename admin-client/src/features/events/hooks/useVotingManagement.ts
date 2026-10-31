import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '@/shared/ui';
import { eventsApi } from '../api';
import { VotingCampaign } from '../types';

export const useVotingManagement = () => {
  const confirm = useConfirm();
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
    const confirmed = await confirm({
      title: 'Activate Voting Campaign',
      description: 'Activate this voting campaign? Students will be able to vote immediately.',
      confirmLabel: 'Activate',
    });
    if (!confirmed) return;
    setActivating(id);
    try {
      await eventsApi.activateVotingCampaign(id);
      fetchCampaigns();
    } catch (err) {
      // Non-fatal: the list keeps its previous state and can be refreshed.
      console.warn('Could not activate voting campaign:', err);
    } finally {
      setActivating(null);
    }
  };

  const handleClose = async (id: string) => {
    const confirmed = await confirm({
      title: 'Close Voting Campaign',
      description: 'Close this campaign? No more votes will be accepted.',
      confirmLabel: 'Close Campaign',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await eventsApi.closeVotingCampaign(id);
      fetchCampaigns();
    } catch (err) {
      // Non-fatal: the list keeps its previous state and can be refreshed.
      console.warn('Could not close voting campaign:', err);
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
