import { UpstreamError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';
import { DriveContext } from './types';

export interface DriveStorageQuota {
  limitBytes: number;
  usageBytes: number;
  usageInDriveBytes: number;
  availableBytes: number;
}

/**
 * Reads the Drive account's storage quota.
 *
 * Mock mode has no provider account, and some shared drives omit `limit`, so
 * both cases return `null` rather than inventing numbers. A real provider
 * failure is surfaced as `UpstreamError` so the caller can report it instead of
 * showing a misleading zero.
 */
export async function getStorageQuota(ctx: DriveContext): Promise<DriveStorageQuota | null> {
  if (ctx.isMock || !ctx.drive) {
    return null;
  }

  try {
    const res = await ctx.drive.about.get({ fields: 'storageQuota' });
    const quota = res.data.storageQuota;
    if (!quota || quota.limit === null || quota.limit === undefined) {
      return null;
    }

    const limitBytes = Number(quota.limit);
    const usageBytes = Number(quota.usage ?? 0);
    const usageInDriveBytes = Number(quota.usageInDrive ?? 0);
    if (!Number.isFinite(limitBytes) || !Number.isFinite(usageBytes)) {
      return null;
    }

    return {
      limitBytes,
      usageBytes,
      usageInDriveBytes,
      availableBytes: Math.max(0, limitBytes - usageBytes),
    };
  } catch (err) {
    logger.error('Failed to read Google Drive storage quota', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new UpstreamError('Could not read Google Drive storage quota.', 502, 'google-drive');
  }
}
