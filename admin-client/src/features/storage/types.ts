export interface StorageStatsResponse {
  drive: {
    status: string;
    mode: string;
    account: string;
    rootFolder: string;
    cacheEntriesCount: number;
    recentCache: Array<{
      id: string;
      folderKey: string;
      folderId: string;
      updatedAt: string;
    }>;
  };
  inventory: {
    totalFiles: number;
    submissionVideos: number;
    introVideos: number;
    resumes: number;
    certificates: number;
    achievementProofs: number;
    profilePhotos: number;
  };
  system: {
    uptimeSeconds: number;
    memoryUsedMb: number;
    database: string;
  };
}

export type VideoCacheStatus = 'READY' | 'COPYING' | 'FAILED';

export interface VideoCacheEntry {
  id: string;
  status: VideoCacheStatus;
  sizeMb: number | null;
  lastAccessedAt: string;
  activeLeaseCount: number;
  failReason: string | null;
  createdAt: string;
}

export interface VideoCacheResponse {
  entries: VideoCacheEntry[];
  totals: {
    usedBytes: string;
    maxBytes: string;
    counts: {
      ready: number;
      copying: number;
      failed: number;
      total: number;
    };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
