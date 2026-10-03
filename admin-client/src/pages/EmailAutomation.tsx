import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { EmailAutomationItem, EmailTemplateItem } from '../types';
import {
  Mail,
  Zap,
  Play,
  Pause,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Users,
  X,
} from 'lucide-react';

export const EmailAutomation: React.FC = () => {
  const confirm = useConfirm();
  const [automations, setAutomations] = useState<EmailAutomationItem[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTrigger, setNewTrigger] = useState('STUDENT_REGISTERED');
  const [newDesc, setNewDesc] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [autoRes, tempRes] = await Promise.all([
        adminApi.getEmailAutomations(),
        adminApi.getEmailTemplates(),
      ]);
      setAutomations(autoRes.automations || []);
      setTemplates(tempRes.templates || []);
      if (tempRes.templates && tempRes.templates.length > 0 && !newTemplateId) {
        setNewTemplateId(tempRes.templates[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load email automations:', err);
      setError(err?.response?.data?.message || 'Failed to load automations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    setActionSuccess(null);
    try {
      const res = await adminApi.toggleEmailAutomation(id);
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: res.automation.status } : a))
      );
      setActionSuccess(`Automation status updated to ${res.automation.status}`);
    } catch (err: any) {
      console.error('Failed to toggle automation:', err);
      setError(err?.response?.data?.message || 'Failed to toggle status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleRunNow = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: `Run “${name}” now?`,
      description: 'This queues the automation immediately and sends real email to every eligible cohort member.',
      confirmLabel: 'Run now',
    });
    if (!confirmed) return;
    setRunningId(id);
    setActionSuccess(null);
    try {
      const res = await adminApi.runEmailAutomation(id);
      setActionSuccess(`Dispatched automation to ${res.run.recipientCount} students.`);
      await loadData(true);
    } catch (err: any) {
      console.error('Failed to run automation:', err);
      setError(err?.response?.data?.message || 'Failed to dispatch automation');
    } finally {
      setRunningId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTemplateId) return;
    setCreating(true);
    setError(null);
    try {
      await adminApi.createEmailAutomation({
        name: newName.trim(),
        trigger: newTrigger,
        description: newDesc.trim() || null,
        templateId: newTemplateId,
        targetAll: true,
      });
      setIsModalOpen(false);
      setNewName('');
      setNewDesc('');
      setActionSuccess('New email automation workflow created successfully.');
      await loadData(true);
    } catch (err: any) {
      console.error('Failed to create automation:', err);
      setError(err?.response?.data?.message || 'Failed to create automation');
    } finally {
      setCreating(false);
    }
  };

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
      {/* Header */}
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
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-ink-brand' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-on-primary text-xs font-bold rounded-lg hover:bg-brand-hover transition-colors shadow-sm"
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
          <button onClick={() => setActionSuccess(null)} className="font-bold underline text-status-approved">
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

      {/* KPI bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Total Workflows
          </span>
          <div className="text-2xl font-extrabold text-ink">
            {automations.length}
          </div>
        </div>
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Active Pipelines
          </span>
          <div className="text-2xl font-extrabold text-status-approved">
            {activeCount} Active
          </div>
        </div>
        <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
            Prepared Email Templates
          </span>
          <div className="text-2xl font-extrabold text-ink">
            {templates.length} Templates
          </div>
        </div>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automations.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-edge rounded-xl">
            <Mail className="w-10 h-10 text-ink-muted mx-auto mb-3" />
            <h3 className="text-base font-bold text-ink mb-1">No automation rules configured</h3>
            <p className="text-xs text-ink-muted mb-4">Create your first automated email trigger above.</p>
          </div>
        ) : (
          automations.map((auto) => {
            const isActive = auto.status === 'ACTIVE';
            const isToggling = togglingId === auto.id;
            const isRunning = runningId === auto.id;

            return (
              <div
                key={auto.id}
                className="bg-surface border border-edge rounded-xl p-5 shadow-sm hover:border-edge-strong transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-status-bg-approved text-status-approved border border-edge'
                          : 'bg-surface-sunken text-ink-muted border border-edge'
                      }`}
                    >
                      {auto.status}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-status-bg-approved text-status-approved border border-edge">
                      Trigger: {auto.trigger}
                    </span>
                    {auto.targetAll && (
                      <span className="text-[10px] text-ink-muted flex items-center gap-1">
                        <Users className="w-3 h-3" /> All Students
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-ink leading-snug">
                    {auto.name}
                  </h3>
                  {auto.description && (
                    <p className="text-xs text-ink-secondary mt-1">
                      {auto.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-ink-muted" />
                      Template: <strong className="text-ink-secondary">{auto.template?.name || 'Default'}</strong>
                    </span>
                    <span className="text-ink-muted">•</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-ink-muted" />
                      Last run: {auto.lastRunAt ? new Date(auto.lastRunAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-edge shrink-0">
                  <button
                    onClick={() => handleToggle(auto.id)}
                    disabled={isToggling}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      isActive
                        ? 'text-status-pending bg-status-bg-pending border-edge hover:bg-status-bg-pending'
                        : 'text-status-approved bg-status-bg-approved border-edge hover:bg-status-bg-approved'
                    }`}
                  >
                    {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isActive ? 'Pause' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleRunNow(auto.id, auto.name)}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-ink bg-surface-sunken border border-edge rounded-lg hover:bg-surface-inset transition-colors disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                    {isRunning ? 'Dispatching...' : 'Run Now'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm">
          <div className="bg-surface text-ink border border-edge rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-edge flex items-center justify-between">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Zap className="w-5 h-5 text-ink-brand" />
                Configure New Automation Workflow
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-sunken text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hackathon Registration Ticket Dispatch"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">
                  Trigger Event Type *
                </label>
                <select
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="STUDENT_REGISTERED">STUDENT_REGISTERED (First SSO Profile Creation)</option>
                  <option value="EVENT_REGISTERED">EVENT_REGISTERED (Individual or Team Registration)</option>
                  <option value="CONTENT_APPROVED">CONTENT_APPROVED (Project or Achievement Verification)</option>
                  <option value="DEADLINE_REMINDER">DEADLINE_REMINDER (Submission Nudge Broadcast)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">
                  Email Template Dispatch *
                </label>
                <select
                  value={newTemplateId}
                  onChange={(e) => setNewTemplateId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1">
                  Operational Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide context on when and why this rule executes..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-edge-strong bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="pt-4 border-t border-edge flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-ink-secondary hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-bold text-on-primary bg-brand rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Deploy Automation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
