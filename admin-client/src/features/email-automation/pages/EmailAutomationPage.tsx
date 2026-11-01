import React from 'react';
import { Zap, Plus, RefreshCw, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { useEmailAutomation } from '../hooks/useEmailAutomation';
import { AutomationCard } from '../components/AutomationCard';
import { AutomationKpiCards } from '../components/AutomationKpiCards';
import { CreateAutomationModal } from '../components/CreateAutomationModal';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryGrid';

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
      <div className="space-y-6" aria-busy="true">
        <div className="space-y-2">
          <div className="skeleton h-8 w-72 rounded-lg" />
          <div className="skeleton h-4 w-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activeCount = automations.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. ASYMMETRICAL TOP SECTION */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <Zap size={13} className="shrink-0" />
                <span>Automated Email Pipeline</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
                Email Automations & Workflows
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                Event-driven communication pipelines dispatched on student onboarding, event registration, and portfolio milestones.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="btn btn-secondary min-h-[40px] px-3.5 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary min-h-[40px] px-4 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Workflow</span>
              </button>
            </div>
          </div>

          <AutomationKpiCards
            total={automations.length}
            activeCount={activeCount}
            templatesCount={templates.length}
          />
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Mail size={13} />
                  Automation Core
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  {activeCount} Active
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Trigger-Action Rules Engine</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Rules execute based on system webhooks or cron intervals, compiling dynamic tags into Resend transactional emails.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Workflow Rules</span>
                  <span className="font-bold text-ink text-sm tabular-nums">{automations.length}</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Email Engine</span>
                  <span className="font-bold text-status-approved text-sm">Resend API</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <CheckCircle size={14} className="text-brand shrink-0" />
              <span>Full deliverability audit enabled</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-status-approved/10 border border-status-approved/20 flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-status-approved shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold underline text-status-approved cursor-pointer">
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

      {/* 2. MASONRY GRID OF AUTOMATION CARDS */}
      <MasonryGrid cols={2}>
        {automations.map((a) => (
          <MasonryItem key={a.id}>
            <div className="card-hover">
              <AutomationCard
                automation={a}
                isRunning={runningId === a.id}
                isToggling={togglingId === a.id}
                onToggle={() => handleToggle(a.id)}
                onRunNow={() => handleRunNow(a.id, a.name)}
              />
            </div>
          </MasonryItem>
        ))}
      </MasonryGrid>

      <CreateAutomationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
        templates={templates}
        creating={creating}
      />
    </div>
  );
};

export default EmailAutomationPage;
