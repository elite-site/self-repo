import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../api';

export const useSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    academic_year: '2026',
    portal_title: 'ELITE Student Portal',
    institution_name: 'Sasi Institute of Technology & Engineering',
    department_name: 'Department of Information Technology',
    max_video_size_mb: '',
    max_photo_size_mb: '10',
    allowed_email_domain: 'sasi.ac.in',
    auto_approve_projects: 'true',
  });
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await settingsApi.getSettings();
      if (res && res.settings) {
        setSettings(res.settings);
        setOriginalSettings({ ...res.settings });
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve portal settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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
    loading,
    saving,
    refreshing,
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
