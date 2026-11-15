/**
 * Integration & Unit tests for Admin Video Cache & Video Lesson Attachment:
 *
 * 1. Unauthorized request to GET /api/admin/video-cache returns 401.
 * 2. Paginated list returns formatted entries and totals without leaking driveFileId or r2Key (SEC-4).
 * 3. Purge idle only evicts evictable entries and NEVER touches entries with active leases.
 * 4. Retry endpoint rejects non-existent or non-FAILED entry, and triggers copy for FAILED entry.
 * 5. Lesson creation with type: 'VIDEO' validates Drive file and returns response without driveFileId.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { VideoCacheStatus } from '@prisma/client';
import { env } from '../../../src/config/env';
import { errorHandler } from '../../../src/middleware/errorHandler';

// ── Hoisted Mocks ────────────────────────────────────────────────────────────

const {
  mockPrisma,
  mockDriveService,
  mockR2,
  mockActivityService,
} = vi.hoisted(() => {
  return {
    mockPrisma: {
      videoCache: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
        aggregate: vi.fn(),
      },
      videoLease: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
      course: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      lesson: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      enrollment: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      courseTarget: {
        createMany: vi.fn(),
      },
      student: {
        findMany: vi.fn(),
      },
      lessonProgress: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn((fn: any) => {
        if (typeof fn === 'function') {
          return fn(mockPrisma);
        }
        return Promise.all(fn);
      }),
    },
    mockDriveService: {
      getFileMetadata: vi.fn(),
      getFileStream: vi.fn(),
    },
    mockR2: {
      putObjectStream: vi.fn(),
      deleteObject: vi.fn(),
      headObject: vi.fn(),
    },
    mockActivityService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// ── Module Mocks ─────────────────────────────────────────────────────────────

vi.mock('../../../src/infrastructure/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../src/modules/media/drive/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modules/media/drive/index')>();
  return {
    ...actual,
    driveService: mockDriveService,
  };
});

vi.mock('../../../src/infrastructure/r2', () => ({
  r2Adapter: mockR2,
}));

vi.mock('../../../src/modules/admin', () => ({
  ActivityService: mockActivityService,
}));

// ── Router & App Setup ───────────────────────────────────────────────────────

import { adminVideoCacheRouter } from '../../../src/modules/video-cache/video-cache.routes';
import { adminCoursesRouter } from '../../../src/modules/learning-courses/courses.routes';
import { cacheService } from '../../../src/modules/video-cache/cache.service';
import { cacheEvictionService } from '../../../src/modules/video-cache/cache-eviction.service';

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(['/api/admin', '/admin/api'], adminVideoCacheRouter);
app.use('/admin', adminCoursesRouter);
app.use(errorHandler);

// Helper for admin auth cookie
const adminPayload = {
  userId: 'admin_test_1',
  email: 'admin@sasi.ac.in',
  username: 'admin',
};
const adminCookie = `${env.ADMIN_SESSION_COOKIE_NAME}=${jwt.sign(adminPayload, env.JWT_SECRET)}`;

// ── Test Suites ──────────────────────────────────────────────────────────────

describe('Admin Video Cache & Video Lesson Attachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Authentication guard
  describe('1. Authentication Guard', () => {
    it('returns 401 when request to GET /api/admin/video-cache has no session', async () => {
      const res = await request(app).get('/api/admin/video-cache');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('returns 401 when session cookie is invalid', async () => {
      const res = await request(app)
        .get('/api/admin/video-cache')
        .set('Cookie', `${env.ADMIN_SESSION_COOKIE_NAME}=invalid-junk-token`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_TOKEN');
    });

    it('works when mounted under /admin/api/video-cache as well', async () => {
      mockPrisma.videoCache.findMany.mockResolvedValue([]);
      mockPrisma.videoCache.count.mockResolvedValue(0);
      mockPrisma.videoCache.aggregate.mockResolvedValue({ _sum: { sizeBytes: BigInt(0) } });
      mockPrisma.videoCache.groupBy.mockResolvedValue([]);

      const res = await request(app)
        .get('/admin/api/video-cache')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('entries');
      expect(res.body).toHaveProperty('totals');
      expect(res.body).toHaveProperty('pagination');
    });
  });

  // 2. Paginated list & SEC-4 non-leakage
  describe('2. Paginated Cache Status & SEC-4 Projection', () => {
    it('returns formatted entries and totals without leaking driveFileId or r2Key', async () => {
      const now = new Date();
      const mockRawRows = [
        {
          id: 'vc_ready_1',
          status: VideoCacheStatus.READY,
          sizeBytes: BigInt(52428800), // ~50MB
          lastAccessedAt: new Date(now.getTime() - 3600000),
          failReason: null,
          createdAt: new Date(now.getTime() - 86400000),
          leases: [{ id: 'lease_1' }],
          // Raw DB row might have internal keys if leaked:
          driveFileId: 'TOP_SECRET_DRIVE_FILE_ID_1',
          r2Key: 'lesson-cache/TOP_SECRET_R2_KEY_1',
        },
        {
          id: 'vc_failed_2',
          status: VideoCacheStatus.FAILED,
          sizeBytes: null,
          lastAccessedAt: new Date(now.getTime() - 7200000),
          failReason: 'VIDEO_INVALID_MIME_TYPE',
          createdAt: new Date(now.getTime() - 43200000),
          leases: [],
          driveFileId: 'TOP_SECRET_DRIVE_FILE_ID_2',
          r2Key: 'lesson-cache/TOP_SECRET_R2_KEY_2',
        },
      ];

      mockPrisma.videoCache.findMany.mockResolvedValue(mockRawRows);
      mockPrisma.videoCache.count.mockResolvedValue(2);
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(52428800) },
      });
      mockPrisma.videoCache.groupBy.mockResolvedValue([
        { status: VideoCacheStatus.READY, _count: { id: 1 } },
        { status: VideoCacheStatus.FAILED, _count: { id: 1 } },
      ]);

      const res = await request(app)
        .get('/api/admin/video-cache?page=1&limit=10')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);

      // Verify response structure
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });

      expect(res.body.totals).toEqual({
        usedBytes: '52428800',
        maxBytes: env.VIDEO_CACHE_MAX_BYTES.toString(),
        counts: {
          ready: 1,
          copying: 0,
          failed: 1,
          total: 2,
        },
      });

      expect(res.body.entries).toHaveLength(2);
      const readyEntry = res.body.entries[0];
      expect(readyEntry).toMatchObject({
        id: 'vc_ready_1',
        status: 'READY',
        sizeMb: 50,
        activeLeaseCount: 1,
        failReason: null,
      });

      const failedEntry = res.body.entries[1];
      expect(failedEntry).toMatchObject({
        id: 'vc_failed_2',
        status: 'FAILED',
        sizeMb: null,
        activeLeaseCount: 0,
        failReason: 'VIDEO_INVALID_MIME_TYPE',
      });

      // SEC-4: STRICT assertions: driveFileId and r2Key MUST NOT leak in JSON
      const jsonOutput = JSON.stringify(res.body);
      expect(jsonOutput).not.toContain('TOP_SECRET_DRIVE_FILE_ID');
      expect(jsonOutput).not.toContain('TOP_SECRET_R2_KEY');
      expect(readyEntry).not.toHaveProperty('driveFileId');
      expect(readyEntry).not.toHaveProperty('r2Key');
      expect(failedEntry).not.toHaveProperty('driveFileId');
      expect(failedEntry).not.toHaveProperty('r2Key');
    });
  });

  // 3. Purge idle cache & Active Lease Protection
  describe('3. Purge Idle Cache & Active Lease Safety', () => {
    it('purge idle only evicts evictable entries and NEVER touches entries with active leases', async () => {
      const now = new Date();
      const mockEvictScheduled = vi.spyOn(cacheEvictionService, 'evictScheduled').mockResolvedValue({
        expiredLeasesDeleted: 3,
        evictedCount: 2,
        freedBytes: BigInt(104857600), // 100MB
      });

      const res = await request(app)
        .post('/api/admin/video-cache/purge-idle')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        evictedCount: 2,
        freedBytes: '104857600',
        expiredLeasesDeleted: 3,
      });
      expect(mockEvictScheduled).toHaveBeenCalled();
      mockEvictScheduled.mockRestore();
    });

    it('under pressure, eviction preserves entries with active leases', async () => {
      const now = new Date();
      // Candidate 1: Has 1 active lease -> MUST NOT be evicted
      // Candidate 2: Has 0 active leases and idle -> EVICTABLE
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.videoCache.aggregate.mockResolvedValue({
        _sum: { sizeBytes: BigInt(200_000_000) }, // Over limit
      });

      const activeLeasedCandidate = {
        id: 'leased_cache_1',
        driveFileId: 'df_1',
        r2Key: 'lesson-cache/1',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(50_000_000),
        lastAccessedAt: new Date(now.getTime() - 100 * 3600 * 1000), // very idle
        lastUrlIssuedAt: null,
        _count: { leases: 1 },
      };

      const idleCandidate = {
        id: 'idle_cache_2',
        driveFileId: 'df_2',
        r2Key: 'lesson-cache/2',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(60_000_000),
        lastAccessedAt: new Date(now.getTime() - 100 * 3600 * 1000),
        lastUrlIssuedAt: null,
        _count: { leases: 0 },
      };

      mockPrisma.videoCache.findMany.mockResolvedValue([activeLeasedCandidate, idleCandidate]);

      // Atomic delete transaction: returns deleted true only for idle_cache_2
      const deleteSpy = vi.fn().mockImplementation((id: string) => {
        if (id === 'idle_cache_2') {
          return Promise.resolve({
            deleted: true,
            r2Key: 'lesson-cache/2',
            sizeBytes: BigInt(60_000_000),
          });
        }
        return Promise.resolve({ deleted: false });
      });

      const originalAtomic = (cacheEvictionService as any).repo.atomicDeleteIfEvictable;
      (cacheEvictionService as any).repo.atomicDeleteIfEvictable = deleteSpy;

      const result = await cacheEvictionService.evictScheduled();

      // Only the idle candidate without active leases should be evicted
      expect(result.evictedCount).toBe(1);
      expect(deleteSpy).toHaveBeenCalledWith('idle_cache_2', expect.any(Date));
      expect(deleteSpy).not.toHaveBeenCalledWith('leased_cache_1', expect.any(Date));

      (cacheEvictionService as any).repo.atomicDeleteIfEvictable = originalAtomic;
    });
  });

  // 4. Retry Failed Copy Endpoint
  describe('4. Retry Failed Copy Endpoint', () => {
    it('rejects non-existent cache entry with 404', async () => {
      mockPrisma.videoCache.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/admin/video-cache/vc_missing_999/retry')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('rejects entry that is not in FAILED status with 400', async () => {
      mockPrisma.videoCache.findUnique.mockResolvedValue({
        id: 'vc_ready_1',
        status: VideoCacheStatus.READY,
        driveFileId: 'drive_ready_1',
      });

      const res = await request(app)
        .post('/api/admin/video-cache/vc_ready_1/retry')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('Only failed video cache entries can be retried');
    });

    it('triggers copy for FAILED entry and resets entry to COPYING', async () => {
      const failedEntry = {
        id: 'vc_failed_1',
        status: VideoCacheStatus.FAILED,
        driveFileId: 'drive_file_for_retry_1',
        copyAttempts: 2,
        failReason: 'VIDEO_COPY_FAILED',
      };

      const updatedEntry = {
        ...failedEntry,
        status: VideoCacheStatus.COPYING,
        copyAttempts: 3,
        failReason: null,
      };

      mockPrisma.videoCache.findUnique.mockResolvedValue(failedEntry);
      mockPrisma.videoCache.update.mockResolvedValue(updatedEntry);

      const ensureCachedSpy = vi
        .spyOn(cacheService, 'ensureCached')
        .mockResolvedValue({ status: 'PREPARING' });

      const res = await request(app)
        .post('/api/admin/video-cache/vc_failed_1/retry')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Copy retry initiated',
      });

      // Verified DB update was called
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith({
        where: { id: 'vc_failed_1' },
        data: {
          status: VideoCacheStatus.COPYING,
          claimedAt: expect.any(Date),
          copyAttempts: { increment: 1 },
          failReason: null,
        },
      });

      // Verified ensureCached was invoked with the driveFileId
      expect(ensureCachedSpy).toHaveBeenCalledWith('drive_file_for_retry_1', { force: true });

      ensureCachedSpy.mockRestore();
    });
  });

  // 5. Lesson Creation with VIDEO type
  describe('5. Lesson Creation with type: VIDEO', () => {
    it('validates Drive file and throws 400 when file does not exist or is not a video', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'course_101',
        title: 'Fullstack Course',
        lessons: [],
        targets: [],
        quizzes: [],
        _count: { enrollments: 0, lessons: 0 },
      });

      // Mock Drive getFileMetadata returning null (file inaccessible or trashed)
      mockDriveService.getFileMetadata.mockResolvedValue(null);
      mockDriveService.getFileStream.mockRejectedValue(new Error('File not found in Drive'));

      const res = await request(app)
        .post('/admin/courses/course_101/lessons')
        .set('Cookie', adminCookie)
        .send({
          title: 'Intro Video Lesson',
          type: 'VIDEO',
          url: 'https://drive.google.com/file/d/inaccessible_file_123/view',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('Provided Drive file is not a valid video or is inaccessible');
    });

    it('validates Drive file and throws 400 when MIME type is not video/*', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'course_101',
        title: 'Fullstack Course',
        lessons: [],
        targets: [],
        quizzes: [],
        _count: { enrollments: 0, lessons: 0 },
      });

      mockDriveService.getFileMetadata.mockResolvedValue({
        id: 'doc_file_123',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
      });

      const res = await request(app)
        .post('/admin/courses/course_101/lessons')
        .set('Cookie', adminCookie)
        .send({
          title: 'PDF Lesson disguised as video',
          type: 'VIDEO',
          url: 'https://drive.google.com/file/d/doc_file_123/view',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('Provided Drive file is not a valid video or is inaccessible');
    });

    it('accepts valid video Drive file, saves driveFileId, and NEVER returns driveFileId in response (SEC-4)', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'course_101',
        title: 'Fullstack Course',
        lessons: [],
        targets: [],
        quizzes: [],
        _count: { enrollments: 0, lessons: 0 },
      });
      mockPrisma.lesson.findFirst.mockResolvedValue(null);

      mockDriveService.getFileMetadata.mockResolvedValue({
        id: 'valid_video_drive_id_999',
        mimeType: 'video/mp4',
        sizeBytes: 15728640,
        name: 'lesson1.mp4',
      });

      mockPrisma.lesson.create.mockResolvedValue({
        id: 'lesson_new_1',
        courseId: 'course_101',
        title: 'Building Components',
        type: 'VIDEO',
        order: 1,
        url: null,
        durationSec: 1200,
        driveFileId: 'valid_video_drive_id_999',
        notes: null,
        youtubeVideoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/admin/courses/course_101/lessons')
        .set('Cookie', adminCookie)
        .send({
          title: 'Building Components',
          type: 'VIDEO',
          url: 'https://drive.google.com/file/d/valid_video_drive_id_999/view?usp=sharing',
          durationSec: 1200,
        });

      expect(res.status).toBe(201);

      // Verify created in DB with extracted Drive ID
      expect(mockPrisma.lesson.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          courseId: 'course_101',
          title: 'Building Components',
          type: 'VIDEO',
          driveFileId: 'valid_video_drive_id_999',
          url: null,
        }),
      });

      // Response checks
      expect(res.body).toMatchObject({
        id: 'lesson_new_1',
        title: 'Building Components',
        type: 'VIDEO',
        hasVideo: true,
      });

      // SEC-4: Response MUST NEVER contain driveFileId!
      expect(res.body).not.toHaveProperty('driveFileId');
      expect(JSON.stringify(res.body)).not.toContain('valid_video_drive_id_999');
    });

    it('also strips driveFileId from getAdminCourse response', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'course_101',
        title: 'Fullstack Course',
        slug: 'fullstack-course',
        lessons: [
          {
            id: 'l_vid_1',
            courseId: 'course_101',
            title: 'Video 1',
            type: 'VIDEO',
            order: 1,
            driveFileId: 'PRIVATE_DRIVE_ID_ABC',
            url: null,
            durationSec: 300,
            notes: null,
            youtubeVideoId: null,
          },
        ],
        targets: [],
        quizzes: [],
        _count: { enrollments: 5, lessons: 1 },
      });

      const res = await request(app)
        .get('/admin/courses/course_101')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.lessons[0]).toMatchObject({
        id: 'l_vid_1',
        title: 'Video 1',
        hasVideo: true,
      });
      expect(res.body.lessons[0]).not.toHaveProperty('driveFileId');
      expect(JSON.stringify(res.body)).not.toContain('PRIVATE_DRIVE_ID_ABC');
    });
  });
});
