export type CodeChefConnectionStatus = 'CONNECTED' | 'UNVERIFIED' | 'STALE' | 'ERROR' | 'NOT_CONNECTED';

export interface AdminCodeChefStudentItem {
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

export interface AdminCodeChefStudentsResponse {
  students: AdminCodeChefStudentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CodeChefLeaderboardItem {
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
}

export interface CodeChefLeaderboardResponse {
  leaderboard: CodeChefLeaderboardItem[];
}

export interface CodeChefAdminStatsResponse {
  totalStudents: number;
  connectedCount: number;
  connectedPercentage: number;
  verifiedCount: number;
  activeThisMonthCount: number;
  staleCount: number;
  errorCount: number;
  starsDistribution: Record<number, number>;
}

export interface AdminCodeChefFilters {
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
  contests: Array<{
    name: string;
    date: string;
    timestamp: number;
    rating: number | null;
    ranking: number | null;
    problemsSolved: number | null;
    totalProblems: number | null;
  }>;
  heatmap: {
    totalSubmissions: number;
    currentStreak: number;
    longestStreak: number;
    dailyContributions: Array<{ date: string; count: number; level?: number }>;
    yearlyContributions?: Array<{ year: number; total: number }>;
  };
  topics: Array<{ topic: string; count: number }>;
  difficulty: Record<string, number>;
  badges: Array<{ title?: string; icon?: string; description?: string }>;
}
