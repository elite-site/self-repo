export interface EventItem {
  id: string;
  name: string;
  slug: string;
  year: number;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
}

export type SubmissionRating = 'GOOD' | 'AVERAGE' | 'POOR';

/** Moderation + public visibility state of a student's introduction video. */
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

export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED' | 'WAITLISTED';
export type TeamStatus = 'FORMING' | 'ACTIVE' | 'COMPLETE' | 'REJECTED';

export interface RegistrationAnswerItem {
  id: string;
  fieldId: string;
  value: string | null;
  field: {
    id: string;
    label: string;
    fieldType: string;
  };
}

export interface RegistrationTeamMember {
  id: string;
  studentId: string;
  student: {
    id: string;
    rollNo: string;
    name: string;
    email?: string | null;
    year: number;
    section: string;
    branch?: string;
  };
  joinedAt?: string;
}

export interface RegistrationTeam {
  id: string;
  name: string;
  eventId: string;
  leaderId: string;
  status: TeamStatus;
  createdAt: string;
  updatedAt?: string;
  event?: {
    id: string;
    name: string;
  };
  leader?: {
    id: string;
    rollNo: string;
    name: string;
    email?: string | null;
  } | null;
  members: RegistrationTeamMember[];
  invitations?: Array<{
    id: string;
    studentId: string;
    student: { id: string; rollNo: string; name: string; email?: string | null };
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    invitedAt: string;
  }>;
  registrations?: Array<{
    id: string;
    student: { id: string; rollNo: string; name: string };
  }>;
}

export interface RegistrationItem {
  id: string;
  eventId: string;
  studentId: string;
  status: RegistrationStatus;
  teamId?: string | null;
  registeredAt: string;
  updatedAt: string;
  student: {
    id: string;
    rollNo: string;
    name: string;
    email: string | null;
    year: number;
    section: string;
    branch: string;
  };
  event: {
    id: string;
    name: string;
    slug: string;
    year: number;
    status: string;
  };
  team: RegistrationTeam | null;
  answers: RegistrationAnswerItem[];
}

export interface RegistrationStats {
  total: number;
  confirmed: number;
  pending: number;
  waitlisted: number;
  cancelled: number;
  rejected: number;
  totalTeams?: number;
  completedTeams?: number;
}

export interface RegistrationsResponse {
  registrations: RegistrationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: RegistrationStats;
}

export interface AnalyticsResponse {
  summary: {
    totalStudents: number;
    totalSubmissions: number;
    totalRated: number;
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
  timestamp: string;
}

export interface StorageStatsResponse {
  drive: {
    status: string;
    account: string;
    mode: string;
    rootFolder: string;
    cacheEntriesCount: number;
    recentCache: Array<{
      id: string;
      folderKey: string;
      folderId: string;
      updatedAt: string;
    }>;
  };
  inventory: {
    totalFiles: number;
    submissionVideos: number;
    introVideos: number;
    resumes: number;
    certificates: number;
    achievementProofs: number;
    profilePhotos: number;
  };
  system: {
    memoryUsedMb: number;
    uptimeSeconds: number;
    database: string;
  };
}

export interface EmailTemplateItem {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  status: string;
  createdAt: string;
}

export interface EmailAutomationItem {
  id: string;
  name: string;
  trigger: string;
  description: string | null;
  status: 'ACTIVE' | 'PAUSED';
  templateId: string;
  template: EmailTemplateItem;
  targetYear?: number | null;
  targetSection?: string | null;
  targetAll: boolean;
  lastRunAt?: string | null;
  history?: Array<{
    id: string;
    runAt: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    status: string;
  }>;
}

export interface EmailHistoryResponse {
  automationRuns: Array<{
    id: string;
    automationId: string;
    automation: {
      name: string;
      trigger: string;
      template: { name: string; subject: string };
    };
    runAt: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    status: string;
  }>;
  emailLogs: Array<{
    id: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    sentAt: string;
    status: string;
    error?: string | null;
  }>;
}

export interface RolePermissionItem {
  id: string;
  roleId: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: RolePermissionItem[];
  assignments: Array<{
    id: string;
    adminId: string;
    admin: {
      id: string;
      username: string;
      email: string;
      role: string;
    };
  }>;
}

export interface AdminAccountItem {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface RolesResponse {
  roles: RoleItem[];
  admins: AdminAccountItem[];
}

export interface SettingsResponse {
  settings: Record<string, string>;
  raw: Array<{
    id: string;
    key: string;
    value: string;
    updatedBy?: string | null;
    updatedAt: string;
  }>;
}

// Moderation
export type ModerationType = 'videos' | 'resumes' | 'certificates' | 'achievements' | 'projects';

export interface ModerationDecisionData {
  action: 'approve' | 'reject' | 'changes' | 'hide' | string;
  reason?: string;
  publish?: boolean;
}

export interface ModerationDecisionResult {
  success?: boolean;
  message?: string;
  video?: any;
  resume?: any;
  certificate?: any;
  achievement?: any;
  project?: any;
  isPublic?: boolean;
  [key: string]: any;
}

export interface ModerationBaseItem {
  id: string;
  studentName: string;
  studentRoll: string;
  status: string;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  submittedAt?: string;
  createdAt?: string;
  title?: string;
  reason?: string;
  reviewNote?: string | null;
  driveFileId?: string | null;
  fileDriveId?: string | null;
  proofDriveId?: string | null;
  watchUrl?: string | null;
  previewUrl?: string | null;
  [key: string]: any;
}

export interface ModerationVideoItem extends ModerationBaseItem {
  submittedAt: string;
  isPublic: boolean;
  publicUrl?: string | null;
  changeRequestedAt?: string | null;
  changeRequestNote?: string | null;
}

export interface ModerationResumeItem extends ModerationBaseItem {
  driveFileId?: string | null;
}

export interface ModerationAchievementItem extends ModerationBaseItem {
  description?: string | null;
  organization?: string | null;
  category?: string;
  proofUrl?: string | null;
}

export interface ModerationCertificateItem extends ModerationBaseItem {
  issuer?: string | null;
  fileDriveId?: string | null;
}

export interface ModerationProjectItem extends ModerationBaseItem {
  description?: string | null;
  technologies?: string[];
  githubUrl?: string | null;
  driveVideoUrl?: string | null;
  isPublic?: boolean;
}

export interface UnifiedModerationItem {
  id: string;
  type: ModerationType;
  itemType: 'video' | 'resume' | 'certificate' | 'project' | 'achievement';
  studentId: string;
  studentName: string;
  studentRoll: string;
  studentYear?: number;
  studentSection?: string;
  studentBranch?: string;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  driveFileId?: string | null;
  fileDriveId?: string | null;
  proofDriveId?: string | null;
  proofUrl?: string | null;
  status: string;
  submittedAt: string;
  isPublic?: boolean;
  publicUrl?: string | null;
  reviewNote?: string | null;
  technologies?: string[];
  githubUrl?: string | null;
  driveVideoUrl?: string | null;
  organization?: string | null;
  category?: string;
  [key: string]: any;
}

