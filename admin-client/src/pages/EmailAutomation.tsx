import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
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
    if (!window.confirm(`Execute email automation "${name}" now for eligible cohort members?`)) {
      return;
    }
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
        <div className="w-10 h-10 border-3 border-elite-red border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Loading automation workflows...</p>
      </div>
    );
  }

  const activeCount = automations.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Zap className="w-7 h-7 text-elite-red" />
            Email Automations & Trigger Workflows
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Event-driven communication pipelines dispatched on student onboarding, event registration, and portfolio milestones.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-elite-red' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-elite-red text-white text-xs font-bold rounded-lg hover:bg-elite-red-dark transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Workflow
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold underline text-emerald-700 dark:text-emerald-300">
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

      {/* KPI bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
            Total Workflows
          </span>
          <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            {automations.length}
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
            Active Pipelines
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {activeCount} Active
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
            Prepared Email Templates
          </span>
          <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            {templates.length} Templates
          </div>
        </div>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automations.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <Mail className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200 mb-1">No automation rules configured</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Create your first automated email trigger above.</p>
          </div>
        ) : (
          automations.map((auto) => {
            const isActive = auto.status === 'ACTIVE';
            const isToggling = togglingId === auto.id;
            const isRunning = runningId === auto.id;

            return (
              <div
                key={auto.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      {auto.status}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                      Trigger: {auto.trigger}
                    </span>
                    {auto.targetAll && (
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> All Students
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
                    {auto.name}
                  </h3>
                  {auto.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      {auto.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      Template: <strong className="text-neutral-700 dark:text-neutral-300">{auto.template?.name || 'Default'}</strong>
                    </span>
                    <span className="text-neutral-400">•</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      Last run: {auto.lastRunAt ? new Date(auto.lastRunAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800 shrink-0">
                  <button
                    onClick={() => handleToggle(auto.id)}
                    disabled={isToggling}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      isActive
                        ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                        : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                    }`}
                  >
                    {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isActive ? 'Pause' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleRunNow(auto.id, auto.name)}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-elite-red" />
                Configure New Automation Workflow
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hackathon Registration Ticket Dispatch"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Trigger Event Type *
                </label>
                <select
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
                >
                  <option value="STUDENT_REGISTERED">STUDENT_REGISTERED (First SSO Profile Creation)</option>
                  <option value="EVENT_REGISTERED">EVENT_REGISTERED (Individual or Team Registration)</option>
                  <option value="CONTENT_APPROVED">CONTENT_APPROVED (Project or Achievement Verification)</option>
                  <option value="DEADLINE_REMINDER">DEADLINE_REMINDER (Submission Nudge Broadcast)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Template Dispatch *
                </label>
                <select
                  value={newTemplateId}
                  onChange={(e) => setNewTemplateId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Operational Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide context on when and why this rule executes..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-red"
                />
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-bold text-white bg-elite-red rounded-lg hover:bg-elite-red-dark transition-colors disabled:opacity-50"
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
