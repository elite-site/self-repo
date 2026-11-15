import { Request, Response } from 'express';
import { cacheService } from './cache.service';

/**
 * GET /video-cache
 * List paginated video cache entries with capacity totals.
 * SEC-4: Response strictly excludes driveFileId and r2Key.
 */
export async function getVideoCacheStatus(req: Request, res: Response): Promise<void> {
  const result = await cacheService.getVideoCacheStatus(req.query as any);
  res.json(result);
}

/**
 * POST /video-cache/:id/retry
 * Reset a FAILED cache entry to COPYING and trigger background copy.
 */
export async function retryFailedCopy(req: Request, res: Response): Promise<void> {
  const result = await cacheService.retryFailedCopy(req.params.id);
  res.json(result);
}

/**
 * POST /video-cache/purge-idle
 * Trigger eviction of idle unleased cache entries to free storage.
 */
export async function purgeIdleCache(_req: Request, res: Response): Promise<void> {
  const result = await cacheService.purgeIdleCache();
  res.json(result);
}
