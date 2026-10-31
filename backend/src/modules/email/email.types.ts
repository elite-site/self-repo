export interface CreateEmailAutomationInput {
  name: string;
  trigger: string;
  description?: string;
  templateId: string;
  targetYear?: unknown;
  targetSection?: string | null;
  targetAll?: boolean;
}
