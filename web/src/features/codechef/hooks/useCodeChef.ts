import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codechefApi } from '../api';
import type { CodeChefStatus, CodeChefDetails } from '../types';

export const CODECHEF_QUERY_KEY = ['codechef', 'status'];
export const CODECHEF_DETAILS_KEY = ['codechef', 'details'];

export function useCodeChef() {
  const queryClient = useQueryClient();
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusQuery = useQuery<CodeChefStatus>({
    queryKey: CODECHEF_QUERY_KEY,
    queryFn: () => codechefApi.getStatus(),
    staleTime: 60 * 1000,
  });

  const isConnected = Boolean(statusQuery.data?.connected);

  const detailsQuery = useQuery<CodeChefDetails>({
    queryKey: CODECHEF_DETAILS_KEY,
    queryFn: () => codechefApi.getDetails(),
    enabled: isConnected,
    staleTime: 2 * 60 * 1000,
  });

  const connectMutation = useMutation({
    mutationFn: (handle: string) => codechefApi.connect({ handle }),
    onSuccess: (data) => {
      setActionError(null);
      queryClient.setQueryData(CODECHEF_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: CODECHEF_DETAILS_KEY });
      if (!data.verified) setVerifyModalOpen(true);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to link CodeChef handle');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => codechefApi.verify(),
    onSuccess: () => {
      setActionError(null);
      setVerifyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: CODECHEF_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CODECHEF_DETAILS_KEY });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Verification failed');
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => codechefApi.sync(),
    onSuccess: (data) => {
      setActionError(null);
      queryClient.setQueryData(CODECHEF_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: CODECHEF_DETAILS_KEY });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Sync failed');
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (showPublic: boolean) => codechefApi.setVisibility(showPublic),
    onSuccess: (data) => {
      queryClient.setQueryData<CodeChefStatus>(CODECHEF_QUERY_KEY, (old) =>
        old ? { ...old, showPublic: data.showPublic } : old,
      );
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => codechefApi.disconnect(),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: CODECHEF_QUERY_KEY });
      queryClient.removeQueries({ queryKey: CODECHEF_DETAILS_KEY });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to unlink account');
    },
  });

  const cooldownText = useMemo(() => {
    const cd = statusQuery.data?.syncCooldown;
    if (!cd || cd.canSync || !cd.nextSyncAllowedAt) return null;
    const diffMs = new Date(cd.nextSyncAllowedAt).getTime() - Date.now();
    if (diffMs <= 0) return null;
    const mins = Math.ceil(diffMs / 60000);
    return `Available in ${mins}m`;
  }, [statusQuery.data?.syncCooldown]);

  return {
    status: statusQuery.data,
    details: detailsQuery.data,
    loading: statusQuery.isLoading,
    detailsLoading: detailsQuery.isLoading,
    error: statusQuery.error ? ((statusQuery.error as any).message || 'Failed to load CodeChef') : null,
    actionError,
    setActionError,
    verifyModalOpen,
    setVerifyModalOpen,
    cooldownText,
    canSync: Boolean(statusQuery.data?.syncCooldown?.canSync),
    connect: (handle: string) => connectMutation.mutate(handle),
    connecting: connectMutation.isPending,
    verify: () => verifyMutation.mutate(),
    verifying: verifyMutation.isPending,
    sync: () => syncMutation.mutate(),
    syncing: syncMutation.isPending,
    setVisibility: (show: boolean) => visibilityMutation.mutate(show),
    updatingVisibility: visibilityMutation.isPending,
    disconnect: () => disconnectMutation.mutate(),
    disconnecting: disconnectMutation.isPending,
    refetch: () => {
      statusQuery.refetch();
      if (isConnected) detailsQuery.refetch();
    },
  };
}
