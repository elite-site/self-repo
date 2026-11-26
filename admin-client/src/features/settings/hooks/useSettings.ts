import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/index';

export const ADMIN_SETTINGS_QUERY_KEY = ['admin', 'settings'] as const;

const DEFAULT_SETTINGS: Record<string, string> = {
  academic_year: '2026',
  portal_title: 'ELITE Student Portal',
  institution_name: 'Sasi Institute of Technology & Engineering',
  department_name: 'Department of Information Technology',
  max_video_size_mb: '',
  max_photo_size_mb: '10',
  allowed_email_domain: 'sasi.ac.in',
  auto_approve_projects: 'true',
};

export const useSettings = () => {
  const queryClient = useQueryClient();
  const query = useQuery<{ settings?: Record<string, string> }>({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: () => settingsApi.getSettings(),
  });

  const [settings, setSettings] = useState<Record<string, string>>(
    () => query.data?.settings ?? DEFAULT_SETTINGS,
  );
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>(
    () => (query.data?.settings ? { ...query.data.settings } : {}),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (query.data?.settings) {
      setSettings(query.data.settings);
      setOriginalSettings({ ...query.data.settings });
    }
  }, [query.data]);

  useEffect(() => {
    if (query.isError) {
      setError((query.error as any)?.response?.data?.message || 'Failed to retrieve portal settings');
    }
  }, [query.isError, query.error]);

  const loadSettings = useCallback(
    async (_isManual = false) => {
      setError(null);
      await query.refetch();
    },
    [query],
  );

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await settingsApi.updateSettings(settings);
      setOriginalSettings(settings);
      queryClient.setQueryData(ADMIN_SETTINGS_QUERY_KEY, { settings });
      setSuccess('Portal configuration updated.');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err?.response?.data?.message || 'Failed to commit settings to database');
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  return {
    settings,
    loading: query.isPending,
    saving,
    refreshing: query.isFetching && !query.isPending,
    error,
    setError,
    success,
    setSuccess,
    hasUnsavedChanges,
    loadSettings,
    handleChange,
    handleSave,
  };
};
