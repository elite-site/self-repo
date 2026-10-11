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
