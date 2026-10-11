import { useState, useEffect, useCallback } from 'react';
import { emailAutomationApi } from '../api';
import { EmailTemplateItem } from '../types';

export const useEmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await emailAutomationApi.getEmailTemplates();
      const list = res.templates || [];
      setTemplates(list);
      if (list.length > 0 && !selectedTemplate) {
        setSelectedTemplate(list[0]);
      }
    } catch (err: any) {
      console.error('Failed to load templates', err);
      setError(err?.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    selectedTemplate,
    setSelectedTemplate,
    loading,
    error,
    loadTemplates,
  };
};
