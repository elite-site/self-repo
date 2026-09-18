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
  videoDriveId?: string | null;
  mediaType?: string | null;
  driveFolderPath: string;
  status: string;
  rating?: SubmissionRating | null;
  ratedAt?: string | null;
  submittedAt: string;
}

export interface Student {
  id: string;
  eventId?: string;
  rollNo: string;
  name: string;
  branch: string;
  section: string;
  year: number;
  email: string;
  submissionId?: string | null;
  hasVideo: boolean;
  rating?: SubmissionRating | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SectionProgress {
  label: string;
  year: number | string;
  branch?: string;
  section: string;
  total: number;
  submitted: number;
  remaining: number;
}

export interface AdminStats {
  eventId?: string;
  totalStudents: number;
  totalSubmissions: number;
  totalVideos: number;
  totalRated: number;
  totalRemaining: number;
  byYear: Record<string, number>;
  byYearProgress: Record<string, { total: number; submitted: number; remaining: number }>;
  bySection: SectionProgress[];
  byStatus: Record<string, number>;
  byRating: Record<string, number>;
  overTime: Array<{ date: string; count: number }>;
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

export interface StudentsResponse {
  eventId?: string;
  data: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface AdminUser {
  userId: string;
  email: string;
}