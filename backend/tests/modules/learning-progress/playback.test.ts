import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';
import { studentProgressRouter } from '../../../src/modules/learning-progress/progress.routes';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { VideoCacheStatus, LessonType, CourseStatus, EnrolmentType } from '@prisma/client';

const { mockPrisma, mockR2 } = vi.hoisted(() => {
  return {
    mockPrisma: {
      lesson: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      enrollment: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      lessonProgress: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      },
      videoCache: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      videoLease: {
        upsert: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
    mockR2: {
      presignGet: vi.fn(),
      deleteObject: vi.fn(),
      putObjectStream: vi.fn(),
    },
  };
});

vi.mock('../../../src/infrastructure/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../src/infrastructure/r2', () => ({
  r2Adapter: mockR2,
}));

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(studentProgressRouter);
app.use(errorHandler);

const student1 = {
  studentId: 'stud_playback_1',
  rollNo: '23K61A1201',
  name: 'Student One',
};
const student2 = {
  studentId: 'stud_playback_2',
  rollNo: '23K61A1202',
  name: 'Student Two',
};
const student1Cookie = `pc_student_session=${jwt.sign(student1, env.STUDENT_JWT_SECRET)}`;
const student2Cookie = `pc_student_session=${jwt.sign(student2, env.STUDENT_JWT_SECRET)}`;

describe('Playback & Leases (learning-progress)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockR2.presignGet.mockResolvedValue('https://r2.example.com/presigned-video.mp4?sig=abc123xyz');
  });

  describe('POST /lessons/:id/playback', () => {
    it('returns 401 when unauthenticated (no student session cookie)', async () => {
      const res = await request(app).post('/lessons/lesson_1/playback');
      expect(res.status).toBe(401);
    });

    it('returns 404 when lesson does not exist', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/lessons/lesson_nonexistent/playback')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('returns 404 when lesson belongs to a DRAFT course', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson_draft',
        title: 'Draft Lesson',
        type: LessonType.VIDEO,
        driveFileId: 'drive_file_draft',
        course: {
          id: 'course_draft',
          title: 'Draft Course',
          slug: 'draft-course',
          status: CourseStatus.DRAFT,
          enrolment: EnrolmentType.OPEN,
        },
      });

      const res = await request(app)
        .post('/lessons/lesson_draft/playback')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(404);
    });

    it('returns 403 when student is not enrolled in an ASSIGNED_ONLY course', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson_assigned',
        title: 'Assigned Lesson',
        type: LessonType.VIDEO,
        driveFileId: 'drive_file_assigned',
        course: {
          id: 'course_assigned',
          title: 'Assigned Course',
          slug: 'assigned-course',
          status: CourseStatus.PUBLISHED,
          enrolment: EnrolmentType.ASSIGNED_ONLY,
        },
      });
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/lessons/lesson_assigned/playback')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('returns 400 when lesson is not a VIDEO or lacks driveFileId', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson_notes',
        title: 'Text Notes',
        type: LessonType.NOTES,
        driveFileId: null,
        course: {
          id: 'course_1',
          title: 'Course 1',
          slug: 'course-1',
          status: CourseStatus.PUBLISHED,
          enrolment: EnrolmentType.OPEN,
        },
      });

      const res = await request(app)
        .post('/lessons/lesson_notes/playback')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 200 { status: "PREPARING", retryAfterSec: 3 } when video is copying', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson_video',
        title: 'Video Lesson',
        type: LessonType.VIDEO,
        driveFileId: 'drive_file_copying',
        course: {
          id: 'course_1',
          title: 'Course 1',
          slug: 'course-1',
          status: CourseStatus.PUBLISHED,
          enrolment: EnrolmentType.OPEN,
        },
      });
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr_1',
        studentId: student1.studentId,
        courseId: 'course_1',
      });

      // VideoCache is currently COPYING
      mockPrisma.videoCache.findUnique.mockResolvedValue({
        id: 'cache_1',
        driveFileId: 'drive_file_copying',
        r2Key: 'lesson-cache/test-uuid',
        status: VideoCacheStatus.COPYING,
        claimedAt: new Date(),
      });

      const res = await request(app)
        .post('/lessons/lesson_video/playback')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'PREPARING',
        retryAfterSec: 3,
      });
    });

    it('returns 200 { status: "READY", url, expiresAt, leaseId } when video cache is READY', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson_ready',
        title: 'Ready Video Lesson',
        type: LessonType.VIDEO,
        driveFileId: 'drive_file_ready',
        course: {
          id: 'course_1',
          title: 'Course 1',
          slug: 'course-1',
          status: CourseStatus.PUBLISHED,
          enrolment: EnrolmentType.OPEN,
        },
      });
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr_1',
        studentId: student1.studentId,
        courseId: 'course_1',
      });

      const readyCache = {
        id: 'cache_ready_1',
        driveFileId: 'drive_file_ready',
        r2Key: 'lesson-cache/ready-uuid-1',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(50000000),
      };
      mockPrisma.videoCache.findUnique.mockResolvedValue(readyCache);
      mockPrisma.videoCache.update.mockResolvedValue(readyCache);

      const leaseExpiresAt = new Date(Date.now() + 180 * 1000);
      mockPrisma.videoLease.upsert.mockResolvedValue({
        id: 'lease_abc_1',
        studentId: student1.studentId,
        lessonId: 'lesson_ready',
        cacheId: readyCache.id,
        expiresAt: leaseExpiresAt,
      });

      const res = await request(app)
        .post('/lessons/lesson_ready/playback')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READY');
      expect(res.body.url).toContain('https://r2.example.com/presigned-video.mp4');
      expect(res.body.leaseId).toBe('lease_abc_1');
      expect(res.body.expiresAt).toBe(leaseExpiresAt.toISOString());

      // SEC-4 & ERR-12: raw Drive IDs and internal R2 keys must NEVER be exposed in responses
      expect(res.body.driveFileId).toBeUndefined();
      expect(res.body.r2Key).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('drive_file_ready');
      expect(JSON.stringify(res.body)).not.toContain('ready-uuid-1');

      // Touched lastUrlIssuedAt
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: readyCache.id },
          data: expect.objectContaining({
            lastUrlIssuedAt: expect.any(Date),
            lastAccessedAt: expect.any(Date),
          }),
        }),
      );

      // Presigned GET URL with env.VIDEO_URL_TTL_SEC
      expect(mockR2.presignGet).toHaveBeenCalledWith(
        readyCache.r2Key,
        env.VIDEO_URL_TTL_SEC,
      );
    });

    it('handles two students requesting same video: single cache entry, two separate leases', async () => {
      const lessonData = {
        id: 'lesson_shared',
        title: 'Shared Video Lesson',
        type: LessonType.VIDEO,
        driveFileId: 'drive_file_shared',
        course: {
          id: 'course_shared',
          title: 'Shared Course',
          slug: 'shared-course',
          status: CourseStatus.PUBLISHED,
          enrolment: EnrolmentType.OPEN,
        },
      };
      mockPrisma.lesson.findUnique.mockResolvedValue(lessonData);
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enr_shared' });

      const readyCache = {
        id: 'cache_shared_1',
        driveFileId: 'drive_file_shared',
        r2Key: 'lesson-cache/shared-uuid',
        status: VideoCacheStatus.READY,
        sizeBytes: BigInt(75000000),
      };
      mockPrisma.videoCache.findUnique.mockResolvedValue(readyCache);
      mockPrisma.videoCache.update.mockResolvedValue(readyCache);

      // Student 1 request
      mockPrisma.videoLease.upsert.mockResolvedValueOnce({
        id: 'lease_stud_1',
        studentId: student1.studentId,
        lessonId: 'lesson_shared',
        cacheId: readyCache.id,
        expiresAt: new Date(Date.now() + 180_000),
      });

      const res1 = await request(app)
        .post('/lessons/lesson_shared/playback')
        .set('Cookie', student1Cookie);

      expect(res1.status).toBe(200);
      expect(res1.body.leaseId).toBe('lease_stud_1');

      // Student 2 request for same lesson
      mockPrisma.videoLease.upsert.mockResolvedValueOnce({
        id: 'lease_stud_2',
        studentId: student2.studentId,
        lessonId: 'lesson_shared',
        cacheId: readyCache.id,
        expiresAt: new Date(Date.now() + 180_000),
      });

      const res2 = await request(app)
        .post('/lessons/lesson_shared/playback')
        .set('Cookie', student2Cookie);

      expect(res2.status).toBe(200);
      expect(res2.body.leaseId).toBe('lease_stud_2');

      // Both leases link to same cacheId but have distinct studentIds
      expect(mockPrisma.videoLease.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId_lessonId: { studentId: student1.studentId, lessonId: 'lesson_shared' } },
          create: expect.objectContaining({ cacheId: readyCache.id, studentId: student1.studentId }),
        }),
      );
      expect(mockPrisma.videoLease.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId_lessonId: { studentId: student2.studentId, lessonId: 'lesson_shared' } },
          create: expect.objectContaining({ cacheId: readyCache.id, studentId: student2.studentId }),
        }),
      );
    });
  });

  describe('POST /lessons/:id/playback/heartbeat', () => {
    it('returns 404 when active lease is not found or has expired', async () => {
      mockPrisma.videoLease.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/lessons/lesson_1/playback/heartbeat')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
      expect(res.body.message).toContain('Active playback lease not found');
    });

    it('extends lease and returns fresh presigned URL when active lease exists', async () => {
      const activeLease = {
        id: 'lease_active_1',
        studentId: student1.studentId,
        lessonId: 'lesson_1',
        cacheId: 'cache_active_1',
        expiresAt: new Date(Date.now() + 60_000), // expires in 60s
        cache: {
          id: 'cache_active_1',
          r2Key: 'lesson-cache/active-r2-key',
          status: VideoCacheStatus.READY,
        },
      };
      mockPrisma.videoLease.findFirst.mockResolvedValue(activeLease);

      const extendedExpiresAt = new Date(Date.now() + 180_000);
      mockPrisma.videoLease.update.mockResolvedValue({
        ...activeLease,
        expiresAt: extendedExpiresAt,
      });
      mockPrisma.videoCache.update.mockResolvedValue(activeLease.cache);

      mockR2.presignGet.mockResolvedValue('https://r2.example.com/fresh-presigned-url.mp4');

      const res = await request(app)
        .post('/lessons/lesson_1/playback/heartbeat')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.url).toBe('https://r2.example.com/fresh-presigned-url.mp4');
      expect(res.body.expiresAt).toBe(extendedExpiresAt.toISOString());

      // Touched lastUrlIssuedAt
      expect(mockPrisma.videoCache.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: activeLease.cacheId },
          data: expect.objectContaining({
            lastUrlIssuedAt: expect.any(Date),
          }),
        }),
      );

      // Issued new presigned URL
      expect(mockR2.presignGet).toHaveBeenCalledWith(
        activeLease.cache.r2Key,
        env.VIDEO_URL_TTL_SEC,
      );
    });
  });

  describe('DELETE /lessons/:id/playback & POST /lessons/:id/playback/release', () => {
    it('deletes active lease via DELETE /lessons/:id/playback', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .delete('/lessons/lesson_1/playback')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ released: true });

      expect(mockPrisma.videoLease.deleteMany).toHaveBeenCalledWith({
        where: {
          studentId: student1.studentId,
          lessonId: 'lesson_1',
        },
      });
    });

    it('releases active lease via POST /lessons/:id/playback/release (sendBeacon support)', async () => {
      mockPrisma.videoLease.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/lessons/lesson_1/playback/release')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ released: true });

      expect(mockPrisma.videoLease.deleteMany).toHaveBeenCalledWith({
        where: {
          studentId: student1.studentId,
          lessonId: 'lesson_1',
        },
      });
    });
  });

  describe('POST /lessons/:id/progress (VIDEO auto-completion)', () => {
    it('auto-completes a VIDEO lesson when watched position reaches >= 90% of durationSec', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson_hosted_vid',
        courseId: 'course_1',
        title: 'Hosted Video Lesson',
        order: 1,
        type: LessonType.VIDEO,
        durationSec: 120,
        driveFileId: 'drive_file_video_90',
      });
      mockPrisma.lessonProgress.findUnique.mockResolvedValue({
        studentId: student1.studentId,
        lessonId: 'lesson_hosted_vid',
        courseId: 'course_1',
        secondsWatched: 60,
        maxPositionSec: 60,
        completed: false,
        completedAt: null,
      });
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        studentId: student1.studentId,
        courseId: 'course_1',
        status: 'ACTIVE',
        lastAccessedAt: new Date(),
      });
      mockPrisma.lesson.count.mockResolvedValue(4);
      mockPrisma.lessonProgress.count.mockResolvedValue(2);
      mockPrisma.lessonProgress.upsert.mockResolvedValue({
        studentId: student1.studentId,
        lessonId: 'lesson_hosted_vid',
        courseId: 'course_1',
        secondsWatched: 108,
        maxPositionSec: 108,
        completed: true,
        completedAt: new Date(),
      });

      // 108 / 120 = 0.9 (90%)
      const res = await request(app)
        .post('/lessons/lesson_hosted_vid/progress')
        .set('Cookie', student1Cookie)
        .send({
          secondsWatched: 108,
          maxPositionSec: 108,
        });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(mockPrisma.lessonProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            studentId_lessonId: {
              studentId: student1.studentId,
              lessonId: 'lesson_hosted_vid',
            },
          },
          update: expect.objectContaining({
            completed: true,
          }),
        }),
      );
    });

    it('does not auto-complete a VIDEO lesson when watched position is under 90%', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson_hosted_vid_under',
        courseId: 'course_1',
        title: 'Hosted Video Lesson',
        order: 1,
        type: LessonType.VIDEO,
        durationSec: 100,
        driveFileId: 'drive_file_video_under',
      });
      mockPrisma.lessonProgress.findUnique.mockResolvedValue(null);
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        studentId: student1.studentId,
        courseId: 'course_1',
        status: 'ACTIVE',
        lastAccessedAt: new Date(),
      });
      mockPrisma.lesson.count.mockResolvedValue(4);
      mockPrisma.lessonProgress.count.mockResolvedValue(0);
      mockPrisma.lessonProgress.upsert.mockResolvedValue({
        studentId: student1.studentId,
        lessonId: 'lesson_hosted_vid_under',
        courseId: 'course_1',
        secondsWatched: 80,
        maxPositionSec: 80,
        completed: false,
        completedAt: null,
      });

      // 80 / 100 = 80% (< 90%)
      const res = await request(app)
        .post('/lessons/lesson_hosted_vid_under/progress')
        .set('Cookie', student1Cookie)
        .send({
          secondsWatched: 80,
          maxPositionSec: 80,
        });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(false);
      expect(mockPrisma.lessonProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            completed: false,
          }),
        }),
      );
    });
  });
});
