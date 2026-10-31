import { client } from '@/shared/api/client';
import {
  GithubStatusResponse,
  GithubSummaryResponse,
  GithubRepoItem,
} from '@/shared/types';

export const githubApi = {
  async getGithubSummary(): Promise<GithubSummaryResponse> {
    const res = await client.get('/student/github/summary');
    return res.data;
  },
  async getGithubStatus(): Promise<GithubStatusResponse> {
    const res = await client.get('/student/github');
    return res.data;
  },
  async getGithubRepoReadme(repoId: string): Promise<{ id: string; readmeExcerpt: string | null }> {
    const res = await client.get(`/student/github/repos/${encodeURIComponent(repoId)}/readme`);
    return res.data;
  },
  async connectGithub(): Promise<{ url: string }> {
    const res = await client.post('/student/github/connect');
    return res.data;
  },
  async syncGithub(): Promise<{ message?: string; status?: string; nextSyncAllowedAt?: string }> {
    const res = await client.post('/student/github/sync');
    return res.data;
  },
  async updateShowcase(repoIds: string[]): Promise<{ success: boolean; showcased?: GithubRepoItem[] }> {
    const res = await client.put('/student/github/showcase', { repoIds });
    return res.data;
  },
  async updateSkillShowcase(skillIds: string[]): Promise<{ success: boolean; showcasedSkillIds: string[] }> {
    const res = await client.put('/student/github/skills/showcase', { skillIds });
    return res.data;
  },
  async disconnectGithub(): Promise<{ success: boolean }> {
    const res = await client.delete('/student/github');
    return res.data;
  },
  async snoozeGithubReminder(): Promise<{ success: boolean; snoozedUntil?: string }> {
    const res = await client.post('/student/github/reminder/snooze');
    return res.data;
  },
};
