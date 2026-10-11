export interface EmailTemplateItem {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  status: string;
  createdAt: string;
}

export interface EmailAutomationItem {
  id: string;
  name: string;
  trigger: string;
  status: 'ACTIVE' | 'PAUSED';
  description: string | null;
  templateId: string;
  template: EmailTemplateItem;
  targetAll: boolean;
  targetYear?: number | null;
  targetSection?: string | null;
  lastRunAt?: string | null;
  createdAt?: string;
  history?: Array<{
    id: string;
    runAt: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    status: string;
  }>;
}

export interface AutomationRunItem {
  id: string;
  automationId: string;
  automation: {
    name: string;
    trigger: string;
    template: { name: string; subject: string };
  };
  trigger?: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  runAt: string;
  startedAt?: string;
  completedAt?: string | null;
  error?: string | null;
}

export interface EmailLogItem {
  id: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  status: string;
  error?: string | null;
  sentAt: string;
}

export interface EmailHistoryResponse {
  automationRuns: AutomationRunItem[];
  emailLogs: EmailLogItem[];
}
