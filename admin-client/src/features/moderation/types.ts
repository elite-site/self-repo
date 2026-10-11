export type SubmissionRating = 'GOOD' | 'AVERAGE' | 'POOR';

export interface IntroVideoState {
  id: string;
  status: string;
  reviewNote?: string | null;
  isPublic: boolean;
  publishedAt?: string | null;
  changeRequestedAt?: string | null;
  changeRequestNote?: string | null;
  driveFileId?: string | null;
  submittedAt: string;
  publicUrl?: string | null;
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
  introVideo?: IntroVideoState | null;
}

export interface SubmissionsResponse {
  submissions: Submission[];
  total: number;
  stats?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    changesRequested: number;
  };
}

export type ModerationType = 'videos' | 'resumes' | 'certificates' | 'achievements' | 'projects';

export interface ModerationDecisionData {
  decision?: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  action?: 'approve' | 'reject' | 'changes' | 'hide' | string;
  reason?: string;
  rejectionReason?: string;
  reviewNote?: string;
  approvalNote?: string;
  publish?: boolean;
}

export interface ModerationDecisionResult {
  success: boolean;
  message?: string;
  item?: any;
}

export interface ModerationBaseItem {
  id: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  studentEmail?: string;
  studentBranch?: string;
  studentYear?: number;
  studentSection?: string;
  status: string;
  isPublic?: boolean;
  reviewNote?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  submittedAt: string;
  itemType: string;
}

export interface ModerationVideoItem extends ModerationBaseItem {
  itemType: 'video';
  driveFileId: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface ModerationResumeItem extends ModerationBaseItem {
  itemType: 'resume';
  fileDriveId: string;
  fileName?: string;
  fileSize?: number;
}

export interface ModerationAchievementItem extends ModerationBaseItem {
  itemType: 'achievement';
  title: string;
  category?: string;
  proofDriveId?: string;
  description?: string;
}

export interface ModerationCertificateItem extends ModerationBaseItem {
  itemType: 'certificate';
  name: string;
  issuer?: string;
  proofDriveId?: string;
  issueDate?: string;
}

export interface ModerationProjectItem extends ModerationBaseItem {
  itemType: 'project';
  title: string;
  description?: string;
  liveUrl?: string;
  repoUrl?: string;
  technologies?: string[];
}

export type {
  UnifiedModerationItem,
} from '@/types';

export type TabType = 'all' | 'videos' | 'resumes' | 'certificates' | 'projects' | 'github-projects' | 'achievements';
export type StatusFilter = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
