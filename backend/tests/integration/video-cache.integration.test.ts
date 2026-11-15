/**
 * End-to-End Integration Test for Video Cache & Ephemeral Leases:
 *
 * Verifies full end-to-end integration across:
 * - Express application (app from backend/src/server.ts)
 * - Video Cache Module (atomic claim, background copy, semaphore)
 * - Ephemeral Leases (access tokens, heartbeat, auto-refresh)
 * - Cloudflare R2 In-Memory Fake (streaming upload, presigned URLs, eviction)
 * - Google Drive In-Memory Fake (streaming chunks, MD5 checksum)
 * - SEC-4 compliance (no Google Drive IDs or Cloudflare R2 keys exposed)
 * - Transactional Eviction & Rotation (protection of active leases and safe idle window)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Readable } from 'stream';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  VideoCacheStatus,
  CourseStatus,
  EnrolmentType,
  LessonType,
  EnrollmentStatus,
} from '@prisma/client';

// ── In-Memory State & Hoisted Mocks ──────────────────────────────────────────

const {
  r2Store,
  mockPutObjectStream,
  mockHeadObject,
  mockDeleteObject,
  mockListObjects,
  mockPresignGet,
  mockGetFileStream,
  videoCaches,
  videoLeases,
  enrollments,
  lessons,
  mockPrisma,
} = vi.hoisted(() => {
  const crypto = require('crypto');
  const { Readable } = require('stream');

  const r2Store = new Map<string, Buffer>();
  const videoCaches = new Map<string, any>();
  const videoLeases = new Map<string, any>();
  const enrollments = new Map<string, any>();

  const course1 = {
    id: 'course_integration_1',
    title: 'Cloud Distributed Systems',
    slug: 'cloud-distributed-systems',
    status: 'PUBLISHED',
    enrolment: 'OPEN',
  };

  const course2 = {
    id: 'course_integration_2',
    title: 'Restricted Advanced Lab',
    slug: 'restricted-advanced-lab',
    status: 'PUBLISHED',
    enrolment: 'ASSIGNED_ONLY',
  };

  const lesson1 = {
    id: 'lesson_integration_1',
    courseId: course1.id,
    title: 'Lecture 1: Zero-Egress Caching',
    order: 1,
    type: 'VIDEO',
    durationSec: 1800,
    driveFileId: 'drive_file_video_integration_101',
    course: course1,
    quiz: null,
  };

  const lesson2 = {
    id: 'lesson_integration_2',
    courseId: course2.id,
    title: 'Lecture 2: Restricted Research',
    order: 1,
    type: 'VIDEO',
    durationSec: 2400,
    driveFileId: 'drive_file_video_integration_202',
    course: course2,
    quiz: null,
  };

  const lessons = [lesson1, lesson2];

  const mockPutObjectStream = vi.fn(async (key: string, stream: Readable, _size: number) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    r2Store.set(key, buffer);
  });

  const mockHeadObject = vi.fn(async (key: string) => {
    const buf = r2Store.get(key);
    if (!buf) return null;
    return {
      sizeBytes: buf.length,
      md5: crypto.createHash('md5').update(buf).digest('hex'),
    };
  });

  const mockDeleteObject = vi.fn(async (key: string) => {
    r2Store.delete(key);
  });

  const mockListObjects = vi.fn(async (prefix: string) => {
    const list = [];
    for (const [key, buf] of r2Store.entries()) {
      if (key.startsWith(prefix)) {
        list.push({ key, sizeBytes: buf.length });
      }
    }
    return list;
  });

  const mockPresignGet = vi.fn(async (key: string, ttlSec: number) => {
    // Generate an opaque URL token to guarantee zero leakage of driveFileId or literal r2Key
    const opaqueToken = crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
    return `https://r2.campus.edu/video/stream/${opaqueToken}?expiresIn=${ttlSec}&sig=mock-secure-sig`;
  });

  const syntheticVideo = Buffer.from('synthetic-video-stream-payload-integration-chunk-987654321');
  const syntheticMd5 = crypto.createHash('md5').update(syntheticVideo).digest('hex');

  const mockGetFileStream = vi.fn(async (_driveFileId: string) => {
    return {
      stream: Readable.from(syntheticVideo),
      mimeType: 'video/mp4',
      sizeBytes: syntheticVideo.length,
      md5Checksum: syntheticMd5,
    };
  });

  const prismaModels: any = {
    course: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id === course1.id) return course1;
        if (where.id === course2.id) return course2;
        return null;
      }),
      findMany: vi.fn(async () => [course1, course2]),
    },
    lesson: {
      findUnique: vi.fn(async ({ where }: any) => {
        const found = lessons.find((l) => l.id === where.id);
        if (!found) return null;
        return { ...found };
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return lessons.filter((l) => !where?.courseId || l.courseId === where.courseId);
      }),
      count: vi.fn(async () => lessons.length),
    },
    enrollment: {
      findUnique: vi.fn(async ({ where }: any) => {
        const key = `${where.studentId_courseId.studentId}_${where.studentId_courseId.courseId}`;
        return enrollments.get(key) || null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const key = `${where.studentId_courseId.studentId}_${where.studentId_courseId.courseId}`;
        const existing = enrollments.get(key) || {
          studentId: where.studentId_courseId.studentId,
          courseId: where.studentId_courseId.courseId,
          status: 'ACTIVE',
        };
        const updated = { ...existing, ...data };
        enrollments.set(key, updated);
        return updated;
      }),
    },
    lessonProgress: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async ({ create, update }: any) => ({ ...create, ...update })),
      count: vi.fn(async () => 0),
    },
    videoCache: {
      findUnique: vi.fn(async ({ where, include }: any) => {
        let found: any;
        if (where.id) {
          found = Array.from(videoCaches.values()).find((c) => c.id === where.id);
        } else if (where.driveFileId) {
          found = videoCaches.get(where.driveFileId);
        }
        if (!found) return null;

        const res = { ...found };
        if (include?.leases) {
          const gt = include.leases.where?.expiresAt?.gt;
          res.leases = Array.from(videoLeases.values())
            .filter((l) => l.cacheId === found.id && (!gt || l.expiresAt > gt))
            .map((l) => ({ id: l.id }));
        }
        return res;
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = `vcache_${crypto.randomUUID().slice(0, 8)}`;
        const entry = {
          id,
          driveFileId: data.driveFileId,
          r2Key: data.r2Key,
          status: data.status,
          sizeBytes: data.sizeBytes ? BigInt(data.sizeBytes) : BigInt(0),
          md5Checksum: data.md5Checksum || null,
          copyAttempts: data.copyAttempts || 1,
          claimedAt: data.claimedAt || new Date(),
          readyAt: data.readyAt || null,
          lastAccessedAt: data.lastAccessedAt || new Date(),
          lastUrlIssuedAt: data.lastUrlIssuedAt || null,
          failReason: data.failReason || null,
        };
        videoCaches.set(data.driveFileId, entry);
        return { ...entry };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        let entry: any;
        if (where.id) {
          entry = Array.from(videoCaches.values()).find((c) => c.id === where.id);
        } else if (where.driveFileId) {
          entry = videoCaches.get(where.driveFileId);
        }
        if (!entry) throw new Error(`VideoCache not found: ${JSON.stringify(where)}`);

        Object.assign(entry, data);
        if (data.sizeBytes !== undefined) {
          entry.sizeBytes = BigInt(data.sizeBytes);
        }
        return { ...entry };
      }),
      delete: vi.fn(async ({ where }: any) => {
        let entry: any;
        if (where.id) {
          entry = Array.from(videoCaches.values()).find((c) => c.id === where.id);
        }
        if (entry) {
          videoCaches.delete(entry.driveFileId);
        }
        return entry;
      }),
      aggregate: vi.fn(async ({ where }: any) => {
        let sum = BigInt(0);
        for (const c of videoCaches.values()) {
          if (!where?.status || c.status === where.status) {
            sum += c.sizeBytes;
          }
        }
        return { _sum: { sizeBytes: sum } };
      }),
      findMany: vi.fn(async ({ where, include }: any) => {
        let items = Array.from(videoCaches.values());
        if (where?.status) {
          items = items.filter((c) => c.status === where.status);
        }
        if (where?.lastAccessedAt?.lte) {
          const cutoff = new Date(where.lastAccessedAt.lte).getTime();
          items = items.filter((c) => new Date(c.lastAccessedAt).getTime() <= cutoff);
        }
        return items.map((item) => {
          const res: any = { ...item };
          if (include?._count?.select?.leases) {
            const activeCount = Array.from(videoLeases.values()).filter(
              (l) => l.cacheId === item.id && l.expiresAt > new Date(),
            ).length;
            res._count = { leases: activeCount, videoLeases: activeCount };
          }
          return res;
        });
      }),
    },
    videoLease: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const key = `${where.studentId_lessonId.studentId}_${where.studentId_lessonId.lessonId}`;
        let existing = videoLeases.get(key);
        if (existing) {
          existing = { ...existing, ...update, lastHeartbeatAt: new Date() };
        } else {
          existing = {
            id: `lease_${crypto.randomUUID().slice(0, 8)}`,
            studentId: create.studentId,
            lessonId: create.lessonId,
            cacheId: create.cacheId,
            expiresAt: create.expiresAt,
            lastHeartbeatAt: new Date(),
          };
        }
        videoLeases.set(key, existing);
        return { ...existing };
      }),
      findFirst: vi.fn(async ({ where, include }: any) => {
        for (const lease of videoLeases.values()) {
          if (where.studentId && lease.studentId !== where.studentId) continue;
          if (where.lessonId && lease.lessonId !== where.lessonId) continue;
          if (where.cacheId && lease.cacheId !== where.cacheId) continue;
          if (where.expiresAt?.gt && lease.expiresAt <= where.expiresAt.gt) continue;

          const res: any = { ...lease };
          if (include?.cache) {
            res.cache = Array.from(videoCaches.values()).find((c) => c.id === lease.cacheId);
          }
          return res;
        }
        return null;
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        let count = 0;
        for (const [key, lease] of Array.from(videoLeases.entries())) {
          if (where?.expiresAt?.lte && lease.expiresAt <= where.expiresAt.lte) {
            videoLeases.delete(key);
            count++;
          } else if (
            where?.studentId &&
            where?.lessonId &&
            lease.studentId === where.studentId &&
            lease.lessonId === where.lessonId
          ) {
            videoLeases.delete(key);
            count++;
          }
        }
        return { count };
      }),
    },
    $transaction: vi.fn(async (cb: any) => {
      if (typeof cb === 'function') {
        return cb(mockPrisma);
      }
      return Promise.all(cb);
    }),
  };

  const createPrismaModelFallback = () => {
    return new Proxy(
      {},
      {
        get(_target, prop) {
          return vi.fn().mockResolvedValue(null);
        },
      },
    );
  };

  const mockPrisma: any = new Proxy(prismaModels, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      target[prop] = createPrismaModelFallback();
      return target[prop];
    },
  });

  return {
    r2Store,
    mockPutObjectStream,
    mockHeadObject,
    mockDeleteObject,
    mockListObjects,
    mockPresignGet,
    mockGetFileStream,
    videoCaches,
    videoLeases,
    enrollments,
    lessons,
    mockPrisma,
  };
});

// ── Module Mocks ─────────────────────────────────────────────────────────────

vi.mock('../../src/infrastructure/prisma', () => ({
  prisma: mockPrisma,
  connectDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/infrastructure/r2', () => ({
  r2Adapter: {
    putObjectStream: mockPutObjectStream,
    headObject: mockHeadObject,
    deleteObject: mockDeleteObject,
    listObjects: mockListObjects,
    presignGet: mockPresignGet,
  },
}));

vi.mock('../../src/modules/media/drive', () => ({
  driveService: {
    getFileStream: mockGetFileStream,
  },
}));

vi.mock('../../src/modules/media/drive/index', () => ({
  driveService: {
    getFileStream: mockGetFileStream,
  },
}));

// ── Application & Config ─────────────────────────────────────────────────────

import app from '../../src/server';
import { env } from '../../src/config/env';

describe('Video Cache & Playback Integration (vitest + supertest + server)', () => {
  const INTERNAL_SECRET = 'test-video-cache-internal-sync-secret-999';

  const studentA = {
    studentId: 'stud_integ_alpha',
    rollNo: '23K61A1201',
    name: 'Student Alpha',
  };
  const studentB = {
    studentId: 'stud_integ_beta',
    rollNo: '23K61A1202',
    name: 'Student Beta',
  };
  const studentC = {
    studentId: 'stud_integ_gamma',
    rollNo: '23K61A1203',
    name: 'Student Gamma',
  };

  let studentACookie: string;
  let studentBCookie: string;
  let studentCCookie: string;

  beforeEach(() => {
    // Reset test in-memory state
    r2Store.clear();
    videoCaches.clear();
    videoLeases.clear();
    enrollments.clear();
    vi.clearAllMocks();

    // Ensure environment settings
    (env as any).FEATURE_LEARNINGHUB = true;
    (env as any).FEATURE_VIDEO_CACHE = true;
    (env as any).INTERNAL_SYNC_SECRET = INTERNAL_SECRET;
    (env as any).VIDEO_LEASE_TTL_SEC = 180;
    (env as any).VIDEO_URL_TTL_SEC = 600;
    (env as any).VIDEO_CACHE_MAX_BYTES = BigInt(10 * 1024 * 1024 * 1024); // 10 GB
    (env as any).VIDEO_CACHE_IDLE_HOURS = 6;
    (env as any).VIDEO_CACHE_MAX_IDLE_HOURS = 24;
    (env as any).VIDEO_COPY_CONCURRENCY = 2;

    // Issue authentication cookies
    studentACookie = `pc_student_session=${jwt.sign(studentA, env.STUDENT_JWT_SECRET)}`;
    studentBCookie = `pc_student_session=${jwt.sign(studentB, env.STUDENT_JWT_SECRET)}`;
    studentCCookie = `pc_student_session=${jwt.sign(studentC, env.STUDENT_JWT_SECRET)}`;

    // Set active enrollments for Course 1 (Student A and Student B)
    enrollments.set(`${studentA.studentId}_course_integration_1`, {
      studentId: studentA.studentId,
      courseId: 'course_integration_1',
      status: EnrollmentStatus.ACTIVE,
      lastAccessedAt: new Date(),
    });
    enrollments.set(`${studentB.studentId}_course_integration_1`, {
      studentId: studentB.studentId,
      courseId: 'course_integration_1',
      status: EnrollmentStatus.ACTIVE,
      lastAccessedAt: new Date(),
    });
    // Note: Student C is deliberately NOT enrolled in course_integration_2 (ASSIGNED_ONLY)
  });

  it('executes full end-to-end video cache, playback, lease isolation, and eviction lifecycle', async () => {
    const lesson1Id = 'lesson_integration_1';
    const driveFileId = 'drive_file_video_integration_101';

    // ──────────────────────────────────────────────────────────────────────────
    // Step 1: Student A requests playback -> returns 200 { status: 'PREPARING', retryAfterSec: 3 }
    // ──────────────────────────────────────────────────────────────────────────
    const step1Res = await request(app)
      .post(`/api/student/learning/lessons/${lesson1Id}/playback`)
      .set('Cookie', studentACookie);

    expect(step1Res.status).toBe(200);
    expect(step1Res.body).toEqual({
      status: 'PREPARING',
      retryAfterSec: 3,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Step 2: Copy completes -> Status transitions to READY in VideoCache
    // ──────────────────────────────────────────────────────────────────────────
    await vi.waitFor(
      () => {
        const cacheEntry = videoCaches.get(driveFileId);
        expect(cacheEntry).toBeDefined();
        expect(cacheEntry?.status).toBe(VideoCacheStatus.READY);
      },
      { timeout: 3000, interval: 20 },
    );

    const readyCache = videoCaches.get(driveFileId)!;
    expect(readyCache.status).toBe(VideoCacheStatus.READY);
    expect(readyCache.sizeBytes).toBeGreaterThan(BigInt(0));
    expect(r2Store.has(readyCache.r2Key)).toBe(true);

    // ──────────────────────────────────────────────────────────────────────────
    // Step 3: Student A retries -> returns 200 { status: 'READY', url, expiresAt, leaseId }
    // ──────────────────────────────────────────────────────────────────────────
    const step3Res = await request(app)
      .post(`/api/student/learning/lessons/${lesson1Id}/playback`)
      .set('Cookie', studentACookie);

    expect(step3Res.status).toBe(200);
    expect(step3Res.body.status).toBe('READY');
    expect(typeof step3Res.body.url).toBe('string');
    expect(step3Res.body.url).toContain('https://');
    expect(typeof step3Res.body.expiresAt).toBe('string');
    expect(typeof step3Res.body.leaseId).toBe('string');

    const studentALeaseId = step3Res.body.leaseId;

    // ──────────────────────────────────────────────────────────────────────────
    // Step 4: Student B requests the same lesson -> returns 200 { status: 'READY' } immediately
    // without triggering a second copy! Verify driveService.getFileStream called exactly ONCE.
    // ──────────────────────────────────────────────────────────────────────────
    const step4Res = await request(app)
      .post(`/api/student/learning/lessons/${lesson1Id}/playback`)
      .set('Cookie', studentBCookie);

    expect(step4Res.status).toBe(200);
    expect(step4Res.body.status).toBe('READY');
    expect(typeof step4Res.body.url).toBe('string');
    expect(typeof step4Res.body.expiresAt).toBe('string');
    expect(typeof step4Res.body.leaseId).toBe('string');
    expect(step4Res.body.leaseId).not.toBe(studentALeaseId); // Leases are isolated per student

    // Verification: Drive stream was called exactly ONCE across both student playback requests
    expect(mockGetFileStream).toHaveBeenCalledTimes(1);

    // ──────────────────────────────────────────────────────────────────────────
    // Step 5: Both students have active presigned URLs:
    // Neither response contains driveFileId or r2Key (SEC-4 compliance).
    // ──────────────────────────────────────────────────────────────────────────
    expect(typeof step3Res.body.url).toBe('string');
    expect(step3Res.body.url.length).toBeGreaterThan(20);
    expect(typeof step4Res.body.url).toBe('string');
    expect(step4Res.body.url.length).toBeGreaterThan(20);

    // Assert explicit JSON field omission
    expect(step3Res.body.driveFileId).toBeUndefined();
    expect(step3Res.body.r2Key).toBeUndefined();
    expect(step4Res.body.driveFileId).toBeUndefined();
    expect(step4Res.body.r2Key).toBeUndefined();

    // Assert raw payload body does not leak internal storage identifiers
    const studentABodyStr = JSON.stringify(step3Res.body);
    const studentBBodyStr = JSON.stringify(step4Res.body);
    expect(studentABodyStr).not.toContain(driveFileId);
    expect(studentABodyStr).not.toContain(readyCache.r2Key);
    expect(studentBBodyStr).not.toContain(driveFileId);
    expect(studentBBodyStr).not.toContain(readyCache.r2Key);

    // ──────────────────────────────────────────────────────────────────────────
    // Step 6: Unauthorized student:
    // Request with no auth header or student not enrolled in ASSIGNED_ONLY course returns 401 or 403.
    // ──────────────────────────────────────────────────────────────────────────
    // Sub-case 6a: Missing authentication cookie / header -> 401 UNAUTHORIZED
    const unauthRes = await request(app).post(`/api/student/learning/lessons/${lesson1Id}/playback`);
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error).toBe('UNAUTHORIZED');

    // Sub-case 6b: Student C authenticated but NOT enrolled in ASSIGNED_ONLY course -> 403 FORBIDDEN
    const forbiddenRes = await request(app)
      .post('/api/student/learning/lessons/lesson_integration_2/playback')
      .set('Cookie', studentCCookie);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error).toBe('FORBIDDEN');
    expect(forbiddenRes.body.message).toContain('not enrolled in this course');

    // ──────────────────────────────────────────────────────────────────────────
    // Step 7: Evict with active leases:
    // Trigger eviction endpoint POST /api/internal/video-cache/evict.
    // Because Student A and Student B hold active leases, assert 0 items evicted and R2 object NOT deleted.
    // ──────────────────────────────────────────────────────────────────────────
    const step7Res = await request(app)
      .post('/api/internal/video-cache/evict')
      .set('Authorization', `Bearer ${INTERNAL_SECRET}`);

    expect(step7Res.status).toBe(200);
    expect(step7Res.body.success).toBe(true);
    expect(step7Res.body.evictedCount).toBe(0);

    // Verify R2 object was NOT deleted and cache row remains READY
    expect(mockDeleteObject).not.toHaveBeenCalled();
    expect(r2Store.has(readyCache.r2Key)).toBe(true);
    expect(videoCaches.get(driveFileId)?.status).toBe(VideoCacheStatus.READY);

    // ──────────────────────────────────────────────────────────────────────────
    // Step 8: Evict after lease expiry & idle window:
    // Advance time: update lease expiry in the past and set lastAccessedAt / lastUrlIssuedAt past idle threshold.
    // Assert cache row deleted and r2Adapter.deleteObject is called for the R2 key!
    // ──────────────────────────────────────────────────────────────────────────
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);

    // Expire all active leases
    for (const lease of videoLeases.values()) {
      lease.expiresAt = twoDaysAgo;
    }

    // Age cache timestamps past idle threshold (VIDEO_CACHE_MAX_IDLE_HOURS = 24)
    readyCache.lastAccessedAt = twoDaysAgo;
    readyCache.lastUrlIssuedAt = twoDaysAgo;

    const step8Res = await request(app)
      .post('/api/internal/video-cache/evict')
      .set('Authorization', `Bearer ${INTERNAL_SECRET}`);

    expect(step8Res.status).toBe(200);
    expect(step8Res.body.success).toBe(true);
    expect(step8Res.body.expiredLeasesDeleted).toBeGreaterThanOrEqual(2);
    expect(step8Res.body.evictedCount).toBe(1);

    // Verify R2 deletion and database cleanup
    expect(mockDeleteObject).toHaveBeenCalledWith(readyCache.r2Key);
    expect(r2Store.has(readyCache.r2Key)).toBe(false);
    expect(videoCaches.has(driveFileId)).toBe(false);
  });
});
