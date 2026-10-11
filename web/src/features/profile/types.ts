import { StudentProfile } from '@/shared/types';

export type { StudentProfile };

export interface ChangeRequest {
  id: string;
  fieldName: string;
  requestedValue: string;
  reason?: string;
  status: string;
  createdAt: string;
  adminResponse?: string | null;
}
