export interface EventItem {
  id: string;
  name: string;
  slug: string;
  year: number;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
}

export interface Submission {
  id: string;
  eventId?: string;
  name: string;
  rollNo: string;
  section: string;
  branch: string;
  year: number;
  email: string;
  photo1DriveId?: string | null;
  photo2DriveId?: string | null;
  photo3DriveId?: string | null;
  videoDriveId?: string | null;
  audioDriveId?: string | null;
  mediaType?: 'PHOTOS' | 'VIDEO' | 'AUDIO' | string | null;
  driveFolderPath: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'WINNER' | 'REJECTED';
  isWinner: boolean;
  winnerRank?: number | null;
  submittedAt: string;
}

export interface AdminStats {
  eventId?: string;
  totalSubmissions: number;
  totalWinners: number;
  byBranch: Record<string, number>;
  byYear: Record<string, number>;
  bySection: Array<{ label: string; count: number; year: number | string; branch?: string; section: string }>;
  byStatus: Record<string, number>;
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

export interface EmailPreviewData {
  subject: string;
  html: string;
  recipientName: string;
  recipientEmail: string;
}

export interface EmailLogEntry {
  id: string;
  eventId?: string;
  submissionId: string;
  templateType: 'WINNER' | 'PARTICIPANT_THANKYOU';
  sentAt: string;
  status: string;
}

export interface AdminUser {
  userId: string;
  email: string;
}

