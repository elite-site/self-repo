export type CodeChefConnectionStatus = 'CONNECTED' | 'UNVERIFIED' | 'STALE' | 'ERROR' | 'NOT_CONNECTED';

export interface CodeChefStatus {
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

export interface CodeChefContestEntry {
  name: string;
  date: string;
  timestamp: number;
  rating: number | null;
  ranking: number | null;
  problemsSolved: number | null;
  totalProblems: number | null;
}

export interface CodeChefHeatmapDay {
  date: string;
  count: number;
  level?: number;
}

export interface CodeChefDetails {
  handle: string;
  verified: boolean;
  status: CodeChefConnectionStatus;
  lastSyncedAt: string | null;
  profile: {
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
  };
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
  badges: Array<{
    name?: string;
    title?: string;
    icon?: string;
    description?: string;
  }>;
}

export interface ConnectCodeChefPayload {
  handle: string;
}

export interface VerifyCodeChefResult {
  verified: boolean;
  message: string;
  verifiedAt: string | null;
}
