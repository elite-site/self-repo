import crypto from 'crypto';
import { Transform } from 'stream';
import { VideoCache, VideoCacheStatus } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/appError';
import { r2Adapter } from '../../infrastructure/r2';
import { driveService } from '../media/drive/index';
import { cacheRepository, CacheRepository } from './cache.repository';
import { cacheEvictionService } from './cache-eviction.service';
import { VIDEO_CACHE_ERRORS } from './video-cache.errors';

export class CacheService {
  constructor(private repo: CacheRepository = cacheRepository) {}

  // In-process semaphore for copy concurrency (limit = env.VIDEO_COPY_CONCURRENCY)
  private activeCopies = 0;
  private waitQueue: Array<() => void> = [];
  private activeCopyingFileIds = new Set<string>();

  /**
   * Main entry point called by playback controller.
   *
   * 1. Check if READY cache entry exists -> touch accessed and return READY.
   * 2. Otherwise atomic claim -> if won, run copy in background.
   * 3. Return PREPARING (or READY if concurrent copy just finished).
   */
  async ensureCached(
    driveFileId: string,
    options?: { force?: boolean },
  ): Promise<
    { status: 'READY'; r2Key: string } |
    { status: 'PREPARING' }
  > {
    const existing = await this.repo.findByDriveFileId(driveFileId);
    if (existing && existing.status === VideoCacheStatus.READY) {
      await this.repo.touchAccessed(existing.id);
      return { status: 'READY', r2Key: existing.r2Key };
    }

    if (options?.force && existing && existing.status === VideoCacheStatus.COPYING) {
      this.runCopy(existing, driveFileId).catch((err: unknown) => {
        logger.error('Background video copy failed', {
          cacheId: existing.id,
          error: (err as Error).message,
        });
      });
      return { status: 'PREPARING' };
    }

    const r2Key = `lesson-cache/${crypto.randomUUID()}`;
    const { won, entry } = await this.repo.claimOrFind(driveFileId, r2Key);

    if (!won) {
      if (entry.status === VideoCacheStatus.READY) {
        await this.repo.touchAccessed(entry.id);
        return { status: 'READY', r2Key: entry.r2Key };
      }
      return { status: 'PREPARING' };
    }

    // Won the claim: fire-and-forget background copy
    this.runCopy(entry, driveFileId).catch((err: unknown) => {
      logger.error('Background video copy failed', {
        cacheId: entry.id,
        error: (err as Error).message,
      });
    });

    return { status: 'PREPARING' };
  }

  /**
   * Internal: run the actual copy (background, fire-and-forget, no unhandled rejection).
   */
  private async runCopy(entry: VideoCache, driveFileId: string): Promise<void> {
    this.activeCopyingFileIds.add(driveFileId);
    const release = await this.acquireSlot();

    try {
      // 1. Initial room check
      const initialRoom = await this.makeRoom(BigInt(0));
      if (!initialRoom) {
        await this.repo.markFailed(entry.id, VIDEO_CACHE_ERRORS.CACHE_FULL);
        return;
      }

      // 2. Fetch stream and metadata from Drive
      const { stream, mimeType, sizeBytes, md5Checksum } =
        await driveService.getFileStream(driveFileId);

      // 3. Validate MIME type
      if (!mimeType || !mimeType.startsWith('video/')) {
        stream.destroy();
        await this.repo.markFailed(entry.id, VIDEO_CACHE_ERRORS.INVALID_MIME);
        return;
      }

      // 4. Validate file size
      const maxBytes = (env.VIDEO_MAX_FILE_MB || 1024) * 1024 * 1024;
      if (sizeBytes > maxBytes) {
        stream.destroy();
        await this.repo.markFailed(entry.id, VIDEO_CACHE_ERRORS.FILE_TOO_LARGE);
        return;
      }

      // Check makeRoom with actual size
      const roomForSize = await this.makeRoom(BigInt(sizeBytes));
      if (!roomForSize) {
        stream.destroy();
        await this.repo.markFailed(entry.id, VIDEO_CACHE_ERRORS.CACHE_FULL);
        return;
      }

      // 5. Pipe stream through Transform that computes MD5 hash while uploading
      let hashFinalized = false;
      const hash = crypto.createHash('md5');
      const hashingStream = new Transform({
        transform(chunk, _encoding, callback) {
          if (!hashFinalized) {
            hash.update(chunk);
          }
          callback(null, chunk);
        },
      });

      stream.on('error', (err) => {
        hashingStream.destroy(err);
      });

      stream.pipe(hashingStream);

      await r2Adapter.putObjectStream(entry.r2Key, hashingStream, sizeBytes);
      hashFinalized = true;
      const computedMd5 = hash.digest('hex');

      // 6. Verify MD5 checksum if Drive provided one
      if (md5Checksum && computedMd5.toLowerCase() !== md5Checksum.toLowerCase()) {
        logger.warn('Video MD5 mismatch between Drive and computed stream hash', {
          cacheId: entry.id,
          sizeBytes,
        });
        try {
          await r2Adapter.deleteObject(entry.r2Key);
        } catch {
          // Non-fatal
        }
        await this.repo.markFailed(entry.id, VIDEO_CACHE_ERRORS.COPY_FAILED);
        return;
      }

      // 7. Success: mark READY
      await this.repo.markReady(entry.id, BigInt(sizeBytes), computedMd5);
    } catch (err: unknown) {
      // SEC-4 & ERR-12: Never log Drive IDs/tokens. Log only internal cacheId.
      logger.error('Video copy failed', {
        cacheId: entry.id,
        error: (err as Error).message,
      });

      try {
        await r2Adapter.deleteObject(entry.r2Key);
      } catch {
        // Non-fatal: object may not have been created in R2
      }

      const failReason = (err as Error).message || VIDEO_CACHE_ERRORS.COPY_FAILED;
      await this.repo.markFailed(entry.id, failReason);
    } finally {
      this.activeCopyingFileIds.delete(driveFileId);
      release();
    }
  }

  /**
   * Acquire semaphore slot (returns release function).
   */
  private async acquireSlot(): Promise<() => void> {
    const limit = env.VIDEO_COPY_CONCURRENCY && env.VIDEO_COPY_CONCURRENCY > 0
      ? env.VIDEO_COPY_CONCURRENCY
      : 2;

    if (this.activeCopies < limit) {
      this.activeCopies++;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        this.activeCopies--;
        const next = this.waitQueue.shift();
        if (next) {
          this.activeCopies++;
          next();
        }
      };
    }

    return new Promise<() => void>((resolve) => {
      this.waitQueue.push(() => {
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.activeCopies--;
          const next = this.waitQueue.shift();
          if (next) {
            this.activeCopies++;
            next();
          }
        });
      });
    });
  }

  /**
   * Free enough room to fit neededBytes.
   */
  async makeRoom(neededBytes: bigint): Promise<boolean> {
    return cacheEvictionService.evictToFit(neededBytes);
  }

  async upsertLease(data: {
    studentId: string;
    lessonId: string;
    cacheId: string;
    expiresAt: Date;
  }) {
    return cacheRepository.upsertLease(data);
  }

  async findActiveLease(studentId: string, lessonId: string) {
    return cacheRepository.findActiveLease(studentId, lessonId);
  }

  async extendLease(id: string, expiresAt: Date) {
    return cacheRepository.extendLease(id, expiresAt);
  }

  async deleteLease(studentId: string, lessonId: string) {
    return cacheRepository.deleteLease(studentId, lessonId);
  }

  async touchUrlIssued(id: string) {
    return this.repo.touchUrlIssued(id);
  }

  async findByDriveFileId(driveFileId: string) {
    return this.repo.findByDriveFileId(driveFileId);
  }

  /**
   * Get paginated video cache status entries and capacity totals.
   * SEC-4: NEVER exposes driveFileId or r2Key.
   */
  async getVideoCacheStatus(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    let statusFilter: VideoCacheStatus | undefined = undefined;
    if (
      query.status === VideoCacheStatus.READY ||
      query.status === VideoCacheStatus.COPYING ||
      query.status === VideoCacheStatus.FAILED
    ) {
      statusFilter = query.status;
    }

    const search = typeof query.search === 'string' ? query.search.trim() : '';

    const where: any = {
      ...(statusFilter && { status: statusFilter }),
      ...(search && {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { failReason: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total, usedBytes, counts] = await Promise.all([
      this.repo.findCacheEntries({
        skip: (page - 1) * limit,
        take: limit,
        where,
      }),
      this.repo.countCacheEntries(where),
      this.repo.sumReadyBytes(),
      this.repo.getCacheStatusCounts(),
    ]);

    const entries = rows.map((r) => ({
      id: r.id,
      status: r.status,
      sizeMb: r.sizeBytes ? Math.round((Number(r.sizeBytes) / (1024 * 1024)) * 100) / 100 : null,
      lastAccessedAt: r.lastAccessedAt.toISOString(),
      activeLeaseCount: r.leases ? r.leases.length : 0,
      failReason: r.failReason,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      entries,
      totals: {
        usedBytes: usedBytes.toString(),
        maxBytes: env.VIDEO_CACHE_MAX_BYTES.toString(),
        counts,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retry a failed video copy.
   */
  async retryFailedCopy(id: string): Promise<{ success: boolean; message: string }> {
    const entry = await this.repo.findById(id);
    if (!entry) {
      throw new NotFoundError('Video cache entry not found');
    }
    if (entry.status !== VideoCacheStatus.FAILED) {
      throw new ValidationError('Only failed video cache entries can be retried');
    }

    const updated = await this.repo.resetFailedEntry(id);
    this.ensureCached(updated.driveFileId, { force: true }).catch((err: unknown) => {
      logger.error('Failed to initiate video copy retry', {
        cacheId: id,
        error: (err as Error).message,
      });
    });

    return { success: true, message: 'Copy retry initiated' };
  }

  /**
   * Purge idle video cache entries.
   */
  async purgeIdleCache(): Promise<{
    success: boolean;
    evictedCount: number;
    freedBytes: string;
    expiredLeasesDeleted: number;
  }> {
    const result = await cacheEvictionService.evictScheduled();
    return {
      success: true,
      evictedCount: result.evictedCount,
      freedBytes: result.freedBytes.toString(),
      expiredLeasesDeleted: result.expiredLeasesDeleted,
    };
  }

  /**
   * Read-only getter for active copies (useful for tests and monitoring).
   */
  getActiveCopies(): number {
    return this.activeCopies;
  }

  /**
   * Read-only getter for waiting copies count.
   */
  getWaitQueueLength(): number {
    return this.waitQueue.length;
  }

  /**
   * Helper for tests to await all running and queued background copies.
   */
  async waitForIdle(): Promise<void> {
    while (this.activeCopies > 0 || this.waitQueue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}

export const cacheService = new CacheService();
