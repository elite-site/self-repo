import { useState, useEffect } from 'react';
import { eventsApi } from '../api';
import { CampaignOption, CampaignResult } from '../types';

export const useVotingResults = () => {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  useEffect(() => {
    eventsApi.getVotingCampaigns().then((res) => {
      const list = res?.campaigns ?? [];
      setCampaigns(list);
      if (list.length > 0) setSelectedId(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setResult(null);
    eventsApi.getVotingResults(selectedId)
      .then((res) => setResult(res))
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleFinalize = async () => {
    if (!selectedId) return;
    setFinalizing(true);
    try {
      await eventsApi.finalizeVotingResults(selectedId);
      setShowFinalizeConfirm(false);
      setLoading(true);
      const res = await eventsApi.getVotingResults(selectedId);
      setResult(res ?? null);
    } catch {
      // noop
    } finally {
      setFinalizing(false);
      setLoading(false);
    }
  };

  return {
    campaigns,
    selectedId,
    setSelectedId,
    result,
    loading,
    finalizing,
    showFinalizeConfirm,
    setShowFinalizeConfirm,
    handleFinalize,
  };
};
