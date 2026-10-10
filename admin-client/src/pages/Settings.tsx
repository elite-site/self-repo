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
    // Deliberately not seeded with a number here: the server owns the default so
    // the value shown is the value it enforces.
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

  const loadSettings = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getSettings();
      if (res && res.settings) {
        setSettings(res.settings);
        // A separate object, or the dirty check below sees one shared reference
        // and can never tell an edit apart from the loaded state.
        setOriginalSettings({ ...res.settings });
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
      setSuccess('Portal configuration updated.');
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
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Loading portal configuration…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <SettingsIcon className="w-7 h-7 text-ink-brand" />
            Portal Settings & System Parameters
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Global administrative variables governing institutional branding, SSO authorization, and upload limits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadSettings(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-ink-brand' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-on-primary text-xs font-bold rounded-lg hover:bg-brand-hover transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : hasUnsavedChanges ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-status-bg-approved border border-edge flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-status-approved shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="font-bold underline text-status-approved">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-status-bg-rejected border border-edge flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-rejected shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline text-status-rejected">
            Dismiss
          </button>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="p-3.5 rounded-xl bg-status-bg-pending border border-edge flex items-center justify-between text-xs text-ink">
          <span className="font-medium">You have unsaved changes in portal parameters. Remember to click "Save Changes" above.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Institution & Academic Identity */}
        <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-1">
            <Building className="w-4 h-4 text-ink-brand" />
            Institutional Identity & Branding
          </h2>
          <p className="text-xs text-ink-muted mb-6">
            Configures display headers, certificates, and email signatures.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Portal Display Title
              </label>
              <input
                type="text"
                value={settings.portal_title || ''}
                onChange={(e) => handleChange('portal_title', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Academic Year
              </label>
              <input
                type="text"
                value={settings.academic_year || ''}
                onChange={(e) => handleChange('academic_year', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Institution Name
              </label>
              <input
                type="text"
                value={settings.institution_name || ''}
                onChange={(e) => handleChange('institution_name', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Department Name
              </label>
              <input
                type="text"
                value={settings.department_name || ''}
                onChange={(e) => handleChange('department_name', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Storage Limits & Media Constraints */}
        <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-1">
            <HardDrive className="w-4 h-4 text-ink-brand" />
            Media Upload & Storage Thresholds
          </h2>
          <p className="text-xs text-ink-muted mb-6">
            Upper-bound file size constraints enforced during direct uploads.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Max Video Submission Size (MB)
              </label>
              <input
                type="number"
                value={settings.max_video_size_mb || ''}
                onChange={(e) => handleChange('max_video_size_mb', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand font-mono"
              />
              <span className="text-xs text-ink-muted mt-1 block">
                Standard introduction video MP4/WebM ceiling. Applied to every upload; capped at 100&nbsp;MB.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Max Photo / Document Size (MB)
              </label>
              <input
                type="number"
                value={settings.max_photo_size_mb || ''}
                onChange={(e) => handleChange('max_photo_size_mb', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand font-mono"
              />
              <span className="text-xs text-ink-muted mt-1 block">
                Headshot photos, certificate proofs, and resumes (Default: 10 MB)
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Security & Access Restriction */}
        <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-ink-brand" />
            Security & Authentication Domain
          </h2>
          <p className="text-xs text-ink-muted mb-6">
            Restrict student access to verified institutional email addresses.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Institutional Domain Whitelist
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted font-mono text-xs">@</span>
                <input
                  type="text"
                  value={settings.allowed_email_domain || ''}
                  onChange={(e) => handleChange('allowed_email_domain', e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand font-mono"
                />
              </div>
              <span className="text-xs text-ink-muted mt-1 block">
                Google SSO logins will reject accounts outside this domain
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Auto-Approve Portfolio Projects
              </label>
              <select
                value={settings.auto_approve_projects || 'false'}
                onChange={(e) => handleChange('auto_approve_projects', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="true">Enabled (Bypass moderation queue)</option>
                <option value="false">Disabled (Require moderator approval)</option>
              </select>
              <span className="text-xs text-ink-muted mt-1 block">
                Whether student project portfolios publish immediately
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
