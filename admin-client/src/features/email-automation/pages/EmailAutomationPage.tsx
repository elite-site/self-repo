import React from 'react';
import { Zap, Plus, RefreshCw, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { useEmailAutomation } from '../hooks/useEmailAutomation';
import { AutomationCard } from '../components/AutomationCard';
import { AutomationKpiCards } from '../components/AutomationKpiCards';
import { CreateAutomationModal } from '../components/CreateAutomationModal';

export const EmailAutomationPage: React.FC = () => {
  const {
    automations,
    templates,
    loading,
    refreshing,
    error,
    setError,
    actionSuccess,
    setActionSuccess,
    runningId,
    togglingId,
    isModalOpen,
    setIsModalOpen,
    creating,
    loadData,
    handleToggle,
    handleRunNow,
    handleCreate,
  } = useEmailAutomation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Loading automation workflows...</p>
      </div>
    );
  }

  const activeCount = automations.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Zap className="w-7 h-7 text-ink-brand" />
            Email Automations & Trigger Workflows
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Event-driven communication pipelines dispatched on student onboarding, event registration, and portfolio milestones.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-ink-brand' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-on-primary text-xs font-bold rounded-lg hover:bg-brand-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Workflow
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-status-bg-approved border border-edge flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-status-approved shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold underline text-status-approved cursor-pointer">
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
          <button onClick={() => setError(null)} className="font-bold underline text-status-rejected cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      <AutomationKpiCards
        total={automations.length}
        activeCount={activeCount}
        templatesCount={templates.length}
      />

      <div className="space-y-4">
        {automations.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-edge rounded-xl">
            <Mail className="w-10 h-10 text-ink-muted mx-auto mb-3" />
            <h3 className="text-base font-bold text-ink mb-1">No automation rules configured</h3>
            <p className="text-xs text-ink-muted mb-4">Create your first automated email trigger above.</p>
          </div>
        ) : (
          automations.map((auto) => (
            <AutomationCard
              key={auto.id}
              automation={auto}
              isToggling={togglingId === auto.id}
              isRunning={runningId === auto.id}
              onToggle={handleToggle}
              onRunNow={handleRunNow}
            />
          ))
        )}
      </div>

      <CreateAutomationModal
        isOpen={isModalOpen}
        templates={templates}
        creating={creating}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default EmailAutomationPage;
