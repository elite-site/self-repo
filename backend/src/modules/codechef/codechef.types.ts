
export type CodeChefConnectionStatus = 'CONNECTED' | 'UNVERIFIED' | 'STALE' | 'ERROR' | 'NOT_CONNECTED';

export interface CodeChefApiSummary {
  totalSolved: number;
  totalActiveDays: number;
  totalContests: number;
  currentRating: number | null;
  maxRating: number | null;
  rank: string | null;
  badgesCount: number;
}

export interface CodeChefApiProfile {
  displayName: string | null;
  username: string;
  avatar: string | null;
  country: string | null;
  countryFlag: string | null;
  institution: string | null;
  company: string | null;
  bio: string | null;
  websites: string[];
  social: {
    github: string | null;
    twitter: string | null;
    linkedin: string | null;
  };
  verified: boolean;
}

export interface CodeChefContestEntry {
  name: string;
  date: string;
  timestamp: number;
  rating: number | null;
  ranking: number | null;
  problemsSolved: number | null;
  totalProblems: number | null;
}

export interface CodeChefApiContests {
  count: number;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  globalRanking: number | null;
  topPercentage: number | null;
  history: CodeChefContestEntry[];
}

export interface CodeChefApiStats {
  totalSolved: number;
  totalQuestions: number | null;
  acceptanceRate: number | null;
  byDifficulty: Record<string, number>;
  topicAnalysis: Array<{ topic: string; count: number }>;
}

export interface CodeChefHeatmapDay {
  date: string;
  count: number;
  level?: number;
}

export interface CodeChefApiHeatmap {
  totalSubmissions: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  dailyContributions: CodeChefHeatmapDay[];
  yearlyContributions?: Array<{ year: number; total: number }>;
}

export interface CodeChefBadgeEntry {
  name?: string | null;
  title?: string | null;
  icon?: string | null;
  description?: string | null;
}

export interface CodeChefApiBadges {
  count: number;
  list: CodeChefBadgeEntry[];
}

export interface CodeChefStatusDto {
  connected: boolean;
  status: CodeChefConnectionStatus;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  verifiedAt: string | null;
  verifyCode: string | null;
  verifyCodeExpiresAt: string | null;
  showPublic: boolean;
  currentRating: number | null;
  maxRating: number | null;
  stars: number | null;
  globalRank: number | null;
  totalSolved: number | null;
  totalContests: number | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncCooldown: {
    canSync: boolean;
    nextSyncAllowedAt: string | null;
    cooldownMinutes: number;
    manualSyncCountToday: number;
    dailyCap: number;
  };
}

export interface CodeChefDetailsDto {
  handle: string;
  verified: boolean;
  status: CodeChefConnectionStatus;
  lastSyncedAt: string | null;
  profile: CodeChefApiProfile;
  summary: {
    totalSolved: number;
    totalActiveDays: number;
    totalContests: number;
    currentRating: number | null;
    maxRating: number | null;
    stars: number | null;
    rank: string | null;
    globalRanking: number | null;
    topPercentage: number | null;
    longestStreak: number;
    currentStreak: number;
    badgesCount: number;
  };
  contests: CodeChefContestEntry[];
  heatmap: {
    totalSubmissions: number;
    currentStreak: number;
    longestStreak: number;
    dailyContributions: CodeChefHeatmapDay[];
    yearlyContributions?: Array<{ year: number; total: number }>;
  };
  topics: Array<{ topic: string; count: number }>;
  difficulty: Record<string, number>;
  badges: CodeChefBadgeEntry[];
}

export interface AdminCodeChefStudentDto {
  id: string;
  studentId: string;
  name: string;
  rollNo: string;
  year: number;
  section: string;
  handle: string | null;
  verified: boolean;
  status: CodeChefConnectionStatus;
  currentRating: number | null;
  stars: number | null;
  totalSolved: number | null;
  totalContests: number | null;
  lastSyncedAt: string | null;
}

export interface AdminCodeChefFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  year?: number;
  section?: string;
  minRating?: number;
  stars?: number;
  status?: string;
  connected?: boolean;
}

export interface CodeChefLeaderboardDto {
  leaderboard: Array<{
    rank: number;
    studentId: string;
    name: string;
    rollNo: string;
    year: number;
    handle: string;
    currentRating: number;
    stars: number;
    totalSolved: number;
    totalContests: number;
  }>;
}

export interface CodeChefAdminStatsDto {
  totalStudents: number;
  connectedCount: number;
  connectedPercentage: number;
  verifiedCount: number;
  activeThisMonthCount: number;
  staleCount: number;
  errorCount: number;
  starsDistribution: Record<number, number>;
}
