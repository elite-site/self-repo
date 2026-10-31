import { client } from '@/shared/api/client';
import type {
  CodeChefStatus,
  CodeChefDetails,
  ConnectCodeChefPayload,
  VerifyCodeChefResult,
} from '../types';

const isMock = import.meta.env.VITE_CODECHEF_MOCK === 'true';

const mockStatus: CodeChefStatus = {
  connected: true,
  status: 'CONNECTED',
  handle: 'chef_candidate',
  displayName: 'Candidate Chef',
  avatarUrl: 'https://cdn.codechef.com/sites/all/themes/abessive/images/user_default_thumb.jpg',
  verified: true,
  verifiedAt: new Date().toISOString(),
  verifyCode: null,
  verifyCodeExpiresAt: null,
  showPublic: true,
  currentRating: 1850,
  maxRating: 1920,
  stars: 4,
  globalRank: 4200,
  totalSolved: 340,
  totalContests: 28,
  lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
  lastError: null,
  syncCooldown: {
    canSync: true,
    nextSyncAllowedAt: null,
    cooldownMinutes: 15,
    manualSyncCountToday: 1,
    dailyCap: 10,
  },
};

const mockDetails: CodeChefDetails = {
  handle: 'chef_candidate',
  verified: true,
  status: 'CONNECTED',
  lastSyncedAt: new Date().toISOString(),
  profile: {
    displayName: 'Candidate Chef',
    username: 'chef_candidate',
    avatar: 'https://cdn.codechef.com/sites/all/themes/abessive/images/user_default_thumb.jpg',
    country: 'India',
    countryFlag: 'https://cdn.codechef.com/download/flags/24/in.png',
    institution: 'ELITE Institute of Technology',
    company: null,
    bio: 'Competitive programmer | 4 Star @ CodeChef',
    websites: ['https://github.com/chef_candidate'],
    social: {
      github: 'chef_candidate',
      twitter: null,
      linkedin: null,
    },
  },
  summary: {
    totalSolved: 340,
    totalActiveDays: 145,
    totalContests: 28,
    currentRating: 1850,
    maxRating: 1920,
    stars: 4,
    rank: '4★',
    globalRanking: 4200,
    topPercentage: 3.2,
    longestStreak: 21,
    currentStreak: 5,
    badgesCount: 4,
  },
  contests: [
    { name: 'Starters 120 (Div 2)', date: '2026-02-14', timestamp: 1771027200, rating: 1850, ranking: 412, problemsSolved: 4, totalProblems: 6 },
    { name: 'Cook-Off Feb 2026', date: '2026-02-01', timestamp: 1769904000, rating: 1810, ranking: 520, problemsSolved: 3, totalProblems: 5 },
    { name: 'Starters 119 (Div 2)', date: '2026-01-20', timestamp: 1768867200, rating: 1780, ranking: 630, problemsSolved: 3, totalProblems: 6 },
  ],
  heatmap: {
    totalSubmissions: 580,
    currentStreak: 5,
    longestStreak: 21,
    dailyContributions: [
      { date: '2026-02-14', count: 4, level: 2 },
      { date: '2026-02-15', count: 2, level: 1 },
      { date: '2026-02-16', count: 6, level: 3 },
    ],
  },
  topics: [
    { topic: 'Dynamic Programming', count: 65 },
    { topic: 'Graphs & Trees', count: 52 },
    { topic: 'Data Structures', count: 88 },
    { topic: 'Math & Number Theory', count: 45 },
  ],
  difficulty: { Easy: 140, Medium: 160, Hard: 40 },
  badges: [
    { title: 'Super Solver', icon: '🏆', description: 'Solved 300+ challenges' },
    { title: 'Contest Enthusiast', icon: '⚡', description: 'Participated in 25+ rated contests' },
  ],
};

export const codechefApi = {
  async getStatus(): Promise<CodeChefStatus> {
    if (isMock) return { ...mockStatus };
    const res = await client.get('/student/codechef/status');
    return res.data;
  },

  async getDetails(): Promise<CodeChefDetails> {
    if (isMock) return { ...mockDetails };
    const res = await client.get('/student/codechef/details');
    return res.data;
  },

  async connect(payload: ConnectCodeChefPayload): Promise<CodeChefStatus> {
    if (isMock) {
      mockStatus.connected = true;
      mockStatus.handle = payload.handle;
      mockStatus.verified = false;
      mockStatus.status = 'UNVERIFIED';
      mockStatus.verifyCode = 'ELITE-9X2K7Q';
      return { ...mockStatus };
    }
    const res = await client.post('/student/codechef/connect', payload);
    return res.data;
  },

  async verify(): Promise<VerifyCodeChefResult> {
    if (isMock) {
      mockStatus.verified = true;
      mockStatus.status = 'CONNECTED';
      mockStatus.verifyCode = null;
      return { verified: true, message: 'Ownership verified successfully', verifiedAt: new Date().toISOString() };
    }
    const res = await client.post('/student/codechef/verify');
    return res.data;
  },

  async sync(): Promise<CodeChefStatus> {
    if (isMock) {
      mockStatus.lastSyncedAt = new Date().toISOString();
      return { ...mockStatus };
    }
    const res = await client.post('/student/codechef/sync');
    return res.data;
  },

  async setVisibility(showPublic: boolean): Promise<{ success: boolean; showPublic: boolean }> {
    if (isMock) {
      mockStatus.showPublic = showPublic;
      return { success: true, showPublic };
    }
    const res = await client.put('/student/codechef/visibility', { showPublic });
    return res.data;
  },

  async disconnect(): Promise<{ success: boolean }> {
    if (isMock) {
      mockStatus.connected = false;
      mockStatus.status = 'NOT_CONNECTED';
      mockStatus.handle = null;
      mockStatus.verified = false;
      return { success: true };
    }
    const res = await client.delete('/student/codechef');
    return res.data;
  },
};
