import { prisma } from '../../infrastructure/prisma';
import { VideoCache, VideoCacheStatus, VideoLease, Prisma } from '@prisma/client';
import { env } from '../../config/env';

export const MAX_COPY_ATTEMPTS = 3;
export const STALE_CLAIM_MS = 15 * 60 * 1000; // 15 minutes

export type EvictableVideoCache = VideoCache & {
  _count: {
    videoLeases: number;
    leases?: number;
  };
};

export class CacheRepository {
  /**
   * Find an existing cache entry by Google Drive file ID.
   */
  async findByDriveFileId(driveFileId: string): Promise<VideoCache | null> {
    return prisma.videoCache.findUnique({
      where: { driveFileId },
    });
  }

  /**
   * Find a cache entry by its primary key ID.
   */
  async findById(id: string): Promise<VideoCache | null> {
    return prisma.videoCache.findUnique({
      where: { id },
    });
  }

  /**
   * Atomic claim: tries to insert a new COPYING row, or re-claim a stale/failed one.
   * Returns { won: boolean; entry: VideoCache }
   * "Stale" means: status=COPYING AND claimedAt < now - 15 minutes (or null)
   * "Re-claimable" means: status=FAILED AND copyAttempts < MAX_COPY_ATTEMPTS (3)
   *
   * Guaranteed: exactly ONE caller wins under concurrency.
   */
  async claimOrFind(
    driveFileId: string,
    r2Key: string,
  ): Promise<{ won: boolean; entry: VideoCache }> {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_CLAIM_MS);

    // 1. Check if row exists
    let existing = await prisma.videoCache.findUnique({
      where: { driveFileId },
    });

    if (!existing) {
      try {
        const created = await prisma.videoCache.create({
          data: {
            driveFileId,
            r2Key,
            status: VideoCacheStatus.COPYING,
            claimedAt: now,
            copyAttempts: 1,
            lastAccessedAt: now,
          },
        });
        return { won: true, entry: created };
      } catch (err: any) {
        if (err?.code !== 'P2002') {
          throw err;
        }
        // Unique constraint conflict (another caller inserted concurrently).
        // Re-read the row created by the concurrent winner.
        existing = await prisma.videoCache.findUnique({
          where: { driveFileId },
        });
      }
    }

    if (existing) {
      // If READY -> cannot claim, return current entry
      if (existing.status === VideoCacheStatus.READY) {
        return { won: false, entry: existing };
      }

      // If active COPYING and NOT stale -> cannot claim, return current entry
      if (
        existing.status === VideoCacheStatus.COPYING &&
        existing.claimedAt &&
        existing.claimedAt >= staleThreshold
      ) {
        return { won: false, entry: existing };
      }

      // If FAILED with copyAttempts >= MAX_COPY_ATTEMPTS -> cannot claim, return current entry
      if (
        existing.status === VideoCacheStatus.FAILED &&
        existing.copyAttempts >= MAX_COPY_ATTEMPTS
      ) {
        return { won: false, entry: existing };
      }
    }

    // Attempt atomic update for stale COPYING or re-claimable FAILED
    const result = await prisma.videoCache.updateMany({
      where: {
        driveFileId,
        OR: [
          // Stale COPYING
          {
            status: VideoCacheStatus.COPYING,
            OR: [
              { claimedAt: { lt: staleThreshold } },
              { claimedAt: null },
            ],
          },
          // Re-claimable FAILED
          {
            status: VideoCacheStatus.FAILED,
            copyAttempts: { lt: MAX_COPY_ATTEMPTS },
          },
        ],
      },
      data: {
        status: VideoCacheStatus.COPYING,
        claimedAt: now,
        copyAttempts: { increment: 1 },
        r2Key,
        failReason: null,
      },
    });

    if (result && result.count > 0) {
      const updated = await prisma.videoCache.findUnique({
        where: { driveFileId },
      });
      return { won: true, entry: updated! };
    }

    // Another concurrent caller won or entry transitioned
    const current = await prisma.videoCache.findUnique({
      where: { driveFileId },
    });
    return { won: false, entry: current! };
  }

  /**
   * Mark a copy as READY.
   */
  async markReady(
    id: string,
    sizeBytes: bigint,
    md5: string,
  ): Promise<VideoCache> {
    return prisma.videoCache.update({
      where: { id },
      data: {
        status: VideoCacheStatus.READY,
        sizeBytes,
        md5,
        failReason: null,
      },
    });
  }

  /**
   * Mark a copy as FAILED.
   */
  async markFailed(id: string, reason: string): Promise<VideoCache> {
    return prisma.videoCache.update({
      where: { id },
      data: {
        status: VideoCacheStatus.FAILED,
        failReason: reason,
      },
    });
  }

  /**
   * Update lastAccessedAt.
   */
  async touchAccessed(id: string): Promise<void> {
    await prisma.videoCache.update({
      where: { id },
      data: {
        lastAccessedAt: new Date(),
      },
    });
  }

  /**
   * Update lastUrlIssuedAt and lastAccessedAt.
   */
  async touchUrlIssued(id: string): Promise<void> {
    await prisma.videoCache.update({
      where: { id },
      data: {
        lastUrlIssuedAt: new Date(),
        lastAccessedAt: new Date(),
      },
    });
  }

  /**
   * Get total used bytes (sum of sizeBytes for all READY entries).
   */
  async sumReadyBytes(): Promise<bigint> {
    if (!prisma.videoCache?.aggregate) {
      return BigInt(0);
    }
    const result = await prisma.videoCache.aggregate({
      _sum: { sizeBytes: true },
      where: { status: VideoCacheStatus.READY },
    });
    return result?._sum?.sizeBytes ?? BigInt(0);
  }

  /**
   * Get READY entries ordered by lastAccessedAt ASC (LRU).
   */
  async findEvictableCandidates(
    idleThresholdMs: number,
  ): Promise<EvictableVideoCache[]> {
    const where: {
      status: VideoCacheStatus;
      lastAccessedAt?: { lte: Date };
    } = {
      status: VideoCacheStatus.READY,
    };

    if (idleThresholdMs > 0) {
      where.lastAccessedAt = {
        lte: new Date(Date.now() - idleThresholdMs),
      };
    }

    const items = await prisma.videoCache.findMany({
      where,
      orderBy: { lastAccessedAt: 'asc' },
      include: {
        _count: {
          select: { leases: true },
        },
      },
    });

    return items.map((item) => ({
      ...item,
      _count: {
        videoLeases: item._count.leases,
        leases: item._count.leases,
      },
    }));
  }

  /**
   * Upsert a VideoLease for (studentId, lessonId).
   */
  async upsertLease(data: {
    studentId: string;
    lessonId: string;
    cacheId: string;
    expiresAt: Date;
  }): Promise<VideoLease> {
    return prisma.videoLease.upsert({
      where: {
        studentId_lessonId: {
          studentId: data.studentId,
          lessonId: data.lessonId,
        },
      },
      create: {
        studentId: data.studentId,
        lessonId: data.lessonId,
        cacheId: data.cacheId,
        expiresAt: data.expiresAt,
      },
      update: {
        cacheId: data.cacheId,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Find an active (unexpired) lease for a student and lesson.
   */
  async findActiveLease(
    studentId: string,
    lessonId: string,
    now: Date = new Date(),
  ): Promise<(VideoLease & { cache: VideoCache }) | null> {
    return prisma.videoLease.findFirst({
      where: {
        studentId,
        lessonId,
        expiresAt: { gt: now },
      },
      include: {
        cache: true,
      },
    });
  }

  /**
   * Extend lease expiration time.
   */
  async extendLease(
    id: string,
    expiresAt: Date,
  ): Promise<VideoLease & { cache: VideoCache }> {
    return prisma.videoLease.update({
      where: { id },
      data: { expiresAt },
      include: {
        cache: true,
      },
    });
  }

  /**
   * Delete a lease for a student and lesson.
   */
  async deleteLease(studentId: string, lessonId: string): Promise<number> {
    const res = await prisma.videoLease.deleteMany({
      where: { studentId, lessonId },
    });
    return res.count;
  }

  /**
   * Delete expired leases (expiresAt <= now).
   */
  async deleteExpiredLeases(now: Date = new Date()): Promise<number> {
    if (!prisma.videoLease?.deleteMany) {
      return 0;
    }
    const res = await prisma.videoLease.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return res?.count ?? 0;
  }

  /**
   * Atomically verify condition and delete VideoCache row inside a $transaction.
   * Anti-race guard: ensures no unexpired leases exist and lastUrlIssuedAt safe window
   * is respected before deleting the database row.
   */
  async atomicDeleteIfEvictable(
    id: string,
    now: Date = new Date(),
  ): Promise<{ deleted: boolean; r2Key?: string; sizeBytes?: bigint }> {
    const urlCutoff = new Date(now.getTime() - env.VIDEO_URL_TTL_SEC * 1000);

    return prisma.$transaction(async (tx) => {
      const entry = await tx.videoCache.findUnique({
        where: { id },
        include: {
          leases: {
            where: { expiresAt: { gt: now } },
            select: { id: true },
          },
        },
      });

      if (!entry || entry.status !== VideoCacheStatus.READY) {
        return { deleted: false };
      }

      let hasActiveLeases = false;
      if (entry.leases) {
        hasActiveLeases = entry.leases.length > 0;
      } else if (tx.videoLease?.findFirst) {
        const activeLease = await tx.videoLease.findFirst({
          where: { cacheId: id, expiresAt: { gt: now } },
        });
        hasActiveLeases = Boolean(activeLease);
      }

      if (hasActiveLeases) {
        return { deleted: false };
      }

      if (entry.lastUrlIssuedAt && entry.lastUrlIssuedAt >= urlCutoff) {
        return { deleted: false };
      }

      await tx.videoCache.delete({
        where: { id },
      });

      return {
        deleted: true,
        r2Key: entry.r2Key,
        sizeBytes: entry.sizeBytes ?? BigInt(0),
      };
    });
  }

  /**
   * Find paginated video cache entries with active lease counts.
   * SEC-4: driveFileId and r2Key are strictly excluded.
   */
  async findCacheEntries(params: {
    skip: number;
    take: number;
    where: Prisma.VideoCacheWhereInput;
  }) {
    const now = new Date();
    return prisma.videoCache.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        sizeBytes: true,
        lastAccessedAt: true,
        failReason: true,
        createdAt: true,
        leases: {
          where: { expiresAt: { gt: now } },
          select: { id: true },
        },
      },
    });
  }

  /**
   * Count cache entries matching filter.
   */
  async countCacheEntries(where: Prisma.VideoCacheWhereInput): Promise<number> {
    return prisma.videoCache.count({ where });
  }

  /**
   * Get status counts across all cache entries.
   */
  async getCacheStatusCounts(): Promise<{
    ready: number;
    copying: number;
    failed: number;
    total: number;
  }> {
    let ready = 0;
    let copying = 0;
    let failed = 0;

    if (prisma.videoCache?.groupBy) {
      const groups = await prisma.videoCache.groupBy({
        by: ['status'],
        _count: { id: true },
      });
      for (const g of groups) {
        if (g.status === VideoCacheStatus.READY) ready = g._count.id;
        if (g.status === VideoCacheStatus.COPYING) copying = g._count.id;
        if (g.status === VideoCacheStatus.FAILED) failed = g._count.id;
      }
    } else {
      const all = await prisma.videoCache.findMany({
        select: { status: true },
      });
      for (const item of all) {
        if (item.status === VideoCacheStatus.READY) ready++;
        if (item.status === VideoCacheStatus.COPYING) copying++;
        if (item.status === VideoCacheStatus.FAILED) failed++;
      }
    }

    return {
      ready,
      copying,
      failed,
      total: ready + copying + failed,
    };
  }

  /**
   * Reset a FAILED entry for retry.
   */
  async resetFailedEntry(id: string): Promise<VideoCache> {
    return prisma.videoCache.update({
      where: { id },
      data: {
        status: VideoCacheStatus.COPYING,
        claimedAt: new Date(),
        copyAttempts: { increment: 1 },
        failReason: null,
      },
    });
  }
}

export const cacheRepository = new CacheRepository();
