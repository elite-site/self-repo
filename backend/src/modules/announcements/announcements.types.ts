export interface AnnouncementNotificationTarget {
  id: string;
  title: string;
  message: string;
  targetAll: boolean;
  targetYear: number | null;
  targetSection: string | null;
}

export interface AnnouncementTarget {
  targetAll: boolean;
  targetYear: number | null;
  targetSection: string | null;
}

export interface CreateAnnouncementInput {
  title: string;
  body?: string;
  content?: string;
  message?: string;
  scheduledAt?: string | null;
  priority?: string;
  targetYear?: unknown;
  targetSection?: unknown;
  targetAll?: unknown;
  createdBy: string;
}
