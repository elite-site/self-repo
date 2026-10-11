import { LucideIcon } from 'lucide-react';
import { StudentDashboardResponse } from '@/shared/types';

export type { StudentDashboardResponse };

export type DashboardTone =
  | 'badge-draft'
  | 'badge-pending'
  | 'badge-review'
  | 'badge-approved'
  | 'badge-rejected'
  | 'badge-changes';

export type DashboardTaskState = 'todo' | 'progress' | 'done';

export interface DashboardTask {
  id: string;
  title: string;
  hint: string;
  dateChip?: string;
  to: string;
  destination: string;
  icon: LucideIcon;
  state: DashboardTaskState;
  badge: string;
  tone: DashboardTone;
  cta: string;
}
