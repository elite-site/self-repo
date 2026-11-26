import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConfirm } from '@/shared/ui';
import { eventsApi } from '../api/index';
import { VotingCampaign } from '../types';

export const ADMIN_VOTING_CAMPAIGNS_QUERY_KEY = ['admin', 'voting-campaigns'] as const;

export const useVotingManagement = () => {
  const confirm = useConfirm();
  const [showCreate, setShowCreate] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const query = useQuery<VotingCampaign[]>({
    queryKey: ADMIN_VOTING_CAMPAIGNS_QUERY_KEY,
    queryFn: async () => {
      const res = await eventsApi.getVotingCampaigns();
      return res.campaigns || [];
    },
  });

  const fetchCampaigns = useCallback(async () => {
    await query.refetch();
  }, [query]);

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
      void query.refetch();
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
      void query.refetch();
    } catch (err) {
      // Non-fatal: the list keeps its previous state and can be refreshed.
      console.warn('Could not close voting campaign:', err);
    }
  };

  return {
    campaigns: query.data ?? [],
    loading: query.isPending,
    error: query.isError ? 'Failed to load campaigns.' : null,
    showCreate,
    setShowCreate,
    activating,
    fetchCampaigns,
    handleActivate,
    handleClose,
  };
};
