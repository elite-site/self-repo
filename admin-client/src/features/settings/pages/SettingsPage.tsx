import React from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { InstitutionalIdentitySection } from '../components/InstitutionalIdentitySection';
import { StorageLimitsSection } from '../components/StorageLimitsSection';
import { SecurityAccessSection } from '../components/SecurityAccessSection';

export const SettingsPage: React.FC = () => {
  const {
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
  } = useSettings();

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
        <InstitutionalIdentitySection settings={settings} onChange={handleChange} />
        <StorageLimitsSection settings={settings} onChange={handleChange} />
        <SecurityAccessSection settings={settings} onChange={handleChange} />
      </form>
    </div>
  );
};

export default SettingsPage;
