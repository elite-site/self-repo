export interface EventItem {
  id: string;
  name: string;
  slug: string;
  year: number;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
}

export type SubmissionRating = 'GOOD' | 'AVERAGE' | 'POOR';

export interface Submission {
  id: string;
  eventId?: string;
  name: string;
  rollNo: string;
  section: string;
  branch: string;
  year: number;
  email: string;
  phoneNo?: string | null;
  videoDriveId?: string | null;
  mediaType?: string | null;
  driveFolderPath: string;
  status: string;
  rating?: SubmissionRating | null;
  ratedAt?: string | null;
  submittedAt: string;
  reviewText?: string | null;
  reviewPros?: string[];
  reviewCons?: string[];
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

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
}

export interface SubmissionsResponse {
  eventId?: string;
  data: Submission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Roster row returned by GET /admin/api/students
export interface Student {
  id: string;
  rollNo: string;
  name: string;
  year: number;
  section: string;
  branch: string;
  hasUploaded: boolean;
  submission: {
    id: string;
    status: string;
    submittedAt: string;
    videoDriveId?: string | null;
    reviewText?: string | null;
    reviewPros?: string[];
    reviewCons?: string[];
    reviewedAt?: string | null;
  } | null;
}

export interface StudentsResponse {
  eventId?: string;
  data: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    rosterTotal: number;
  };
}

export interface AdminUser {
  userId: string;
  email: string;
  username?: string;
}