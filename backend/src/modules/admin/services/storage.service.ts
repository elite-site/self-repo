import * as adminRepo from '../admin.repository';
import { driveService } from '../../media/drive';
import { UpstreamError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

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

/** Re-applies viewer access to every stored Drive file and folder. */
export async function ensureViewerPermissions(): Promise<{ count: number; failed: number }> {
  try {
    return await driveService.ensureAllFilesViewerAccess();
  } catch (err) {
    logger.error('Drive viewer permission sweep failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new UpstreamError('Could not update viewer permissions on Google Drive.', 502, 'google-drive');
  }
}
