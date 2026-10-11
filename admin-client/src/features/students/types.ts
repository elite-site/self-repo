export interface Student {
  id: string;
  rollNo: string;
  name: string;
  year: number;
  section: string;
  branch: string;
  hasUploaded: boolean;
  email?: string;
  gender?: string | null;
  phoneNo?: string | null;
  video?: { status: string; isPublic: boolean } | null;
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
  profileId?: string | null;
  headline?: string | null;
  primaryPhotoDriveId?: string | null;
  projectCount?: number;
  achievementCount?: number;
  certificateCount?: number;
  hasResume?: boolean;
}

export interface SectionProgress {
  label: string;
  year: number | string;
  branch?: string;
  section: string;
  submitted: number;
}

export interface StudentsResponse {
  eventId?: string;
  data: Student[];
  students?: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    rosterTotal: number;
  };
  summary?: {
    totalEnrolled: number;
    submittedCount: number;
    pendingCount: number;
    approvedCount: number;
    changesRequestedCount: number;
    completionRate: number;
  };
  sectionsProgress?: SectionProgress[];
}
