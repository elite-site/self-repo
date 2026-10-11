import { useState, useEffect, useCallback } from 'react';
import { storageApi } from '../api';
import { StorageStatsResponse } from '../types';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export const useStorage = () => {
  const confirm = useConfirm();
  const [stats, setStats] = useState<StorageStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [syncingPermissions, setSyncingPermissions] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStorage = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await storageApi.getStorageStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load storage statistics:', err);
      setError(err?.response?.data?.message || 'Failed to connect to storage service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStorage();
  }, [loadStorage]);

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
      await loadStorage(true);
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
    stats,
    loading,
    refreshing,
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
