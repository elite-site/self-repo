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
