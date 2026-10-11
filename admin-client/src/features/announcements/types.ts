export interface Announcement {
  id: string;
  title: string;
  message?: string | null;
  body?: string | null;
  priority?: string | null;
  status?: string | null;
  targetAll?: boolean;
  targetYear?: number | null;
  targetSection?: string | null;
  createdBy?: string | null;
  createdAt: string;
  audience?: string;
  createdByName?: string | null;
  recipientCount?: number;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  scheduledAt?: string | null;
  targetAll?: boolean;
  targetYear?: number | null;
  targetSection?: string | null;
}
