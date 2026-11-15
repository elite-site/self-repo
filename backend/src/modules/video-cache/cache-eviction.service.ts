import { VideoCacheStatus } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { r2Adapter } from '../../infrastructure/r2';
import { cacheRepository, CacheRepository, EvictableVideoCache } from './cache.repository';

export class CacheEvictionService {
  constructor(private repo: CacheRepository = cacheRepository) {}

  /**
   * Delete expired leases (expiresAt <= now).
   */
  async cleanExpiredLeases(): Promise<number> {
    const deleted = await this.repo.deleteExpiredLeases(new Date());
    if (deleted > 0) {
      logger.info('Cleaned expired video leases', { deleted });
    }
    return deleted;
  }

  /**
   * Free enough room to fit neededBytes.
   *
   * 1. Calculate total ready bytes.
   * 2. If totalBytes + neededBytes <= env.VIDEO_CACHE_MAX_BYTES -> return true.
   * 3. Under pressure: find evictable candidates.
   *    Evictable condition:
   *      - status === 'READY'
   *      - ZERO unexpired leases (expiresAt > now)
   *      - lastUrlIssuedAt === null || lastUrlIssuedAt < now - env.VIDEO_URL_TTL_SEC * 1000
   *      - idleMs >= env.VIDEO_CACHE_IDLE_HOURS * 3600 * 1000
   * 4. Evict in LRU order (lastAccessedAt ASC) one by one until totalBytes + neededBytes <= env.VIDEO_CACHE_MAX_BYTES.
   * 5. Returns true if sufficient room made, false otherwise.
   */
  async evictToFit(neededBytes: bigint): Promise<boolean> {
    await this.cleanExpiredLeases();

    let totalBytes = await this.repo.sumReadyBytes();
    if (totalBytes + neededBytes <= env.VIDEO_CACHE_MAX_BYTES) {
      return true;
    }

    const now = new Date();
    const idleThresholdMs = env.VIDEO_CACHE_IDLE_HOURS * 3600 * 1000;
    const candidates = await this.repo.findEvictableCandidates(idleThresholdMs);

    const urlSafeCutoff = new Date(now.getTime() - env.VIDEO_URL_TTL_SEC * 1000);

    for (const candidate of candidates) {
      if (!this.isCandidateEvictable(candidate, now, urlSafeCutoff, idleThresholdMs)) {
        continue;
      }

      const result = await this.repo.atomicDeleteIfEvictable(candidate.id, now);
      if (result.deleted) {
        if (result.r2Key && result.r2Key.startsWith('lesson-cache/')) {
          try {
            await r2Adapter.deleteObject(result.r2Key);
          } catch (err: unknown) {
            logger.warn('Failed to delete evicted video object from R2', {
              cacheId: candidate.id,
              error: (err as Error).message,
            });
          }
        }

        const candidateSize = result.sizeBytes ?? candidate.sizeBytes ?? BigInt(0);
        totalBytes -= candidateSize;

        logger.info('Evicted video cache entry to fit new video', {
          cacheId: candidate.id,
          freedBytes: candidateSize.toString(),
          remainingBytes: totalBytes.toString(),
        });

        if (totalBytes + neededBytes <= env.VIDEO_CACHE_MAX_BYTES) {
          return true;
        }
      }
    }

    return totalBytes + neededBytes <= env.VIDEO_CACHE_MAX_BYTES;
  }

  /**
   * Periodic eviction task triggered via scheduler / internal endpoint.
   * Cleans expired leases and evicts entries meeting idle criteria.
   */
  async evictScheduled(): Promise<{
    expiredLeasesDeleted: number;
    evictedCount: number;
    freedBytes: bigint;
  }> {
    const expiredLeasesDeleted = await this.cleanExpiredLeases();

    let totalBytes = await this.repo.sumReadyBytes();
    const isUnderPressure = totalBytes > env.VIDEO_CACHE_MAX_BYTES;

    const idleHours = isUnderPressure
      ? env.VIDEO_CACHE_IDLE_HOURS
      : env.VIDEO_CACHE_MAX_IDLE_HOURS;
    const idleThresholdMs = idleHours * 3600 * 1000;

    const candidates = await this.repo.findEvictableCandidates(idleThresholdMs);
    const now = new Date();
    const urlSafeCutoff = new Date(now.getTime() - env.VIDEO_URL_TTL_SEC * 1000);

    let evictedCount = 0;
    let freedBytes = BigInt(0);

    for (const candidate of candidates) {
      if (!this.isCandidateEvictable(candidate, now, urlSafeCutoff, idleThresholdMs)) {
        continue;
      }

      const result = await this.repo.atomicDeleteIfEvictable(candidate.id, now);
      if (result.deleted) {
        evictedCount++;
        const candidateSize = result.sizeBytes ?? candidate.sizeBytes ?? BigInt(0);
        freedBytes += candidateSize;
        totalBytes -= candidateSize;

        if (result.r2Key && result.r2Key.startsWith('lesson-cache/')) {
          try {
            await r2Adapter.deleteObject(result.r2Key);
          } catch (err: unknown) {
            logger.warn('Failed to delete evicted video object from R2 during scheduled eviction', {
              cacheId: candidate.id,
              error: (err as Error).message,
            });
          }
        }

        logger.info('Scheduled eviction removed idle video cache entry', {
          cacheId: candidate.id,
          freedBytes: candidateSize.toString(),
        });

        // If under pressure and now below limit, relieve pressure
        if (isUnderPressure && totalBytes <= env.VIDEO_CACHE_MAX_BYTES) {
          break;
        }
      }
    }

    return {
      expiredLeasesDeleted,
      evictedCount,
      freedBytes,
    };
  }

  private isCandidateEvictable(
    candidate: EvictableVideoCache,
    now: Date,
    urlSafeCutoff: Date,
    idleThresholdMs: number,
  ): boolean {
    if (candidate.status !== VideoCacheStatus.READY) {
      return false;
    }

    const unexpiredLeases = candidate._count?.leases ?? candidate._count?.videoLeases ?? 0;
    if (unexpiredLeases > 0) {
      return false;
    }

    if (candidate.lastUrlIssuedAt && candidate.lastUrlIssuedAt >= urlSafeCutoff) {
      return false;
    }

    const idleMs = now.getTime() - new Date(candidate.lastAccessedAt).getTime();
    if (idleThresholdMs > 0 && idleMs < idleThresholdMs) {
      return false;
    }

    return true;
  }
}

export const cacheEvictionService = new CacheEvictionService();
