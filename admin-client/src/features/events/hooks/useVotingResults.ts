import { useState, useEffect, useRef } from 'react';
import { eventsApi } from '../api';
import { CampaignOption, CampaignResult } from '../types';

export const useVotingResults = () => {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState<boolean>(false);

  const initialFetchDone = useRef<boolean>(false);
  const previousSelectedId = useRef<string>('');

  // Initial load: keep isLoading true until campaign data list and the default or last active campaign profile are resolved
  useEffect(() => {
    let isCancelled = false;

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const res = await eventsApi.getVotingCampaigns();
        if (isCancelled) return;

        const list = res?.campaigns ?? [];
        setCampaigns(list);

        if (list.length > 0) {
          // Identify the last active campaign or default to the first campaign
          const activeCampaigns = list.filter((c) => c.status === 'ACTIVE');
          const defaultCampaign =
            activeCampaigns.length > 0
              ? activeCampaigns[activeCampaigns.length - 1]
              : list[0];

          setSelectedId(defaultCampaign.id);
          previousSelectedId.current = defaultCampaign.id;

          try {
            const resultsData = await eventsApi.getVotingResults(defaultCampaign.id);
            if (!isCancelled) {
              setResult(resultsData ?? null);
            }
          } catch (err) {
            console.warn('Could not load voting campaign results:', err);
            if (!isCancelled) {
              setResult(null);
            }
          }
        } else {
          setSelectedId('');
          setResult(null);
        }
      } catch (err) {
        // Non-fatal: the results view simply has no campaigns to select.
        console.warn('Could not load voting campaigns:', err);
        if (!isCancelled) {
          setCampaigns([]);
          setSelectedId('');
          setResult(null);
        }
      } finally {
        if (!isCancelled) {
          initialFetchDone.current = true;
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Subsequent campaign selection changes
  useEffect(() => {
    if (!initialFetchDone.current) return;
    if (!selectedId || selectedId === previousSelectedId.current) return;

    previousSelectedId.current = selectedId;
    let isCancelled = false;
    setIsLoading(true);

    eventsApi
      .getVotingResults(selectedId)
      .then((res) => {
        if (!isCancelled) setResult(res ?? null);
      })
      .catch((err) => {
        console.warn('Could not load voting campaign results:', err);
        if (!isCancelled) setResult(null);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedId]);

  const handleFinalize = async () => {
    if (!selectedId) return;
    setFinalizing(true);
    try {
      await eventsApi.finalizeVotingResults(selectedId);
      setShowFinalizeConfirm(false);
      setIsLoading(true);
      const res = await eventsApi.getVotingResults(selectedId);
      setResult(res ?? null);
    } catch (err) {
      // Non-fatal: the dialog stays open and the operator can retry finalizing.
      console.warn('Could not finalize voting results:', err);
    } finally {
      setFinalizing(false);
      setIsLoading(false);
    }
  };

  return {
    campaigns,
    selectedId,
    setSelectedId,
    result,
    isLoading,
    loading: isLoading,
    finalizing,
    showFinalizeConfirm,
    setShowFinalizeConfirm,
    handleFinalize,
  };
};
