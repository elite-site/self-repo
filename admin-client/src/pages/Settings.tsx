import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Building,
  HardDrive,
  Shield,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    academic_year: '2026',
    portal_title: 'ELITE Student Portal',
    institution_name: 'Sasi Institute of Technology & Engineering',
    department_name: 'Department of Information Technology',
    max_video_size_mb: '100',
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

  const loadSettings = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getSettings();
      if (res && res.settings) {
        setSettings(res.settings);
        setOriginalSettings(res.settings);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve portal settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApi.updateSettings(settings);
      setOriginalSettings(settings);
      setSuccess('Portal configuration updated and applied successfully.');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err?.response?.data?.message || 'Failed to commit settings to database');
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-3 border-elite-red border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Loading portal configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <SettingsIcon className="w-7 h-7 text-elite-red" />
            Portal Settings & System Parameters
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Global administrative variables governing institutional branding, SSO authorization, and upload limits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadSettings(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-elite-red' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex items-center gap-2 px-4 py-2 bg-elite-red text-white text-xs font-bold rounded-lg hover:bg-elite-red-dark transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Committing...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="font-bold underline text-emerald-700 dark:text-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline text-rose-700 dark:text-rose-300">
            Dismiss
          </button>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <span className="font-medium">You have unsaved changes in portal parameters. Remember to click "Save Changes" above.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Institution & Academic Identity */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
            <Building className="w-4 h-4 text-elite-red" />
            Institutional Identity & Branding
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
            Configures display headers, certificates, and email signatures.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Portal Display Title
              </label>
              <input
                type="text"
                value={settings.portal_title || ''}
                onChange={(e) => handleChange('portal_title', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Academic Year
              </label>
              <input
                type="text"
                value={settings.academic_year || ''}
                onChange={(e) => handleChange('academic_year', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Institution Name
              </label>
              <input
                type="text"
                value={settings.institution_name || ''}
                onChange={(e) => handleChange('institution_name', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Department Name
              </label>
              <input
                type="text"
                value={settings.department_name || ''}
                onChange={(e) => handleChange('department_name', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Storage Limits & Media Constraints */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
            <HardDrive className="w-4 h-4 text-elite-red" />
            Media Upload & Storage Thresholds
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
            Upper-bound file size constraints enforced during direct uploads to Google Drive.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Max Video Submission Size (MB)
              </label>
              <input
                type="number"
                value={settings.max_video_size_mb || ''}
                onChange={(e) => handleChange('max_video_size_mb', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red font-mono"
              />
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
                Standard self-introduction MP4/WebM ceiling (Default: 100 MB)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Max Photo / Document Size (MB)
              </label>
              <input
                type="number"
                value={settings.max_photo_size_mb || ''}
                onChange={(e) => handleChange('max_photo_size_mb', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red font-mono"
              />
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
                Headshot photos, certificate proofs, and resumes (Default: 10 MB)
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Security & Access Restriction */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-elite-red" />
            Security & Authentication Domain
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
            Restrict student access to verified institutional email addresses.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Institutional Domain Whitelist
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  value={settings.allowed_email_domain || ''}
                  onChange={(e) => handleChange('allowed_email_domain', e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red font-mono"
                />
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
                Google SSO logins will reject accounts outside this domain
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Auto-Approve Portfolio Projects
              </label>
              <select
                value={settings.auto_approve_projects || 'false'}
                onChange={(e) => handleChange('auto_approve_projects', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
              >
                <option value="true">Enabled (Bypass moderation queue)</option>
                <option value="false">Disabled (Require moderator approval)</option>
              </select>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
                Whether student project portfolios publish immediately
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
