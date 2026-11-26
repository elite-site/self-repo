import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api/index';
import { CampaignOption, CampaignResult } from '../types';
import { ADMIN_VOTING_CAMPAIGNS_QUERY_KEY } from './useVotingManagement';

export const getVotingResultsQueryKey = (campaignId: string) =>
  ['admin', 'voting-results', campaignId] as const;

export const useVotingResults = () => {
  const queryClient = useQueryClient();
  const [userSelectedId, setUserSelectedId] = useState<string>('');
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState<boolean>(false);

  const campaignsQuery = useQuery<CampaignOption[]>({
    queryKey: ADMIN_VOTING_CAMPAIGNS_QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await eventsApi.getVotingCampaigns();
        return res?.campaigns ?? [];
      } catch (err) {
        console.warn('Could not load voting campaigns:', err);
        return [];
      }
    },
  });

  const campaigns = campaignsQuery.data ?? [];

  const defaultId = useMemo(() => {
    if (campaigns.length === 0) return '';
    const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE');
    const chosen =
      activeCampaigns.length > 0
        ? activeCampaigns[activeCampaigns.length - 1]
        : campaigns[0];
    return chosen?.id ?? '';
  }, [campaigns]);

  const selectedId = userSelectedId || defaultId;

  const resultsQuery = useQuery<CampaignResult | null>({
    queryKey: getVotingResultsQueryKey(selectedId),
    queryFn: async () => {
      if (!selectedId) return null;
      try {
        const res = await eventsApi.getVotingResults(selectedId);
        return res ?? null;
      } catch (err) {
        console.warn('Could not load voting campaign results:', err);
        return null;
      }
    },
    enabled: Boolean(selectedId),
  });

  const isLoading =
    campaignsQuery.isPending || (Boolean(selectedId) && resultsQuery.isPending);

  const handleFinalize = async () => {
    if (!selectedId) return;
    setFinalizing(true);
    try {
      await eventsApi.finalizeVotingResults(selectedId);
      setShowFinalizeConfirm(false);
      await queryClient.invalidateQueries({
        queryKey: getVotingResultsQueryKey(selectedId),
      });
    } catch (err) {
      // Non-fatal: the dialog stays open and the operator can retry finalizing.
      console.warn('Could not finalize voting results:', err);
    } finally {
      setFinalizing(false);
    }
  };

  return {
    campaigns,
    selectedId,
    setSelectedId: setUserSelectedId,
    result: resultsQuery.data ?? null,
    isLoading,
    loading: isLoading,
    finalizing,
    showFinalizeConfirm,
    setShowFinalizeConfirm,
    handleFinalize,
  };
};
