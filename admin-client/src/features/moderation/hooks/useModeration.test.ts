import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const moderationApiMock = vi.hoisted(() => ({
  getModerationItems: vi.fn(),
}));

const githubApiMock = vi.hoisted(() => ({
  getGithubShowcasedProjects: vi.fn(),
}));

vi.mock('../api', () => ({ moderationApi: moderationApiMock }));
vi.mock('@/features/github/api', () => ({ githubApi: githubApiMock }));

import { useModeration } from './useModeration';
import type { UnifiedModerationItem } from '../types';
import type { GithubShowcasedProject } from '@/features/github/types';

const queueItem: UnifiedModerationItem = {
  id: 'video-1',
  type: 'videos',
  itemType: 'video',
  studentId: 'student-1',
  studentName: 'Student One',
  studentRoll: 'R001',
  title: 'Intro video',
  status: 'PENDING',
  submittedAt: '2026-01-01T00:00:00.000Z',
};

const githubProject: GithubShowcasedProject = {
  id: 'repo-1',
  studentId: 'student-1',
  githubRepoId: '123456',
  fullName: 'student-one/portfolio',
  name: 'portfolio',
  description: 'My portfolio site',
  htmlUrl: 'https://github.com/student-one/portfolio',
  isFork: false,
  primaryLanguage: 'TypeScript',
  topics: ['react'],
  stars: 12,
  githubCreatedAt: '2025-01-01T00:00:00.000Z',
  pushedAt: '2026-01-01T00:00:00.000Z',
  readmeExcerpt: '# Portfolio',
  readmeFetchedAt: null,
  languages: { TypeScript: 100 },
  dependencies: [],
  commitCount: 4,
  firstCommitAt: '2025-01-01T00:00:00.000Z',
  lastCommitAt: '2026-01-01T00:00:00.000Z',
  isShowcased: true,
  showcaseRank: 1,
  etag: null,
  syncedAt: '2026-01-01T00:00:00.000Z',
  removedFromGithub: false,
  student: {
    id: 'student-1',
    name: 'Student One',
    rollNo: 'R001',
    year: 3,
    section: 'A',
  },
};

const showcaseResponse = {
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
  items: [githubProject],
};

beforeEach(() => {
  moderationApiMock.getModerationItems.mockReset();
  githubApiMock.getGithubShowcasedProjects.mockReset();
});

describe('useModeration loading', () => {
  it('populates githubProjects from the GitHub showcase API with repository-shaped rows', async () => {
    moderationApiMock.getModerationItems.mockResolvedValue({ items: [queueItem], total: 1 });
    githubApiMock.getGithubShowcasedProjects.mockResolvedValue(showcaseResponse);

    const { result } = renderHook(() => useModeration());

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(result.current.githubProjects).toEqual([githubProject]);
    expect(result.current.githubProjects[0]).toMatchObject({
      htmlUrl: 'https://github.com/student-one/portfolio',
      primaryLanguage: 'TypeScript',
      student: { name: 'Student One', rollNo: 'R001' },
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('keeps the queue and warns when the GitHub showcase call rejects', async () => {
    moderationApiMock.getModerationItems.mockResolvedValue({ items: [queueItem], total: 1 });
    githubApiMock.getGithubShowcasedProjects.mockRejectedValue(new Error('502 Bad Gateway'));

    const { result } = renderHook(() => useModeration());

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(result.current.error).toBeNull();
    expect(result.current.githubProjects).toEqual([]);
    expect(result.current.toast?.type).toBe('error');
    expect(result.current.toast?.message).toContain('projects');
    expect(result.current.loading).toBe(false);
  });

  it('sets the blocking error only when the queue itself fails', async () => {
    moderationApiMock.getModerationItems.mockRejectedValue(new Error('500 Server Error'));
    githubApiMock.getGithubShowcasedProjects.mockResolvedValue(showcaseResponse);

    const { result } = renderHook(() => useModeration());

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toContain("Couldn't load the queue");
    expect(result.current.githubProjects).toEqual([githubProject]);
    expect(result.current.loading).toBe(false);
  });
});
