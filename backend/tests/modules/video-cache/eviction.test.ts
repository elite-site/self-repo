import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { VideoCacheStatus } from '@prisma/client';
import { errorHandler } from '../../../src/middleware/errorHandler';

const { mockPrisma, mockR2 } = vi.hoisted(() => {
  return {
    mockPrisma: {
      videoCache: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn(),
      },
      videoLease: {
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    mockR2: {
      deleteObject: vi.fn(),
    },
  };
});

vi.mock('../../../src/config/env', () => ({
  env: {
    FEATURE_VIDEO_CACHE: true,
    VIDEO_CACHE_MAX_BYTES: BigInt(100_000_000), // 100MB limit for tests
    VIDEO_CACHE_IDLE_HOURS: 6,
    VIDEO_CACHE_MAX_IDLE_HOURS: 24,
    VIDEO_URL_TTL_SEC: 600, // 10 minutes
    INTERNAL_SYNC_SECRET: 'test-sync-secret-evict-999',
  },
}));

vi.mock('../../../src/infrastructure/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../src/infrastructure/r2', () => ({
  r2Adapter: mockR2,
}));

import { cacheEvictionService } from '../../../src/modules/video-cache/cache-eviction.service';
import { cacheRepository } from '../../../src/modules/video-cache/cache.repository';
import { internalVideoCacheRouter } from '../../../src/modules/video-cache/video-cache.routes';

const app = express();
app.use(express.json());
app.use('/api/internal', internalVideoCacheRouter);
app.use(errorHandler);

describe('Video Cache Eviction & Rotation', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default $transaction execution
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
      return cb(mockPrisma);
    });
  });

  describe('cleanExpiredLeases()', () => {
    it('deletes leases where expiresAt <= now and returns the count', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 5 });

      const count = await cacheEvictionService.cleanExpiredLeases();

      expect(count).toBe(5);
      expect(mockPrisma.videoLease.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lte: expect.any(Date) } },
      });
    });
  });

  describe('evictToFit()', () => {
    it('returns true immediately when room is already available', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 0 });
      // Total used is 20MB, needed is 30MB, total 50MB <= 100MB limit
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(20_000_000) },
      });

      const canFit = await cacheEvictionService.evictToFit(BigInt(30_000_000));

      expect(canFit).toBe(true);
      expect(mockPrisma.videoCache.findMany).not.toHaveBeenCalled();
      expect(mockR2.deleteObject).not.toHaveBeenCalled();
    });

    it('active lease blocks eviction of an entry', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 0 });
      // Total used is 90MB, needed is 30MB -> 120MB > 100MB (under pressure)
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(90_000_000) },
      });

      const candidateWithActiveLease = {
        id: 'cache-with-lease',
        r2Key: 'lesson-cache/active-lease-key',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(40_000_000),
        lastAccessedAt: new Date(Date.now() - 10 * 3600 * 1000), // 10h idle
        lastUrlIssuedAt: new Date(Date.now() - 2000 * 1000), // > 600s
        _count: { leases: 1, videoLeases: 1 },
      };

      mockPrisma.videoCache.findMany.mockResolvedValue([candidateWithActiveLease]);

      const canFit = await cacheEvictionService.evictToFit(BigInt(30_000_000));

      // Active lease candidate was skipped, so couldn't make room
      expect(canFit).toBe(false);
      expect(mockPrisma.videoCache.delete).not.toHaveBeenCalled();
      expect(mockR2.deleteObject).not.toHaveBeenCalled();
    });

    it('recent lastUrlIssuedAt (< 600s) blocks eviction of an entry', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(90_000_000) },
      });

      const candidateRecentlyIssued = {
        id: 'cache-recent-url',
        r2Key: 'lesson-cache/recent-url-key',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(40_000_000),
        lastAccessedAt: new Date(Date.now() - 10 * 3600 * 1000),
        lastUrlIssuedAt: new Date(Date.now() - 60 * 1000), // only 60s ago (< 600s TTL!)
        _count: { leases: 0, videoLeases: 0 },
      };

      mockPrisma.videoCache.findMany.mockResolvedValue([candidateRecentlyIssued]);

      const canFit = await cacheEvictionService.evictToFit(BigInt(30_000_000));

      expect(canFit).toBe(false);
      expect(mockPrisma.videoCache.delete).not.toHaveBeenCalled();
      expect(mockR2.deleteObject).not.toHaveBeenCalled();
    });

    it('evicts idle entry with zero active leases and deletes from R2', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 0 });
      // Total used is 90MB, needed is 30MB
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(90_000_000) },
      });

      const idleCandidate = {
        id: 'cache-idle-entry',
        r2Key: 'lesson-cache/idle-entry-key',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(40_000_000),
        lastAccessedAt: new Date(Date.now() - 8 * 3600 * 1000), // 8h idle
        lastUrlIssuedAt: new Date(Date.now() - 1000 * 1000), // 1000s ago (> 600s)
        _count: { leases: 0, videoLeases: 0 },
      };

      mockPrisma.videoCache.findMany.mockResolvedValue([idleCandidate]);

      // Atomic conditional delete in $transaction checks DB row
      mockPrisma.videoCache.findUnique.mockResolvedValue({
        ...idleCandidate,
        leases: [],
      });
      mockPrisma.videoCache.delete.mockResolvedValue(idleCandidate);

      const canFit = await cacheEvictionService.evictToFit(BigInt(30_000_000));

      expect(canFit).toBe(true);
      expect(mockPrisma.videoCache.delete).toHaveBeenCalledWith({
        where: { id: idleCandidate.id },
      });
      expect(mockR2.deleteObject).toHaveBeenCalledWith(idleCandidate.r2Key);
    });

    it('evicts in LRU order (lastAccessedAt ASC) under pressure until room is made', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 0 });
      // Total used is 90MB, needed is 40MB -> target is <= 60MB remaining
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(90_000_000) },
      });

      // Oldest access first (LRU)
      const oldestEntry = {
        id: 'cache-lru-1',
        r2Key: 'lesson-cache/lru-1-key',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(35_000_000), // 35MB
        lastAccessedAt: new Date(Date.now() - 20 * 3600 * 1000), // 20h ago
        lastUrlIssuedAt: null,
        _count: { leases: 0, videoLeases: 0 },
      };

      const secondOldestEntry = {
        id: 'cache-lru-2',
        r2Key: 'lesson-cache/lru-2-key',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(25_000_000), // 25MB
        lastAccessedAt: new Date(Date.now() - 10 * 3600 * 1000), // 10h ago
        lastUrlIssuedAt: null,
        _count: { leases: 0, videoLeases: 0 },
      };

      mockPrisma.videoCache.findMany.mockResolvedValue([oldestEntry, secondOldestEntry]);

      mockPrisma.videoCache.findUnique
        .mockResolvedValueOnce({ ...oldestEntry, leases: [] })
        .mockResolvedValueOnce({ ...secondOldestEntry, leases: [] });

      mockPrisma.videoCache.delete.mockResolvedValue({});

      const canFit = await cacheEvictionService.evictToFit(BigInt(40_000_000));

      expect(canFit).toBe(true);

      // Total used: 90MB - 35MB = 55MB. 55MB + 40MB = 95MB <= 100MB limit!
      // Oldest entry (35MB) was evicted. Second oldest (25MB) was NOT needed!
      expect(mockPrisma.videoCache.delete).toHaveBeenCalledTimes(1);
      expect(mockPrisma.videoCache.delete).toHaveBeenCalledWith({
        where: { id: oldestEntry.id },
      });
      expect(mockR2.deleteObject).toHaveBeenCalledWith(oldestEntry.r2Key);
      expect(mockR2.deleteObject).not.toHaveBeenCalledWith(secondOldestEntry.r2Key);
    });

    it('simulated race: lease created during eviction blocks deletion', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(90_000_000) },
      });

      const candidate = {
        id: 'cache-race-entry',
        r2Key: 'lesson-cache/race-key',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(30_000_000),
        lastAccessedAt: new Date(Date.now() - 8 * 3600 * 1000),
        lastUrlIssuedAt: null,
        _count: { leases: 0, videoLeases: 0 }, // Appeared unleased in initial query
      };

      mockPrisma.videoCache.findMany.mockResolvedValue([candidate]);

      // BUT inside $transaction atomic check, a lease was created concurrently!
      mockPrisma.videoCache.findUnique.mockResolvedValue({
        ...candidate,
        leases: [{ id: 'concurrent-lease-1' }], // Active lease exists!
      });

      const canFit = await cacheEvictionService.evictToFit(BigInt(30_000_000));

      expect(canFit).toBe(false);
      // Row must NOT be deleted
      expect(mockPrisma.videoCache.delete).not.toHaveBeenCalled();
      // R2 object must NOT be deleted
      expect(mockR2.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe('atomicDeleteIfEvictable() repository method directly', () => {
    it('returns { deleted: false } when active lease exists', async () => {
      mockPrisma.videoCache.findUnique.mockResolvedValue({
        id: 'c-1',
        r2Key: 'lesson-cache/test',
        status: VideoCacheStatus.READY,
        leases: [{ id: 'lease-active' }],
      });

      const res = await cacheRepository.atomicDeleteIfEvictable('c-1');

      expect(res.deleted).toBe(false);
      expect(mockPrisma.videoCache.delete).not.toHaveBeenCalled();
    });

    it('returns { deleted: false } when status is not READY', async () => {
      mockPrisma.videoCache.findUnique.mockResolvedValue({
        id: 'c-1',
        r2Key: 'lesson-cache/test',
        status: VideoCacheStatus.COPYING,
        leases: [],
      });

      const res = await cacheRepository.atomicDeleteIfEvictable('c-1');

      expect(res.deleted).toBe(false);
      expect(mockPrisma.videoCache.delete).not.toHaveBeenCalled();
    });

    it('returns { deleted: false } when lastUrlIssuedAt was within URL TTL window', async () => {
      mockPrisma.videoCache.findUnique.mockResolvedValue({
        id: 'c-1',
        r2Key: 'lesson-cache/test',
        status: VideoCacheStatus.READY,
        lastUrlIssuedAt: new Date(Date.now() - 30 * 1000), // 30s ago
        leases: [],
      });

      const res = await cacheRepository.atomicDeleteIfEvictable('c-1');

      expect(res.deleted).toBe(false);
      expect(mockPrisma.videoCache.delete).not.toHaveBeenCalled();
    });

    it('deletes row and returns { deleted: true, r2Key, sizeBytes } when valid', async () => {
      mockPrisma.videoCache.findUnique.mockResolvedValue({
        id: 'c-1',
        r2Key: 'lesson-cache/valid-key',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(1234567),
        lastUrlIssuedAt: null,
        leases: [],
      });
      mockPrisma.videoCache.delete.mockResolvedValue({});

      const res = await cacheRepository.atomicDeleteIfEvictable('c-1');

      expect(res.deleted).toBe(true);
      expect(res.r2Key).toBe('lesson-cache/valid-key');
      expect(res.sizeBytes).toBe(BigInt(1234567));
      expect(mockPrisma.videoCache.delete).toHaveBeenCalledWith({ where: { id: 'c-1' } });
    });
  });

  describe('evictScheduled()', () => {
    it('cleans expired leases and evicts idle candidates meeting criteria', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(50_000_000) },
      });

      const candidate = {
        id: 'cache-scheduled-1',
        r2Key: 'lesson-cache/scheduled-key',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(20_000_000),
        lastAccessedAt: new Date(Date.now() - 30 * 3600 * 1000), // 30h idle (> 24h MAX_IDLE_HOURS)
        lastUrlIssuedAt: null,
        _count: { leases: 0, videoLeases: 0 },
      };

      mockPrisma.videoCache.findMany.mockResolvedValue([candidate]);
      mockPrisma.videoCache.findUnique.mockResolvedValue({
        ...candidate,
        leases: [],
      });
      mockPrisma.videoCache.delete.mockResolvedValue({});

      const result = await cacheEvictionService.evictScheduled();

      expect(result.expiredLeasesDeleted).toBe(3);
      expect(result.evictedCount).toBe(1);
      expect(result.freedBytes).toBe(BigInt(20_000_000));
      expect(mockR2.deleteObject).toHaveBeenCalledWith(candidate.r2Key);
    });
  });

  describe('POST /api/internal/video-cache/evict', () => {
    it('returns 401 when Authorization header is missing or invalid', async () => {
      const res = await request(app).post('/api/internal/video-cache/evict');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');

      const resBadSecret = await request(app)
        .post('/api/internal/video-cache/evict')
        .set('Authorization', 'Bearer wrong-secret');
      expect(resBadSecret.status).toBe(401);
    });

    it('returns 200 with summary when valid INTERNAL_SYNC_SECRET is provided', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(0) },
      });
      mockPrisma.videoCache.findMany.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/internal/video-cache/evict')
        .set('Authorization', 'Bearer test-sync-secret-evict-999');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.expiredLeasesDeleted).toBe(2);
      expect(res.body.evictedCount).toBe(0);
      expect(res.body.timestamp).toBeDefined();
    });

    it('accepts x-internal-secret header as alternative to Authorization Bearer', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(0) },
      });
      mockPrisma.videoCache.findMany.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/internal/video-cache/evict')
        .set('x-internal-secret', 'test-sync-secret-evict-999');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
