import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { studentCoursesRouter, adminCoursesRouter } from '../src/modules/learning-courses/courses.routes';
import { coursesService } from '../src/modules/learning-courses/courses.service';
import { ActivityService } from '../src/modules/admin';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lesson: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
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
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

vi.mock('../src/modules/admin', () => ({
  ActivityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use('/courses', studentCoursesRouter);
app.use('/admin', adminCoursesRouter);

const studentPayload = {
  studentId: 'stud_test_1',
  rollNo: '23K61A1201',
  name: 'Student One',
  email: 'stud1@sasi.ac.in',
};
const studentCookie = `pc_student_session=${jwt.sign(studentPayload, env.STUDENT_JWT_SECRET)}`;

const adminPayload = {
  userId: 'admin_1',
  email: 'admin@sasi.ac.in',
  username: 'admin',
};
const adminCookie = `${env.ADMIN_SESSION_COOKIE_NAME}=${jwt.sign(adminPayload, env.JWT_SECRET)}`;

describe('LearningHub - Courses Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Student Courses Endpoints', () => {
    it('GET /courses - returns paginated published courses for authenticated student', async () => {
      vi.mocked(prisma.course.findMany).mockResolvedValue([
        {
          id: 'course_1',
          title: 'React Fundamentals',
          slug: 'react-fundamentals',
          description: 'Learn React',
          thumbnailUrl: 'https://img.com/thumb.png',
          category: 'Web Dev',
          level: 'BEGINNER',
          estimatedHours: 4.5,
          status: 'PUBLISHED',
          enrolment: 'OPEN',
          featured: true,
          dueAt: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-02'),
          lessons: [{ id: 'l1', durationSec: 300 }],
          _count: { lessons: 1, enrollments: 10 },
        } as any,
      ]);
      vi.mocked(prisma.course.count).mockResolvedValue(1);
      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get('/courses')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.courses).toHaveLength(1);
      expect(res.body.courses[0].slug).toBe('react-fundamentals');
      expect(res.body.pagination.total).toBe(1);
    });

    it('GET /courses - rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/courses');
      expect(res.status).toBe(401);
    });

    it('GET /courses/:slugOrId - returns course detail with lessons and student progress', async () => {
      vi.mocked(prisma.course.findFirst).mockResolvedValue({
        id: 'c_abc',
        title: 'Node Mastery',
        slug: 'node-mastery',
        description: 'Deep dive into Node',
        thumbnailUrl: null,
        category: 'Backend',
        level: 'INTERMEDIATE',
        estimatedHours: 6,
        status: 'PUBLISHED',
        enrolment: 'OPEN',
        featured: false,
        dueAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        lessons: [
          { id: 'l1', courseId: 'c_abc', title: 'Intro', order: 0, type: 'YOUTUBE', durationSec: 600 },
          { id: 'l2', courseId: 'c_abc', title: 'Streams', order: 1, type: 'NOTES', durationSec: null },
        ],
        _count: { lessons: 2, enrollments: 5 },
      } as any);

      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        id: 'enr_1',
        studentId: 'stud_test_1',
        courseId: 'c_abc',
        source: 'SELF',
        status: 'ACTIVE',
        enrolledAt: new Date(),
        completedAt: null,
        lastAccessedAt: new Date(),
      } as any);

      vi.mocked(prisma.lessonProgress.findMany).mockResolvedValue([
        { id: 'p1', studentId: 'stud_test_1', lessonId: 'l1', courseId: 'c_abc', completed: true, secondsWatched: 600, maxPositionSec: 600, completedAt: new Date(), updatedAt: new Date() },
      ]);

      const res = await request(app)
        .get('/courses/node-mastery')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.course.title).toBe('Node Mastery');
      expect(res.body.course.lessons).toHaveLength(2);
      expect(res.body.course.lessons[0].completed).toBe(true);
      expect(res.body.enrollment.enrolled).toBe(true);
      expect(res.body.enrollment.progressPercent).toBe(50);
    });

    it('GET /courses/:slugOrId - returns 404 for non-existent or DRAFT course', async () => {
      vi.mocked(prisma.course.findFirst).mockResolvedValue(null);

      const res = await request(app)
        .get('/courses/non-existent')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(404);
    });

    it('POST /courses/:id/enroll - enrolls student into OPEN published course', async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: 'c_open',
        title: 'Open Course',
        status: 'PUBLISHED',
        enrolment: 'OPEN',
      } as any);

      vi.mocked(prisma.enrollment.upsert).mockResolvedValue({
        id: 'enr_new',
        studentId: 'stud_test_1',
        courseId: 'c_open',
        source: 'SELF',
        status: 'ACTIVE',
        enrolledAt: new Date('2026-03-01T10:00:00Z'),
        completedAt: null,
        lastAccessedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/courses/c_open/enroll')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.courseId).toBe('c_open');
    });

    it('POST /courses/:id/enroll - forbids enrollment in ASSIGNED_ONLY course', async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: 'c_assigned',
        title: 'Assigned Only Course',
        status: 'PUBLISHED',
        enrolment: 'ASSIGNED_ONLY',
      } as any);

      const res = await request(app)
        .post('/courses/c_assigned/enroll')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(403);
    });
  });

  describe('Admin Courses Endpoints', () => {
    it('POST /admin/courses - creates course and logs admin activity audit', async () => {
      vi.mocked(prisma.course.create).mockResolvedValue({
        id: 'c_created',
        title: 'Docker Masterclass',
        slug: 'docker-masterclass',
        description: 'Complete Docker guide',
        status: 'DRAFT',
        enrolment: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/admin/courses')
        .set('Cookie', adminCookie)
        .send({
          title: 'Docker Masterclass',
          description: 'Complete Docker guide',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('c_created');
      expect(ActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ADMIN',
          action: 'COURSE_CREATE',
        })
      );
    });

    it('PUT /admin/courses/:id - updates course fields and logs activity', async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: 'c_created',
        title: 'Docker Masterclass',
      } as any);

      vi.mocked(prisma.course.update).mockResolvedValue({
        id: 'c_created',
        title: 'Docker Masterclass 2026',
        description: 'Updated description',
      } as any);

      const res = await request(app)
        .put('/admin/courses/c_created')
        .set('Cookie', adminCookie)
        .send({
          title: 'Docker Masterclass 2026',
        });

      expect(res.status).toBe(200);
      expect(ActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ADMIN',
          action: 'COURSE_UPDATE',
        })
      );
    });

    it('DELETE /admin/courses/:id - deletes course and logs activity', async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: 'c_created',
        title: 'Docker Masterclass',
      } as any);

      vi.mocked(prisma.course.delete).mockResolvedValue({ id: 'c_created' } as any);

      const res = await request(app)
        .delete('/admin/courses/c_created')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(ActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ADMIN',
          action: 'COURSE_DELETE',
        })
      );
    });

    it('POST /admin/courses/:id/lessons - adds lesson to course', async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'c_1' } as any);
      vi.mocked(prisma.lesson.findFirst).mockResolvedValue({ order: 2 } as any);
      vi.mocked(prisma.lesson.create).mockResolvedValue({
        id: 'l_new',
        courseId: 'c_1',
        title: 'Lesson 4',
        type: 'YOUTUBE',
        order: 3,
        durationSec: 300,
      } as any);

      const res = await request(app)
        .post('/admin/courses/c_1/lessons')
        .set('Cookie', adminCookie)
        .send({
          title: 'Lesson 4',
          type: 'YOUTUBE',
          durationSec: 300,
        });

      expect(res.status).toBe(201);
      expect(res.body.order).toBe(3);
    });

    it('PUT /admin/courses/:id/lessons/reorder - reorders lessons array', async () => {
      vi.mocked(prisma.lesson.update).mockResolvedValue({} as any);

      const res = await request(app)
        .put('/admin/courses/c_1/lessons/reorder')
        .set('Cookie', adminCookie)
        .send({
          lessonIds: ['l3', 'l1', 'l2'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /admin/courses/:id/assign - assigns course to batch and bulk-enrolls', async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'c_1' } as any);
      vi.mocked(prisma.student.findMany).mockResolvedValue([
        { id: 'stud_1' },
        { id: 'stud_2' },
      ] as any);
      vi.mocked(prisma.courseTarget.createMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.enrollment.upsert).mockResolvedValue({} as any);

      const res = await request(app)
        .post('/admin/courses/c_1/assign')
        .set('Cookie', adminCookie)
        .send({
          targetType: 'BATCH',
          year: 3,
          section: 'A',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(ActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ADMIN',
          action: 'COURSE_ASSIGN',
        })
      );
    });

    it('GET /admin/youtube/preview - parses YouTube URL and returns video metadata', async () => {
      const res = await request(app)
        .get('/admin/youtube/preview')
        .set('Cookie', adminCookie)
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(res.status).toBe(200);
      expect(res.body.videoId).toBe('dQw4w9WgXcQ');
      expect(res.body.embeddable).toBe(true);
      expect(res.body.thumbnailUrl).toContain('dQw4w9WgXcQ');
    });

    it('GET /admin/youtube/preview - rejects invalid non-YouTube URLs', async () => {
      const res = await request(app)
        .get('/admin/youtube/preview')
        .set('Cookie', adminCookie)
        .query({ url: 'https://not-youtube.com/video' });

      expect(res.status).toBe(400);
    });
  });
});
