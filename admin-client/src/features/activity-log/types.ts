export interface ActivityLogItem {
  id: string;
  eventId?: string;
  category: string;
  action: string;
  details: string | null;
  userEmail: string | null;
  applicantName?: string | null;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  errorMessage?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface ActivityStats {
  totalActivities: number;
  applicationsToday: number;
  adminActions: number;
  errorsCount: number;
  successRate: number;
}

export interface ActivityLogsResponse {
  logs: ActivityLogItem[];
  stats: ActivityStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
