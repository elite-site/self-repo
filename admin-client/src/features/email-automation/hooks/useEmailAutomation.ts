import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { emailAutomationApi } from '../api/index';
import { EmailAutomationItem, EmailTemplateItem } from '../types';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export const ADMIN_EMAIL_AUTOMATION_QUERY_KEY = ['admin', 'email-automation'] as const;

interface EmailAutomationQueryData {
  automations: EmailAutomationItem[];
  templates: EmailTemplateItem[];
}

export const useEmailAutomation = () => {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const query = useQuery<EmailAutomationQueryData>({
    queryKey: ADMIN_EMAIL_AUTOMATION_QUERY_KEY,
    queryFn: async () => {
      const [autoRes, tempRes] = await Promise.all([
        emailAutomationApi.getEmailAutomations(),
        emailAutomationApi.getEmailTemplates(),
      ]);
      return {
        automations: autoRes.automations || [],
        templates: tempRes.templates || [],
      };
    },
  });

  useEffect(() => {
    if (query.isError) {
      setError((query.error as any)?.response?.data?.message || 'Failed to load automations');
    } else if (query.isSuccess) {
      setError(null);
    }
  }, [query.isError, query.isSuccess, query.error]);

  const loadData = useCallback(
    async (_isManual = false) => {
      setError(null);
      await query.refetch();
    },
    [query],
  );

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    setActionSuccess(null);
    try {
      const res = await emailAutomationApi.toggleEmailAutomation(id);
      queryClient.setQueryData<EmailAutomationQueryData>(ADMIN_EMAIL_AUTOMATION_QUERY_KEY, (prev) =>
        prev
          ? {
              ...prev,
              automations: prev.automations.map((a) =>
                a.id === id ? { ...a, status: res.automation.status } : a,
              ),
            }
          : prev,
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
      await query.refetch();
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
      await query.refetch();
    } catch (err: any) {
      console.error('Failed to create automation:', err);
      setError(err?.response?.data?.message || 'Failed to create automation');
    } finally {
      setCreating(false);
    }
  };

  return {
    automations: query.data?.automations ?? [],
    templates: query.data?.templates ?? [],
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
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
