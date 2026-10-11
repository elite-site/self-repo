export interface SendAnnouncementEmailRecipient {
  email: string | null;
  name?: string;
}

export interface AnnouncementEmailPayload {
  title: string;
  message: string;
}

export interface CreateEmailAutomationInput {
  name: string;
  trigger: string;
  description?: string;
  templateId: string;
  targetYear?: unknown;
  targetSection?: string | null;
  targetAll?: boolean;
}
