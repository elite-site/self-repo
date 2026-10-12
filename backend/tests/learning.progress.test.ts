import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { studentProgressRouter } from '../src/modules/learning-progress/progress.routes';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    lesson: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    lessonProgress: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(studentProgressRouter);

const studentPayload = {
  studentId: 'stud_prog_1',
  rollNo: '23K61A1202',
  name: 'Student Two',
};
const studentCookie = `pc_student_session=${jwt.sign(studentPayload, env.STUDENT_JWT_SECRET)}`;

describe('LearningHub - Progress Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /lessons/:id', () => {
    it('requires student authentication (401 without cookie)', async () => {
      const res = await request(app).get('/lessons/l_1');
      expect(res.status).toBe(401);
    });

    it('returns lesson playback details and previous/next lesson IDs', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
        id: 'l_2',
        courseId: 'c_1',
        title: 'Video 2',
        order: 1,
        type: 'YOUTUBE',
        durationSec: 1000,
        youtubeVideoId: 'video123',
        url: null,
        notes: null,
        course: { id: 'c_1', title: 'React 101', slug: 'react-101', status: 'PUBLISHED', enrolment: 'OPEN' },
        quiz: null,
      } as any);

      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({
        id: 'enr_1',
        studentId: 'stud_prog_1',
        courseId: 'c_1',
      } as any);

      vi.mocked(prisma.lesson.findMany).mockResolvedValue([
        { id: 'l_1', order: 0, type: 'YOUTUBE', durationSec: 500 },
        { id: 'l_2', order: 1, type: 'YOUTUBE', durationSec: 1000 },
        { id: 'l_3', order: 2, type: 'NOTES', durationSec: null },
      ] as any);

      vi.mocked(prisma.lessonProgress.findUnique).mockResolvedValue({
        id: 'p_1',
        studentId: 'stud_prog_1',
        lessonId: 'l_2',
        courseId: 'c_1',
        secondsWatched: 300,
        maxPositionSec: 350,
        completed: false,
      } as any);

      vi.mocked(prisma.enrollment.update).mockResolvedValue({} as any);

      const res = await request(app)
        .get('/lessons/l_2')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('l_2');
      expect(res.body.prevLessonId).toBe('l_1');
      expect(res.body.nextLessonId).toBe('l_3');
      expect(res.body.progress.secondsWatched).toBe(300);
    });

    it('automatically marks NOTES and LINK lessons as completed when opened', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
        id: 'l_notes',
        courseId: 'c_1',
        title: 'Important Notes',
        order: 0,
        type: 'NOTES',
        durationSec: null,
        youtubeVideoId: null,
        url: null,
        notes: 'Read this carefully',
        course: { id: 'c_1', title: 'Course 1', slug: 'c-1', status: 'PUBLISHED', enrolment: 'OPEN' },
        quiz: null,
      } as any);

      vi.mocked(prisma.enrollment.findUnique).mockResolvedValue({ id: 'e1' } as any);
      vi.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: 'l_notes', order: 0 }] as any);
      vi.mocked(prisma.lessonProgress.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({
        id: 'p_notes',
        studentId: 'stud_prog_1',
        lessonId: 'l_notes',
        courseId: 'c_1',
        completed: true,
        secondsWatched: 0,
        maxPositionSec: 0,
      } as any);

      vi.mocked(prisma.lesson.count).mockResolvedValue(1);
      vi.mocked(prisma.lessonProgress.count).mockResolvedValue(1);
      vi.mocked(prisma.enrollment.update).mockResolvedValue({} as any);

      const res = await request(app)
        .get('/lessons/l_notes')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ completed: true }),
        })
      );
    });
  });

  describe('POST /lessons/:id/progress', () => {
    it('marks video complete when secondsWatched / durationSec >= 0.9', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
        id: 'l_vid',
        courseId: 'c_1',
        type: 'YOUTUBE',
        durationSec: 100,
        course: { id: 'c_1', status: 'PUBLISHED' },
      } as any);

      vi.mocked(prisma.lessonProgress.findUnique).mockResolvedValue({
        secondsWatched: 50,
        maxPositionSec: 60,
        completed: false,
      } as any);

      vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.lesson.count).mockResolvedValue(2);
      vi.mocked(prisma.lessonProgress.count).mockResolvedValue(1);
      vi.mocked(prisma.enrollment.update).mockResolvedValue({} as any);

      // 90 seconds out of 100 seconds is 90%
      const res = await request(app)
        .post('/lessons/l_vid/progress')
        .set('Cookie', studentCookie)
        .send({
          secondsWatched: 91,
          maxPositionSec: 91,
        });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ completed: true }),
        })
      );
    });

    it('strictly moves progress forward and is idempotent (ignores lesser values)', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
        id: 'l_vid',
        courseId: 'c_1',
        type: 'YOUTUBE',
        durationSec: 100,
        course: { id: 'c_1', status: 'PUBLISHED' },
      } as any);

      vi.mocked(prisma.lessonProgress.findUnique).mockResolvedValue({
        secondsWatched: 80,
        maxPositionSec: 85,
        completed: false,
      } as any);

      vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.lesson.count).mockResolvedValue(2);
      vi.mocked(prisma.lessonProgress.count).mockResolvedValue(0);
      vi.mocked(prisma.enrollment.update).mockResolvedValue({} as any);

      // Attempt to send 20 seconds (less than existing 80)
      const res = await request(app)
        .post('/lessons/l_vid/progress')
        .set('Cookie', studentCookie)
        .send({
          secondsWatched: 20,
          maxPositionSec: 30,
        });

      expect(res.status).toBe(200);
      expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            secondsWatched: 80,
            maxPositionSec: 85,
          }),
        })
      );
    });

    it('marks course complete (Enrollment.status = COMPLETED) when all lessons are completed', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValue({
        id: 'l_last',
        courseId: 'c_full',
        type: 'YOUTUBE',
        durationSec: 50,
        course: { id: 'c_full', status: 'PUBLISHED' },
      } as any);

      vi.mocked(prisma.lessonProgress.findUnique).mockResolvedValue({
        secondsWatched: 45,
        maxPositionSec: 45,
        completed: true,
      } as any);

      vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.lesson.count).mockResolvedValue(5);
      vi.mocked(prisma.lessonProgress.count).mockResolvedValue(5); // all 5 complete!
      vi.mocked(prisma.enrollment.update).mockResolvedValue({} as any);

      const res = await request(app)
        .post('/lessons/l_last/progress')
        .set('Cookie', studentCookie)
        .send({
          secondsWatched: 50,
          maxPositionSec: 50,
        });

      expect(res.status).toBe(200);
      expect(res.body.courseProgressPercent).toBe(100);
      expect(prisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });
  });

  describe('GET /my-learning', () => {
    it('returns separated in-progress courses, completed courses, and upcoming deadlines', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      vi.mocked(prisma.enrollment.findMany).mockResolvedValue([
        {
          id: 'enr_active',
          status: 'ACTIVE',
          course: {
            id: 'c_active',
            title: 'Active Course',
            slug: 'active-course',
            description: 'In progress',
            status: 'PUBLISHED',
            enrolment: 'OPEN',
            featured: false,
            dueAt: futureDate,
            lessons: [{ id: 'l1', durationSec: 100 }, { id: 'l2', durationSec: 200 }],
            quizzes: [{ id: 'q1', lessonId: 'l1', dueAt: futureDate }],
            _count: { lessons: 2 },
          },
        } as any,
        {
          id: 'enr_done',
          status: 'COMPLETED',
          course: {
            id: 'c_done',
            title: 'Finished Course',
            slug: 'finished-course',
            description: 'All done',
            status: 'PUBLISHED',
            enrolment: 'OPEN',
            featured: false,
            dueAt: null,
            lessons: [{ id: 'l3', durationSec: 150 }],
            quizzes: [],
            _count: { lessons: 1 },
          },
        } as any,
      ]);

      vi.mocked(prisma.lessonProgress.findMany).mockImplementation(async (args: any) => {
        if (args.where.courseId === 'c_active') {
          return [{ lessonId: 'l1', completed: true, secondsWatched: 100 }] as any;
        }
        return [{ lessonId: 'l3', completed: true, secondsWatched: 150 }] as any;
      });

      const res = await request(app)
        .get('/my-learning')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.inProgress).toHaveLength(1);
      expect(res.body.inProgress[0].progressPercent).toBe(50);
      expect(res.body.completed).toHaveLength(1);
      expect(res.body.completed[0].progressPercent).toBe(100);
      expect(res.body.deadlines.length).toBeGreaterThanOrEqual(1);
    });
  });
});
