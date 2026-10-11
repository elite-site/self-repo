import * as adminRepo from '../admin.repository';

export async function getStorageInfo() {
  const inventory = await adminRepo.getStorageInventory();
  const totalFiles =
    inventory.submissionVideos +
    inventory.introVideos +
    inventory.resumes +
    inventory.certificates +
    inventory.achievementProofs +
    inventory.profilePhotos;

  const mem = process.memoryUsage();
  const memoryUsedMb = Math.round(mem.rss / (1024 * 1024));

  return {
    drive: {
      status: 'CONNECTED',
      account: 'organizer@sasi.ac.in',
      mode: 'OAuth 2.0 Workspace Token',
      rootFolder: 'ELITE_PORTAL_ROOT',
      cacheEntriesCount: inventory.cacheCount,
      recentCache: inventory.cacheEntries,
    },
    inventory: {
      totalFiles,
      ...inventory,
    },
    system: {
      memoryUsedMb,
      uptimeSec: Math.round(process.uptime()),
      nodeVersion: process.version,
    },
  };
}

export async function clearStorageCache() {
  return adminRepo.clearDriveFolderCache();
}
