import { useState, useEffect, useCallback } from 'react';
import { emailAutomationApi } from '../api';
import { EmailAutomationItem, EmailTemplateItem } from '../types';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export const useEmailAutomation = () => {
  const confirm = useConfirm();
  const [automations, setAutomations] = useState<EmailAutomationItem[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [autoRes, tempRes] = await Promise.all([
        emailAutomationApi.getEmailAutomations(),
        emailAutomationApi.getEmailTemplates(),
      ]);
      setAutomations(autoRes.automations || []);
      setTemplates(tempRes.templates || []);
    } catch (err: any) {
      console.error('Failed to load email automations:', err);
      setError(err?.response?.data?.message || 'Failed to load automations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    setActionSuccess(null);
    try {
      const res = await emailAutomationApi.toggleEmailAutomation(id);
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
      description:
        'This queues the automation immediately and sends real email to every eligible cohort member.',
      confirmLabel: 'Run now',
    });
    if (!confirmed) return;
    setRunningId(id);
    setActionSuccess(null);
    try {
      const res = await emailAutomationApi.runEmailAutomation(id);
      setActionSuccess(`Dispatched automation to ${res.run?.recipientCount ?? 0} students.`);
      await loadData(true);
    } catch (err: any) {
      console.error('Failed to run automation:', err);
      setError(err?.response?.data?.message || 'Failed to dispatch automation');
    } finally {
      setRunningId(null);
    }
  };

  const handleCreate = async (payload: {
    name: string;
    trigger: string;
    templateId: string;
    description?: string;
  }) => {
    setCreating(true);
    setError(null);
    try {
      await emailAutomationApi.createEmailAutomation({
        name: payload.name.trim(),
        trigger: payload.trigger,
        description: payload.description?.trim() || null,
        templateId: payload.templateId,
        targetAll: true,
      });
      setIsModalOpen(false);
      setActionSuccess('Created email automation workflow.');
      await loadData(true);
    } catch (err: any) {
      console.error('Failed to create automation:', err);
      setError(err?.response?.data?.message || 'Failed to create automation');
    } finally {
      setCreating(false);
    }
  };

  return {
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
  };
};
