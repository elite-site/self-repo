/**
 * Unit tests for Video Cache:
 * - CacheService (concurrency, Drive→R2 copy, error handling, semaphore)
 * - CacheRepository (atomic claiming, stale recovery, LRU queries)
 * - DriveService.getFileStream (streaming, mock fallback, UpstreamError)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';
import crypto from 'crypto';
import { VideoCacheStatus, VideoCache } from '@prisma/client';

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockPutObjectStream,
  mockDeleteObject,
  mockHeadObject,
  mockGetFileStream,
  mockPrisma,
} = vi.hoisted(() => {
  return {
    mockPutObjectStream: vi.fn(),
    mockDeleteObject: vi.fn(),
    mockHeadObject: vi.fn(),
    mockGetFileStream: vi.fn(),
    mockPrisma: {
      videoCache: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(),
        aggregate: vi.fn(),
      },
    },
  };
});

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    FEATURE_VIDEO_CACHE: true,
    VIDEO_COPY_CONCURRENCY: 2,
    VIDEO_MAX_FILE_MB: 1024,
    VIDEO_CACHE_MAX_BYTES: BigInt(9 * 1024 * 1024 * 1024),
  },
  getNodeEnv: () => 'test',
  isProductionEnv: () => false,
  isDevelopmentEnv: () => false,
  isTestEnv: () => true,
  isVitestEnv: () => true,
  getDbConnectionLimit: () => '5',
  getMaxVideoSizeHardCapMb: () => 100,
  isAutoMigratePending: () => false,
}));

vi.mock('../../../src/infrastructure/r2', () => ({
  r2Adapter: {
    putObjectStream: mockPutObjectStream,
    deleteObject: mockDeleteObject,
    headObject: mockHeadObject,
  },
}));

vi.mock('../../../src/modules/media/drive/index', () => ({
  driveService: {
    getFileStream: mockGetFileStream,
  },
}));

vi.mock('../../../src/infrastructure/prisma', () => ({
  prisma: mockPrisma,
}));

// ── Imports under test ───────────────────────────────────────────────────────

import { cacheService } from '../../../src/modules/video-cache/cache.service';
import {
  cacheRepository,
  MAX_COPY_ATTEMPTS,
  STALE_CLAIM_MS,
} from '../../../src/modules/video-cache/cache.repository';
import { VIDEO_CACHE_ERRORS } from '../../../src/modules/video-cache/video-cache.errors';
import { getFileStream } from '../../../src/modules/media/drive/fileStream';
import { UpstreamError } from '../../../src/utils/appError';

// ── Test helpers ────────────────────────────────────────────────────────────

function makeMockVideoCache(overrides: Partial<VideoCache> = {}): VideoCache {
  return {
    id: 'cache-entry-1',
    driveFileId: 'drive-file-abc',
    r2Key: 'lesson-cache/test-uuid-1234',
    status: VideoCacheStatus.COPYING,
    sizeBytes: null,
    md5: null,
    claimedAt: new Date(),
    lastAccessedAt: new Date(),
    lastUrlIssuedAt: null,
    failReason: null,
    copyAttempts: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createStreamWithContent(content: string): Readable {
  return Readable.from(Buffer.from(content));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Video Cache Service & Repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default R2 putObjectStream drains the stream so hashing finishes
    mockPutObjectStream.mockImplementation(
      async (_key: string, stream: Readable, _size: number) => {
        for await (const _chunk of stream) {
          // drain
        }
      },
    );

    mockDeleteObject.mockResolvedValue(undefined);
  });

  describe('Scenario 1: Single caller — READY path', () => {
    it('returns { status: "READY", r2Key }, calls touchAccessed, and starts no copy', async () => {
      const readyEntry = makeMockVideoCache({
        status: VideoCacheStatus.READY,
        r2Key: 'lesson-cache/ready-video-key',
        sizeBytes: BigInt(5000),
        md5: 'abc123md5',
      });

      mockPrisma.videoCache.findUnique.mockResolvedValue(readyEntry);
      mockPrisma.videoCache.update.mockResolvedValue({
        ...readyEntry,
        lastAccessedAt: new Date(),
      });

      const result = await cacheService.ensureCached('drive-file-abc');

      expect(result).toEqual({
        status: 'READY',
        r2Key: 'lesson-cache/ready-video-key',
      });

      // touchAccessed was called
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith({
        where: { id: readyEntry.id },
        data: { lastAccessedAt: expect.any(Date) },
      });

      // No background copy was triggered
      expect(mockGetFileStream).not.toHaveBeenCalled();
      expect(mockPutObjectStream).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 2: Single caller — new entry copy', () => {
    it('returns { status: "PREPARING" }, runs copy in background, and marks READY', async () => {
      const videoContent = 'sample-video-stream-bytes-12345';
      const expectedMd5 = crypto.createHash('md5').update(videoContent).digest('hex');

      // Not found initially, then created
      mockPrisma.videoCache.findUnique.mockResolvedValueOnce(null);
      const newEntry = makeMockVideoCache({
        id: 'new-entry-id',
        status: VideoCacheStatus.COPYING,
        copyAttempts: 1,
      });
      mockPrisma.videoCache.create.mockResolvedValue(newEntry);
      mockPrisma.videoCache.update.mockResolvedValue({
        ...newEntry,
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(videoContent.length),
        md5: expectedMd5,
      });

      mockGetFileStream.mockResolvedValue({
        stream: createStreamWithContent(videoContent),
        mimeType: 'video/mp4',
        sizeBytes: videoContent.length,
        md5Checksum: expectedMd5,
      });

      const result = await cacheService.ensureCached('drive-file-abc');

      expect(result).toEqual({ status: 'PREPARING' });

      // Await background copy completion
      await cacheService.waitForIdle();

      // Verify Drive was contacted
      expect(mockGetFileStream).toHaveBeenCalledWith('drive-file-abc');

      // Verify uploaded to R2
      expect(mockPutObjectStream).toHaveBeenCalledWith(
        newEntry.r2Key,
        expect.any(Object),
        videoContent.length,
      );

      // Verify marked READY with size and computed MD5
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith({
        where: { id: newEntry.id },
        data: {
          status: VideoCacheStatus.READY,
          sizeBytes: BigInt(videoContent.length),
          md5: expectedMd5,
          failReason: null,
        },
      });
    });
  });

  describe('Scenario 3: 20 concurrent calls', () => {
    it('only 1 winner runs copy; 19 get PREPARING without starting copy', async () => {
      const videoContent = 'video-payload-concurrent';
      const expectedMd5 = crypto.createHash('md5').update(videoContent).digest('hex');
      const entry = makeMockVideoCache({ id: 'concurrent-entry' });

      // First caller creates successfully; concurrent callers see created entry
      let created = false;
      mockPrisma.videoCache.findUnique.mockImplementation(async () => {
        if (!created) return null;
        return entry; // already exists as active COPYING
      });

      mockPrisma.videoCache.create.mockImplementation(async () => {
        if (created) {
          const err: any = new Error('Unique constraint failed');
          err.code = 'P2002';
          throw err;
        }
        created = true;
        return entry;
      });

      // Update for markReady
      mockPrisma.videoCache.update.mockResolvedValue({
        ...entry,
        status: VideoCacheStatus.READY,
      });

      mockGetFileStream.mockResolvedValue({
        stream: createStreamWithContent(videoContent),
        mimeType: 'video/mp4',
        sizeBytes: videoContent.length,
        md5Checksum: expectedMd5,
      });

      // Fire 20 concurrent ensureCached calls
      const calls = Array.from({ length: 20 }, () =>
        cacheService.ensureCached('drive-file-abc'),
      );
      const results = await Promise.all(calls);

      // Every caller receives PREPARING
      for (const res of results) {
        expect(res).toEqual({ status: 'PREPARING' });
      }

      await cacheService.waitForIdle();

      // Drive stream and R2 upload must be called EXACTLY once
      expect(mockGetFileStream).toHaveBeenCalledTimes(1);
      expect(mockPutObjectStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 4: Stale claim recovery', () => {
    it('COPYING entry with stale claimedAt (> 15 min) can be reclaimed and copied', async () => {
      const staleTime = new Date(Date.now() - (STALE_CLAIM_MS + 60_000)); // 16 min ago
      const staleEntry = makeMockVideoCache({
        id: 'stale-entry-id',
        status: VideoCacheStatus.COPYING,
        claimedAt: staleTime,
        copyAttempts: 1,
      });

      const videoContent = 'stale-recovered-content';
      const expectedMd5 = crypto.createHash('md5').update(videoContent).digest('hex');

      let updated = false;
      mockPrisma.videoCache.findUnique.mockImplementation(async () => {
        if (updated) {
          return {
            ...staleEntry,
            claimedAt: new Date(),
            copyAttempts: 2,
          };
        }
        return staleEntry;
      });

      mockPrisma.videoCache.updateMany.mockImplementation(async () => {
        updated = true;
        return { count: 1 };
      });

      mockPrisma.videoCache.update.mockResolvedValue({
        ...staleEntry,
        status: VideoCacheStatus.READY,
      });

      mockGetFileStream.mockResolvedValue({
        stream: createStreamWithContent(videoContent),
        mimeType: 'video/mp4',
        sizeBytes: videoContent.length,
        md5Checksum: expectedMd5,
      });

      const result = await cacheService.ensureCached('drive-file-abc');
      expect(result).toEqual({ status: 'PREPARING' });

      await cacheService.waitForIdle();

      // UpdateMany was invoked with stale condition
      expect(mockPrisma.videoCache.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          driveFileId: 'drive-file-abc',
        }),
        data: expect.objectContaining({
          status: VideoCacheStatus.COPYING,
          copyAttempts: { increment: 1 },
        }),
      });

      // Stream and upload completed
      expect(mockGetFileStream).toHaveBeenCalledTimes(1);
      expect(mockPutObjectStream).toHaveBeenCalledTimes(1);
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stale-entry-id' },
          data: expect.objectContaining({ status: VideoCacheStatus.READY }),
        }),
      );
    });

    it('reclaims FAILED entry when copyAttempts < 3', async () => {
      const failedEntry = makeMockVideoCache({
        id: 'failed-entry-id',
        status: VideoCacheStatus.FAILED,
        copyAttempts: 2,
      });

      mockPrisma.videoCache.findUnique
        .mockResolvedValueOnce(failedEntry)
        .mockResolvedValueOnce({
          ...failedEntry,
          status: VideoCacheStatus.COPYING,
          copyAttempts: 3,
        });

      mockPrisma.videoCache.updateMany.mockResolvedValue({ count: 1 });

      const claimResult = await cacheRepository.claimOrFind(
        failedEntry.driveFileId,
        'lesson-cache/retry-key',
      );

      expect(claimResult.won).toBe(true);
      expect(mockPrisma.videoCache.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          driveFileId: failedEntry.driveFileId,
        }),
        data: expect.objectContaining({
          status: VideoCacheStatus.COPYING,
          copyAttempts: { increment: 1 },
        }),
      });
    });

    it('does NOT reclaim FAILED entry when copyAttempts >= 3', async () => {
      const exhaustedEntry = makeMockVideoCache({
        id: 'exhausted-entry-id',
        status: VideoCacheStatus.FAILED,
        copyAttempts: MAX_COPY_ATTEMPTS,
      });

      mockPrisma.videoCache.findUnique.mockResolvedValue(exhaustedEntry);

      const claimResult = await cacheRepository.claimOrFind(
        exhaustedEntry.driveFileId,
        'lesson-cache/retry-key',
      );

      expect(claimResult.won).toBe(false);
      expect(claimResult.entry.status).toBe(VideoCacheStatus.FAILED);
      expect(mockPrisma.videoCache.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 5: Size mismatch & stream error cleanup', () => {
    it('deletes partial R2 object and marks FAILED on MD5 checksum mismatch', async () => {
      const entry = makeMockVideoCache({ id: 'mismatch-entry' });
      mockPrisma.videoCache.findUnique.mockResolvedValueOnce(null);
      mockPrisma.videoCache.create.mockResolvedValue(entry);
      mockPrisma.videoCache.update.mockResolvedValue({
        ...entry,
        status: VideoCacheStatus.FAILED,
      });

      const videoContent = 'content-with-different-md5';
      mockGetFileStream.mockResolvedValue({
        stream: createStreamWithContent(videoContent),
        mimeType: 'video/mp4',
        sizeBytes: videoContent.length,
        md5Checksum: 'different-reported-md5-from-drive',
      });

      const result = await cacheService.ensureCached('drive-file-abc');
      expect(result).toEqual({ status: 'PREPARING' });

      await cacheService.waitForIdle();

      // Partial R2 object deleted
      expect(mockDeleteObject).toHaveBeenCalledWith(entry.r2Key);

      // Status marked as FAILED with COPY_FAILED
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith({
        where: { id: entry.id },
        data: {
          status: VideoCacheStatus.FAILED,
          failReason: VIDEO_CACHE_ERRORS.COPY_FAILED,
        },
      });
    });

    it('deletes partial R2 object and marks FAILED when upload stream fails', async () => {
      const entry = makeMockVideoCache({ id: 'stream-error-entry' });
      mockPrisma.videoCache.findUnique.mockResolvedValueOnce(null);
      mockPrisma.videoCache.create.mockResolvedValue(entry);
      mockPrisma.videoCache.update.mockResolvedValue({
        ...entry,
        status: VideoCacheStatus.FAILED,
      });

      mockGetFileStream.mockResolvedValue({
        stream: createStreamWithContent('stream-content'),
        mimeType: 'video/mp4',
        sizeBytes: 100,
        md5Checksum: null,
      });

      mockPutObjectStream.mockRejectedValueOnce(
        new Error('R2 multipart upload network failure'),
      );

      const result = await cacheService.ensureCached('drive-file-abc');
      expect(result).toEqual({ status: 'PREPARING' });

      await cacheService.waitForIdle();

      // Cleanup attempted
      expect(mockDeleteObject).toHaveBeenCalledWith(entry.r2Key);

      // Marked as failed
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith({
        where: { id: entry.id },
        data: {
          status: VideoCacheStatus.FAILED,
          failReason: 'R2 multipart upload network failure',
        },
      });
    });
  });

  describe('Scenario 6: Oversized file', () => {
    it('rejects with VIDEO_FILE_TOO_LARGE when size exceeds env limit', async () => {
      const entry = makeMockVideoCache({ id: 'oversized-entry' });
      mockPrisma.videoCache.findUnique.mockResolvedValueOnce(null);
      mockPrisma.videoCache.create.mockResolvedValue(entry);
      mockPrisma.videoCache.update.mockResolvedValue({
        ...entry,
        status: VideoCacheStatus.FAILED,
      });

      const oversizedBytes = 1025 * 1024 * 1024; // > 1024 MB
      const dummyStream = createStreamWithContent('oversized');
      const destroySpy = vi.spyOn(dummyStream, 'destroy');

      mockGetFileStream.mockResolvedValue({
        stream: dummyStream,
        mimeType: 'video/mp4',
        sizeBytes: oversizedBytes,
        md5Checksum: null,
      });

      await cacheService.ensureCached('drive-file-abc');
      await cacheService.waitForIdle();

      expect(destroySpy).toHaveBeenCalled();
      expect(mockPutObjectStream).not.toHaveBeenCalled();
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith({
        where: { id: entry.id },
        data: {
          status: VideoCacheStatus.FAILED,
          failReason: VIDEO_CACHE_ERRORS.FILE_TOO_LARGE,
        },
      });
    });
  });

  describe('Scenario 7: Non-video MIME type', () => {
    it('rejects with VIDEO_INVALID_MIME_TYPE for non-video MIME', async () => {
      const entry = makeMockVideoCache({ id: 'audio-entry' });
      mockPrisma.videoCache.findUnique.mockResolvedValueOnce(null);
      mockPrisma.videoCache.create.mockResolvedValue(entry);
      mockPrisma.videoCache.update.mockResolvedValue({
        ...entry,
        status: VideoCacheStatus.FAILED,
      });

      const dummyStream = createStreamWithContent('audio-bytes');
      const destroySpy = vi.spyOn(dummyStream, 'destroy');

      mockGetFileStream.mockResolvedValue({
        stream: dummyStream,
        mimeType: 'audio/mpeg',
        sizeBytes: 1000,
        md5Checksum: null,
      });

      await cacheService.ensureCached('drive-file-abc');
      await cacheService.waitForIdle();

      expect(destroySpy).toHaveBeenCalled();
      expect(mockPutObjectStream).not.toHaveBeenCalled();
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith({
        where: { id: entry.id },
        data: {
          status: VideoCacheStatus.FAILED,
          failReason: VIDEO_CACHE_ERRORS.INVALID_MIME,
        },
      });
    });
  });

  describe('Concurrency & Semaphore Controls', () => {
    it('enforces copy concurrency limit and queues extra tasks', async () => {
      let resolveUpload1: () => void;
      let resolveUpload2: () => void;
      const p1 = new Promise<void>((r) => {
        resolveUpload1 = r;
      });
      const p2 = new Promise<void>((r) => {
        resolveUpload2 = r;
      });

      let notifyUpload1Started: () => void;
      const upload1Started = new Promise<void>((r) => {
        notifyUpload1Started = r;
      });
      let notifyUpload2Started: () => void;
      const upload2Started = new Promise<void>((r) => {
        notifyUpload2Started = r;
      });

      let uploadCallCount = 0;
      mockPutObjectStream.mockImplementation(async (_key: string, stream: Readable) => {
        const callId = ++uploadCallCount;
        for await (const _ of stream) {
          // drain
        }
        if (callId === 1) {
          notifyUpload1Started();
          return p1;
        }
        if (callId === 2) {
          notifyUpload2Started();
          return p2;
        }
        return Promise.resolve();
      });

      mockGetFileStream.mockImplementation(async () => ({
        stream: createStreamWithContent('concurrent-chunk'),
        mimeType: 'video/mp4',
        sizeBytes: 16,
        md5Checksum: null,
      }));

      const e1 = makeMockVideoCache({ id: 'e1', driveFileId: 'df-1' });
      const e2 = makeMockVideoCache({ id: 'e2', driveFileId: 'df-2' });
      const e3 = makeMockVideoCache({ id: 'e3', driveFileId: 'df-3' });

      mockPrisma.videoCache.findUnique.mockResolvedValue(null);
      mockPrisma.videoCache.create
        .mockResolvedValueOnce(e1)
        .mockResolvedValueOnce(e2)
        .mockResolvedValueOnce(e3);
      mockPrisma.videoCache.update.mockResolvedValue({} as any);

      await cacheService.ensureCached('df-1');
      await cacheService.ensureCached('df-2');
      await cacheService.ensureCached('df-3');

      // Wait until both upload 1 and upload 2 have actually started
      await upload1Started;
      await upload2Started;

      // VIDEO_COPY_CONCURRENCY is 2: 2 active copies, 1 queued
      expect(cacheService.getActiveCopies()).toBe(2);
      expect(cacheService.getWaitQueueLength()).toBe(1);

      // Finish upload 1 -> unlocks slot for e3
      resolveUpload1!();

      // Wait for queued e3 to start
      while (cacheService.getWaitQueueLength() > 0) {
        await new Promise((r) => setTimeout(r, 5));
      }
      expect(cacheService.getWaitQueueLength()).toBe(0);

      // Finish upload 2 and wait for all tasks to idle
      resolveUpload2!();
      await cacheService.waitForIdle();

      expect(cacheService.getActiveCopies()).toBe(0);
      expect(uploadCallCount).toBe(3);
    });
  });

  describe('Eviction room check', () => {
    it('marks CACHE_FULL if makeRoom returns false', async () => {
      const entry = makeMockVideoCache({ id: 'full-entry' });
      mockPrisma.videoCache.findUnique.mockResolvedValueOnce(null);
      mockPrisma.videoCache.create.mockResolvedValue(entry);
      mockPrisma.videoCache.update.mockResolvedValue({
        ...entry,
        status: VideoCacheStatus.FAILED,
      });

      const makeRoomSpy = vi.spyOn(cacheService, 'makeRoom').mockResolvedValue(false);

      await cacheService.ensureCached('drive-file-full');
      await cacheService.waitForIdle();

      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith({
        where: { id: entry.id },
        data: {
          status: VideoCacheStatus.FAILED,
          failReason: VIDEO_CACHE_ERRORS.CACHE_FULL,
        },
      });

      makeRoomSpy.mockRestore();
    });
  });

  describe('Repository: sumReadyBytes & findEvictableCandidates', () => {
    it('touchUrlIssued updates lastUrlIssuedAt and lastAccessedAt', async () => {
      mockPrisma.videoCache.update.mockResolvedValue({} as any);

      await cacheRepository.touchUrlIssued('test-id');

      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          lastUrlIssuedAt: expect.any(Date),
          lastAccessedAt: expect.any(Date),
        },
      });
    });

    it('sumReadyBytes returns sum of sizeBytes for READY entries', async () => {
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(5000000) },
      });

      const total = await cacheRepository.sumReadyBytes();
      expect(total).toBe(BigInt(5000000));
      expect(mockPrisma.videoCache.aggregate).toHaveBeenCalledWith({
        _sum: { sizeBytes: true },
        where: { status: VideoCacheStatus.READY },
      });
    });

    it('sumReadyBytes returns 0n when no READY entries exist', async () => {
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: null },
      });

      const total = await cacheRepository.sumReadyBytes();
      expect(total).toBe(BigInt(0));
    });

    it('findEvictableCandidates orders by lastAccessedAt ASC and maps lease counts', async () => {
      const candidates = [
        {
          ...makeMockVideoCache({ id: 'c-1', status: VideoCacheStatus.READY }),
          _count: { leases: 2 },
        },
        {
          ...makeMockVideoCache({ id: 'c-2', status: VideoCacheStatus.READY }),
          _count: { leases: 0 },
        },
      ];

      mockPrisma.videoCache.findMany.mockResolvedValue(candidates);

      const results = await cacheRepository.findEvictableCandidates(3600_000);

      expect(results).toHaveLength(2);
      expect(results[0]._count.videoLeases).toBe(2);
      expect(results[0]._count.leases).toBe(2);
      expect(results[1]._count.videoLeases).toBe(0);
      expect(mockPrisma.videoCache.findMany).toHaveBeenCalledWith({
        where: {
          status: VideoCacheStatus.READY,
          lastAccessedAt: { lte: expect.any(Date) },
        },
        orderBy: { lastAccessedAt: 'asc' },
        include: {
          _count: { select: { leases: true } },
        },
      });
    });
  });

  describe('DriveService.getFileStream', () => {
    it('returns synthetic video stream with md5 when DriveContext isMock is true', async () => {
      const mockCtx: any = {
        drive: null,
        isMock: true,
      };

      const result = await getFileStream(mockCtx, 'drive-id-123');
      expect(result.mimeType).toBe('video/mp4');
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.md5Checksum).toBeTruthy();

      const chunks: Buffer[] = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk as Buffer);
      }
      expect(Buffer.concat(chunks).length).toBe(result.sizeBytes);
    });

    it('calls Drive files.get and wraps errors in UpstreamError', async () => {
      const mockDrive: any = {
        files: {
          get: vi.fn().mockRejectedValue(new Error('Drive rate limited')),
        },
      };

      const mockCtx: any = {
        drive: mockDrive,
        isMock: false,
      };

      await expect(getFileStream(mockCtx, 'file-xyz')).rejects.toThrow(UpstreamError);
    });
  });
});
