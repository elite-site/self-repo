import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storageApi } from '../api/index';
import { StorageStatsResponse } from '../types';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export const ADMIN_STORAGE_QUERY_KEY = ['admin', 'storage'] as const;

export const useStorage = () => {
  const confirm = useConfirm();
  const [clearingCache, setClearingCache] = useState(false);
  const [syncingPermissions, setSyncingPermissions] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery<StorageStatsResponse>({
    queryKey: ADMIN_STORAGE_QUERY_KEY,
    queryFn: () => storageApi.getStorageStats(),
  });

  useEffect(() => {
    if (query.isError) {
      setError((query.error as any)?.response?.data?.message || 'Failed to connect to storage service');
    } else if (query.isSuccess) {
      setError(null);
    }
  }, [query.isError, query.isSuccess, query.error]);

  const loadStorage = useCallback(
    async (_isManual = false) => {
      setError(null);
      await query.refetch();
    },
    [query],
  );

  const handleClearCache = async () => {
    const confirmed = await confirm({
      title: 'Purge the Drive folder cache?',
      description:
        'Folders are re-resolved automatically on the next request, so this only costs one extra Drive lookup per folder.',
      confirmLabel: 'Purge cache',
    });
    if (!confirmed) return;
    setClearingCache(true);
    setCacheMessage(null);
    try {
      const res = await storageApi.clearStorageCache();
      setCacheMessage(res.message || 'Drive folder cache cleared.');
      await query.refetch();
    } catch (err: any) {
      console.error('Failed to clear cache:', err);
      setError(err?.response?.data?.message || 'Failed to purge cache');
    } finally {
      setClearingCache(false);
    }
  };

  const handleSyncPermissions = async () => {
    setSyncingPermissions(true);
    setCacheMessage(null);
    try {
      const res = await storageApi.ensureDriveViewerPermissions();
      setCacheMessage(res.message || 'Viewer permissions synced for all Drive files and folders.');
    } catch (err: any) {
      console.error('Failed to sync permissions:', err);
      setError(err?.response?.data?.message || 'Failed to sync viewer permissions');
    } finally {
      setSyncingPermissions(false);
    }
  };

  return {
    stats: query.data ?? null,
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
    clearingCache,
    syncingPermissions,
    cacheMessage,
    setCacheMessage,
    error,
    loadStorage,
    handleClearCache,
    handleSyncPermissions,
  };
};
