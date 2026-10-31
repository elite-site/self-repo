import { apiClient } from '@/shared/api';
import type {
  AdminCodeChefStudentsResponse,
  CodeChefLeaderboardResponse,
  CodeChefAdminStatsResponse,
  AdminCodeChefFilters,
  CodeChefDetails,
} from '../types';

const isMock = import.meta.env.VITE_CODECHEF_MOCK === 'true';

const mockStudents: AdminCodeChefStudentsResponse = {
  students: [
    {
      id: 'acc_1',
      studentId: 'stud_1',
      name: 'Aditya Varma',
      rollNo: '21A91A0501',
      year: 4,
      section: 'CSE-A',
      handle: 'aditya_v',
      verified: true,
      status: 'CONNECTED',
      currentRating: 1980,
      stars: 4,
      totalSolved: 420,
      totalContests: 35,
      lastSyncedAt: new Date().toISOString(),
    },
    {
      id: 'acc_2',
      studentId: 'stud_2',
      name: 'Bhavya Sri',
      rollNo: '22A91A0502',
      year: 3,
      section: 'CSE-B',
      handle: 'bhavya_s',
      verified: false,
      status: 'UNVERIFIED',
      currentRating: 1640,
      stars: 3,
      totalSolved: 195,
      totalContests: 14,
      lastSyncedAt: new Date().toISOString(),
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockLeaderboard: CodeChefLeaderboardResponse = {
  leaderboard: [
    {
      rank: 1,
      studentId: 'stud_1',
      name: 'Aditya Varma',
      rollNo: '21A91A0501',
      year: 4,
      handle: 'aditya_v',
      currentRating: 1980,
      stars: 4,
      totalSolved: 420,
      totalContests: 35,
    },
  ],
};

const mockStats: CodeChefAdminStatsResponse = {
  totalStudents: 120,
  connectedCount: 45,
  connectedPercentage: 37.5,
  verifiedCount: 38,
  activeThisMonthCount: 32,
  staleCount: 5,
  errorCount: 2,
  starsDistribution: { 1: 8, 2: 12, 3: 15, 4: 8, 5: 2, 6: 0, 7: 0 },
};

export const adminCodeChefApi = {
  async getStudents(filters?: AdminCodeChefFilters): Promise<AdminCodeChefStudentsResponse> {
    if (isMock) return { ...mockStudents };
    const res = await apiClient.get('/admin/api/codechef/students', { params: filters });
    return res.data;
  },

  async getLeaderboard(params?: { year?: number; limit?: number }): Promise<CodeChefLeaderboardResponse> {
    if (isMock) return { ...mockLeaderboard };
    const res = await apiClient.get('/admin/api/codechef/leaderboard', { params });
    return res.data;
  },

  async getStats(): Promise<CodeChefAdminStatsResponse> {
    if (isMock) return { ...mockStats };
    const res = await apiClient.get('/admin/api/codechef/stats');
    return res.data;
  },

  async getStudentDetails(studentId: string): Promise<CodeChefDetails> {
    if (isMock) {
      return {
        handle: 'mock_student',
        verified: true,
        status: 'CONNECTED',
        lastSyncedAt: new Date().toISOString(),
        profile: {
          displayName: 'Mock Student',
          username: 'mock_student',
          avatar: null,
          country: 'India',
          countryFlag: null,
          institution: 'ELITE College',
          company: null,
          bio: 'CodeChef competitive programmer',
          websites: [],
          social: { github: null, twitter: null, linkedin: null },
        },
        summary: {
          totalSolved: 210,
          totalActiveDays: 85,
          totalContests: 18,
          currentRating: 1650,
          maxRating: 1720,
          stars: 3,
          rank: '3★',
          globalRanking: 8500,
          topPercentage: 8.5,
          longestStreak: 14,
          currentStreak: 3,
          badgesCount: 2,
        },
        contests: [],
        heatmap: { totalSubmissions: 310, currentStreak: 3, longestStreak: 14, dailyContributions: [] },
        topics: [],
        difficulty: { Easy: 120, Medium: 80, Hard: 10 },
        badges: [],
      };
    }
    const res = await apiClient.get(`/admin/api/codechef/students/${studentId}`);
    return res.data;
  },

  async resyncStudent(studentId: string): Promise<{ success: boolean; message: string }> {
    if (isMock) return { success: true, message: 'Sync initiated' };
    const res = await apiClient.post(`/admin/api/codechef/students/${studentId}/resync`);
    return res.data;
  },

  async verifyStudent(studentId: string): Promise<{ success: boolean; verified: boolean }> {
    if (isMock) return { success: true, verified: true };
    const res = await apiClient.post(`/admin/api/codechef/students/${studentId}/verify`);
    return res.data;
  },

  async unlinkStudent(studentId: string): Promise<{ success: boolean; message: string }> {
    if (isMock) return { success: true, message: 'Account unlinked' };
    const res = await apiClient.delete(`/admin/api/codechef/students/${studentId}`);
    return res.data;
  },
};
