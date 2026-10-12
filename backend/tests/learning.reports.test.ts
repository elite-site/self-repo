import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { adminReportsRouter } from '../src/modules/learning-reports/reports.routes';
import { errorHandler } from '../src/middleware/errorHandler';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    course: {
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    enrollment: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    quizAttempt: {
      aggregate: vi.fn(),
    },
    lessonProgress: {
      groupBy: vi.fn(),
    },
  },
}));

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use('/admin', adminReportsRouter);
app.use(errorHandler);

const adminPayload = {
  userId: 'admin_rep_1',
  email: 'admin@sasi.ac.in',
  username: 'admin',
};
const adminCookie = `${env.ADMIN_SESSION_COOKIE_NAME}=${jwt.sign(adminPayload, env.JWT_SECRET)}`;

describe('LearningHub - Reports Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /admin/reports/overview', () => {
    it('requires admin authentication (401 without cookie)', async () => {
      const res = await request(app).get('/admin/reports/overview');
      expect(res.status).toBe(401);
    });

    it('returns high-level learning platform aggregates using DB counts and groupBys', async () => {
      vi.mocked(prisma.course.count)
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(15); // published

      vi.mocked(prisma.enrollment.count)
        .mockResolvedValueOnce(500) // total enrollments
        .mockResolvedValueOnce(250); // completed enrollments

      vi.mocked(prisma.enrollment.groupBy).mockResolvedValue([
        { studentId: 's1' },
        { studentId: 's2' },
        { studentId: 's3' },
      ] as any);

      const res = await request(app)
        .get('/admin/reports/overview')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.totalCourses).toBe(20);
      expect(res.body.publishedCourses).toBe(15);
      expect(res.body.totalEnrolments).toBe(500);
      expect(res.body.completedEnrolments).toBe(250);
      expect(res.body.overallCompletionRate).toBe(50); // 250 / 500 = 50%
      expect(res.body.activeLearnersLast7Days).toBe(3);
    });
  });

  describe('GET /admin/reports/courses/:id', () => {
    it('returns detailed course analytics with aggregates and drop-offs', async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: 'c_rep',
        title: 'Fullstack Bootcamp',
        slug: 'fullstack-bootcamp',
      } as any);

      vi.mocked(prisma.enrollment.count)
        .mockResolvedValueOnce(100) // total enrolled
        .mockResolvedValueOnce(60); // completed

      vi.mocked(prisma.quizAttempt.aggregate).mockResolvedValue({
        _avg: { score: 8.5 },
        _count: { id: 45 },
      } as any);

      vi.mocked(prisma.lessonProgress.groupBy).mockResolvedValue([
        { lessonId: 'l1', _count: { studentId: 90 } },
        { lessonId: 'l2', _count: { studentId: 75 } },
        { lessonId: 'l3', _count: { studentId: 60 } },
      ] as any);

      vi.mocked(prisma.enrollment.findMany).mockResolvedValue([
        {
          student: { id: 's1', name: 'Alice', rollNo: '23K61A1201' },
          enrolledAt: new Date('2026-02-01'),
          status: 'COMPLETED',
          completedAt: new Date('2026-02-15'),
        },
      ] as any);

      const res = await request(app)
        .get('/admin/reports/courses/c_rep')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.courseTitle).toBe('Fullstack Bootcamp');
      expect(res.body.totalEnrolled).toBe(100);
      expect(res.body.completedCount).toBe(60);
      expect(res.body.completionRate).toBe(60);
      expect(res.body.quizAverageScore).toBe(8.5);
      expect(res.body.quizTotalAttempts).toBe(45);
      expect(res.body.lessonCompletions).toHaveLength(3);
      expect(res.body.recentLearners).toHaveLength(1);
    });

    it('returns 404 if course does not exist', async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get('/admin/reports/courses/c_missing')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /admin/reports/courses/:id/export', () => {
    it('streams CSV export in batches of 500 records', async () => {
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: 'c_csv',
        title: 'Python for Beginners',
      } as any);

      // Simulate a small first batch (< 500) so stream terminates cleanly
      vi.mocked(prisma.enrollment.findMany).mockResolvedValueOnce([
        {
          student: { rollNo: '23K61A1201', name: 'John Doe', email: 'john@sasi.ac.in' },
          enrolledAt: new Date('2026-03-01T09:00:00Z'),
          status: 'COMPLETED',
          completedAt: new Date('2026-03-05T12:00:00Z'),
        },
        {
          student: { rollNo: '23K61A1202', name: 'Jane Smith, Jr.', email: 'jane@sasi.ac.in' },
          enrolledAt: new Date('2026-03-02T10:00:00Z'),
          status: 'ACTIVE',
          completedAt: null,
        },
      ] as any);

      const res = await request(app)
        .get('/admin/reports/courses/c_csv/export')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename="course-c_csv-report.csv"');

      const csvLines = res.text.trim().split('\n');
      expect(csvLines[0]).toBe('Roll Number,Name,Email,Enrolled At,Status,Completed At');
      expect(csvLines[1]).toContain('23K61A1201,John Doe,john@sasi.ac.in');
      // Commas in name are escaped with double quotes
      expect(csvLines[2]).toContain('"Jane Smith, Jr."');
      expect(csvLines[2]).toContain('ACTIVE');
    });
  });
});
