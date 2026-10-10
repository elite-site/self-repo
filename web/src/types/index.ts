export interface StudentSubmission {
  id: string;
  studentId?: string;
  status: string;
  submittedAt: string;
  videoUploaded: boolean;
  videoUrl?: string | null;
  reviewText: string | null;
  reviewPros: string[];
  reviewCons: string[];
  reviewedAt: string | null;
  adminNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Moderation + public visibility state of the student's introduction video. */
export interface StudentIntroVideo {
  id: string;
  status: string;
  reviewNote: string | null;
  isPublic: boolean;
  publishedAt: string | null;
  changeRequestedAt: string | null;
  changeRequestNote: string | null;
  submittedAt: string;
  filename: string | null;
  mimeType: string | null;
  sizeMb: number | null;
  hasFile: boolean;
  driveFileId?: string | null;
  thumbnailUrl?: string | null;
}

/** An approved + published video as exposed on the public showcase. */
export interface PublicIntroVideo {
  id: string;
  name: string;
  rollNo: string;
  year: number;
  section: string;
  submittedAt: string;
  publishedAt: string | null;
  sizeMb: number | null;
  streamUrl: string;
  thumbnailUrl?: string | null;
  profileUrl: string;
  driveFileId?: string | null;
  previewUrl?: string | null;
}

export interface StudentProfile {
  id?: string;
  name: string;
  email: string | null;
  rollNo: string;
  year: number;
  section: string;
  branch: string;
  bio?: string;
  specialQualities?: string;
  skills: string[];
  photoUrl?: string;
  viewUrl?: string;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
  photoZoom?: number | null;
  githubUrl?: string;
  linkedinUrl?: string;
  leetcodeUrl?: string;
  codechefUrl?: string;
  portfolioUrl?: string;
  status?: 'ACTIVE' | 'GRADUATED';
  graduatedAt?: string | null;
  submission?: StudentSubmission | null;
  video?: StudentIntroVideo | null;
  /**
   * The effective, administrator-configured introduction-video size limit in
   * megabytes. The server sends this so the client pre-checks against the same
   * number the server enforces, instead of duplicating the default here.
   */
  maxVideoSizeMb?: number;
}

export interface StudentSession {
  student: StudentProfile;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  videoUrl?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  organization: string;
  category: string;
  proofUrl?: string;
  viewUrl?: string;
  watchUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string | null;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  reviewNote?: string | null;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  date: string;
  fileUrl: string;
  viewUrl?: string;
  watchUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'CHANGES_REQUESTED';
  reviewNote?: string | null;
  isPublic?: boolean;
}

export interface PublicSkill {
  id: string;
  name: string;
  category?: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  eligibility: string;
  deadline: string;
  /** Both the student and public event endpoints return the raw event row. */
  status?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  status: RegistrationStatus;
  registeredAt: string;
}

/**
 * Mirrors the Prisma `RegistrationStatus` enum exactly. There is deliberately no
 * `REGISTERED` member — the backend never emits it, so gating "am I registered?"
 * on it silently treated every `PENDING` registration as unregistered.
 */
export type RegistrationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'WAITLISTED';

/**
 * A registration that still holds a slot. `PENDING` and `CONFIRMED` both count —
 * `CANCELLED`, `REJECTED` and `WAITLISTED` do not.
 */
export const isActiveRegistration = (status: RegistrationStatus | string | undefined): boolean =>
  status === 'PENDING' || status === 'CONFIRMED';

export interface Team {
  id: string;
  name: string;
  members: string[]; // roll numbers or names
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  fromName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export interface VotingCampaign {
  id: string;
  title: string;
  description: string;
  endDate?: string;
  endsAt?: string;
  startsAt?: string;
  startDate?: string;
  status?: string;
  candidates?: VotingCandidate[];
  event?: any;
}

export interface VotingCandidate {
  id: string;
  name: string;
  rollNo: string;
  photoUrl?: string;
  bio: string;
  year: number;
  section: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  content?: string | null;
  isRead: boolean;
  status?: string;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  url?: string | null;
  href?: string | null;
  link?: string | null;
  targetUrl?: string | null;
  slug?: string | null;
  announcementId?: string | null;
  eventId?: string | null;
  campaignId?: string | null;
  teamId?: string | null;
  registrationId?: string | null;
  profileId?: string | null;
  rollNo?: string | null;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  body?: string;
  priority?: string;
  status?: string;
  targetYear?: number | null;
  targetSection?: string | null;
  targetAll?: boolean;
  publishedAt?: string | null;
  createdAt: string;
  createdBy?: string;
}

export type GithubSyncStatus = 'IDLE' | 'QUEUED' | 'RUNNING' | 'FAILED';

export interface GithubAccountInfo {
  id?: string;
  login: string;
  avatarUrl?: string | null;
  connectedAt: string;
  lastSyncedAt?: string | null;
  nextSyncAllowedAt?: string | null;
  syncStatus: GithubSyncStatus;
  syncError?: string | null;
  manualSyncCountToday?: number;
}

export interface GithubRepoItem {
  id: string;
  githubRepoId?: string | number;
  fullName: string;
  name: string;
  description?: string | null;
  htmlUrl: string;
  isFork: boolean;
  primaryLanguage?: string | null;
  topics: string[];
  stars: number;
  githubCreatedAt?: string | null;
  pushedAt?: string | null;
  languages?: Record<string, number>;
  commitCount: number;
  isShowcased: boolean;
  showcaseRank?: number | null;
  readmeExcerpt?: string | null;
  readmeFetchedAt?: string | null;
}

export interface GithubSkillItem {
  id: string;
  skillId?: string;
  name: string;
  category?: string | null;
  repoCount: number;
  totalBytes?: number | string;
  lastEvidenceAt?: string | null;
}

export interface GithubStatusResponse {
  connected: boolean;
  account?: GithubAccountInfo | null;
  repos?: GithubRepoItem[];
  showcase?: GithubRepoItem[];
  skills?: GithubSkillItem[];
  reminderSnoozed?: boolean;
  reminderSnoozedUntil?: string | null;
  nextSyncAllowedAt?: string | null;
}

export interface StudentPortfolioResponse {
  source?: 'GITHUB' | 'LEGACY';
  connected: boolean;
  account?: GithubAccountInfo | null;
  githubAccount?: GithubAccountInfo | null;
  repos?: GithubRepoItem[];
  showcased?: GithubRepoItem[];
  showcasedRepos?: GithubRepoItem[];
  skills?: GithubSkillItem[];
  projects?: Project[];
  student?: StudentProfile;
}

export interface StudentDashboardResponse {
  profile: (StudentProfile & {
    biography?: string | null;
    video?: { status: string } | null;
    submission?: { submittedAt: string } | null;
  }) | null;
  counts: {
    projects: number;
    achievements: number;
    certificates: number;
  };
  resume: {
    exists: boolean;
    status?: string | null;
    driveFileId?: string | null;
  } | null;
  events: Array<{
    id: string;
    title: string;
    type?: string;
    date: string;
    eligibility?: string;
  }>;
  registrations: Array<{
    id: string;
    eventId: string;
    status: string;
  }>;
  votingCampaigns: Array<{
    id: string;
    title: string;
    description?: string | null;
  }>;
  notifications: Array<Notification & { isRead?: boolean }>;
  unreadNotificationsCount: number;
  github: {
    connected: boolean;
    reminderSnoozedUntil: string | null;
  };
}

export interface GithubSummaryResponse {
  connected: boolean;
  login?: string | null;
  lastSyncedAt?: string | null;
  syncStatus?: string | null;
  reminderSnoozedUntil?: string | null;
  repoCount: number;
  showcasedCount: number;
}


