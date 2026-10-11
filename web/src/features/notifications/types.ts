export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  status?: string;
  createdAt?: string;
  link?: string;
  data?: any;
}

export interface Announcement {
  id: string;
  title: string;
  body?: string;
  message?: string;
  priority?: string;
  publishedAt?: string;
  createdAt?: string;
}

export type NotificationFilterType = 'ALL' | 'UNREAD' | 'EVENT' | 'ACADEMIC' | 'VOTING' | 'VIDEO';
