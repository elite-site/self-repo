export interface SectionProgress {
  label: string;
  year: number | string;
  branch?: string;
  section: string;
  submitted: number;
}

export interface PortalStats {
  totalStudents: number;
  totalProfiles: number;
  totalProjects: number;
  totalAchievements: number;
  totalCertificates: number;
  totalResumes: number;
  totalEvents: number;
  totalRegistrations: number;
  totalCampaigns: number;
  totalVotes: number;
  pendingModeration: number;
  totalSubmissions?: number;
  totalRated?: number;
}

export interface AdminStats {
  eventId?: string;
  totalSubmissions: number;
  totalVideos: number;
  totalRated: number;
  byYear: Record<string, number>;
  bySection: SectionProgress[];
  byStatus: Record<string, number>;
  byRating: Record<string, number>;
  overTime: Array<{ date: string; count: number }>;
  portal?: PortalStats;
  ratings?: {
    good: number;
    average: number;
    poor: number;
  };
  total?: number;
  submitted?: number;
  approved?: number;
  pending?: number;
  rejected?: number;
  changesRequested?: number;
}

export interface AnalyticsResponse {
  timestamp: string;
  summary: {
    totalStudents: number;
    totalProfiles: number;
    totalSubmissions: number;
    totalRated: number;
    totalEvents: number;
    totalRegistrations: number;
    totalCampaigns: number;
    totalVotes: number;
    totalProjects: number;
    totalAchievements: number;
    totalCertificates: number;
    totalResumes: number;
    pendingModeration: number;
  };
  ratings: {
    good: number;
    average: number;
    poor: number;
  };
  yearDistribution: Array<{
    year: number;
    count: number;
  }>;
}
