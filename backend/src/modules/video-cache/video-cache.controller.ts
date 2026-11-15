import { Request, Response } from 'express';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../utils/appError';
import { cacheEvictionService } from './cache-eviction.service';

export async function handleInternalEvict(req: Request, res: Response): Promise<void> {
  const secretHeader =
    (req.headers['x-internal-secret'] as string | undefined) ||
    ((req.headers['authorization'] as string | undefined) || '').replace(/^Bearer\s+/i, '');

  if (!env.INTERNAL_SYNC_SECRET || secretHeader !== env.INTERNAL_SYNC_SECRET) {
    throw new UnauthorizedError('Invalid or missing internal sync secret');
  }

  const result = await cacheEvictionService.evictScheduled();
  res.json({
    success: true,
    expiredLeasesDeleted: result.expiredLeasesDeleted,
    evictedCount: result.evictedCount,
    freedBytes: result.freedBytes.toString(),
    timestamp: new Date().toISOString(),
  });
}
