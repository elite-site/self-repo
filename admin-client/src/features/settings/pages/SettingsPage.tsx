import React from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, CheckCircle, AlertCircle, Sliders, ShieldCheck } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { InstitutionalIdentitySection } from '../components/InstitutionalIdentitySection';
import { StorageLimitsSection } from '../components/StorageLimitsSection';
import { SecurityAccessSection } from '../components/SecurityAccessSection';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

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
      <div className="flex flex-col items-center justify-center min-h-[450px] animate-fade-in">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Loading portal configuration…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up text-left">
      {/* 1. TOP ASYMMETRICAL OVERVIEW */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Global System Configuration</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink font-sans">
                Portal Settings & Parameters
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
                Institutional branding, student upload quotas, SSO domain restrictions, and media parameters
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadSettings(true)}
                disabled={refreshing}
                className="btn btn-secondary min-h-[40px] px-3.5 inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="btn btn-primary min-h-[40px] px-4 inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving…' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Max Video Cap</span>
              <span className="text-2xl font-bold text-ink font-mono">
                {settings['video.maxSizeBytes'] ? `${Math.round(parseInt(settings['video.maxSizeBytes'], 10) / (1024 * 1024))} MB` : '150 MB'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Max Resume Cap</span>
              <span className="text-2xl font-bold text-brand font-mono">
                {settings['resume.maxSizeBytes'] ? `${Math.round(parseInt(settings['resume.maxSizeBytes'], 10) / (1024 * 1024))} MB` : '10 MB'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">SSO Enforced</span>
              <span className="text-2xl font-bold text-status-approved font-mono">
                {settings['auth.allowedDomains'] ? 'Restricted' : 'Open'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Config State</span>
              <span className="text-2xl font-bold text-ink font-mono">
                {hasUnsavedChanges ? 'Modified' : 'Synchronized'}
              </span>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Sliders size={13} />
                  System Governance
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  Runtime Hot-Reload
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Dynamic Parameter Engine</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Changes saved here update portal parameters dynamically in PostgreSQL, immediately propagating to upload validation gates and student views.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Storage Engine</span>
                  <span className="font-bold text-ink text-sm">Postgres Settings</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Validation Gate</span>
                  <span className="font-bold text-status-approved text-sm">Active</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <ShieldCheck size={14} className="text-brand shrink-0" />
              <span>Institutional security rules applied</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {success && (
        <div className="p-4 rounded-xl bg-status-approved/10 border border-status-approved/20 flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-status-approved shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="font-bold underline text-status-approved cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-status-rejected/10 border border-status-rejected/20 flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-rejected shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline text-status-rejected cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="p-3.5 rounded-xl bg-status-pending/10 border border-status-pending/20 flex items-center justify-between text-xs text-ink">
          <span className="font-medium text-ink">
            You have unsaved changes in portal parameters. Remember to click "Save Changes" above.
          </span>
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
