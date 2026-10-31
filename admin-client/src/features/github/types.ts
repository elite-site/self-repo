export interface GithubAccount {
  id: string;
  studentId: string;
  login: string;
  reposCount: number;
  showcasedCount: number;
  syncStatus: 'COMPLETED' | 'FAILED' | 'SYNCING' | 'PENDING';
  syncError?: string | null;
  lastSyncedAt?: string | null;
  student?: {
    name: string;
    rollNo: string;
  };
}

export interface GithubOverview {
  total: number;
  accounts: GithubAccount[];
}

export interface GithubLog {
  id: string;
  startedAt: string;
  student?: {
    name: string;
    rollNo: string;
  };
  trigger: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED_RATE_LIMIT' | string;
  apiCalls?: number;
  rateRemaining?: number | string;
  error?: string | null;
  details?: string | null;
}

/**
 * A showcased repository as returned by `GET /admin/api/portal/github/projects`.
 *
 * Mirrors the Prisma `GithubRepo` row plus the joined student fields selected in
 * `backend/src/modules/github/github.repository.ts` (`findGithubShowcasedRepos`).
 * `githubRepoId` is a BigInt on the server and the service serialises it to a
 * string, so it is a string here.
 */
export interface GithubShowcasedProject {
  id: string;
  studentId: string;
  githubRepoId: string;
  fullName: string;
  name: string;
  description: string | null;
  htmlUrl: string;
  isFork: boolean;
  primaryLanguage: string | null;
  topics: string[];
  stars: number;
  githubCreatedAt: string | null;
  pushedAt: string | null;
  readmeExcerpt: string | null;
  readmeFetchedAt: string | null;
  languages: Record<string, number>;
  dependencies: string[];
  commitCount: number;
  firstCommitAt: string | null;
  lastCommitAt: string | null;
  isShowcased: boolean;
  showcaseRank: number | null;
  etag: string | null;
  syncedAt: string;
  removedFromGithub: boolean;
  student: {
    id: string;
    name: string;
    rollNo: string;
    year: number;
    section: string;
  };
}

export interface GithubShowcasedProjectsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: GithubShowcasedProject[];
}
