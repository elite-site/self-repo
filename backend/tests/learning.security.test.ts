import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { CourseStatus, EnrolmentType, LessonType, QuizQuestionType, QuizShowAnswers } from '@prisma/client';

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
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    lessonProgress: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      groupBy: vi.fn(),
    },
    quiz: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    quizQuestion: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    quizOption: {
      findMany: vi.fn(),
    },
    quizAttempt: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
    },
    courseTarget: {
      createMany: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

vi.mock('../src/modules/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/modules/admin')>();
  return {
    ...actual,
    ActivityService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

const student1Payload = {
  studentId: 'student_sec_1',
  rollNo: '23K61A1201',
  name: 'Student One',
  email: 's1@sasi.ac.in',
};
const student1Cookie = `pc_student_session=${jwt.sign(student1Payload, env.STUDENT_JWT_SECRET)}`;

const student2Payload = {
  studentId: 'student_sec_2',
  rollNo: '23K61A1202',
  name: 'Student Two',
  email: 's2@sasi.ac.in',
};
const student2Cookie = `pc_student_session=${jwt.sign(student2Payload, env.STUDENT_JWT_SECRET)}`;

const adminPayload = {
  userId: 'admin_sec_1',
  email: 'admin@sasi.ac.in',
  username: 'admin_sec',
};
const adminCookie = `${env.ADMIN_SESSION_COOKIE_NAME}=${jwt.sign(adminPayload, env.JWT_SECRET)}`;

describe('LearningHub - Security & Access Control Tests', () => {
  beforeEach(() => {
    env.FEATURE_LEARNINGHUB = true;
    vi.clearAllMocks();
  });

  describe('1. Student Authentication & Boundary Isolation', () => {
    it('rejects unauthenticated requests to student endpoints with 401', async () => {
      const endpoints = [
        ['get', '/api/student/learning/home'],
        ['get', '/api/student/learning/courses'],
        ['get', '/api/student/learning/courses/react-101'],
        ['post', '/api/student/learning/courses/c1/enroll'],
        ['get', '/api/student/learning/my-learning'],
        ['get', '/api/student/learning/lessons/l1'],
        ['post', '/api/student/learning/lessons/l1/progress'],
        ['get', '/api/student/learning/quizzes/q1'],
        ['post', '/api/student/learning/quizzes/q1/start'],
        ['post', '/api/student/learning/quizzes/q1/submit'],
        ['get', '/api/student/learning/quizzes/q1/attempts'],
      ];

      for (const [method, url] of endpoints) {
        const res = await (request(app) as any)[method](url);
        expect(res.status).toBe(401);
      }
    });

    it('rejects submit attempt when attempt belongs to another student with 404', async () => {
      // Mock attempt belongs to student 1
      (prisma.quizAttempt.findUnique as any).mockResolvedValue({
        id: 'att_other_student',
        quizId: 'q1',
        studentId: student1Payload.studentId, // owned by student 1
        startedAt: new Date(),
        submittedAt: null,
        quiz: {
          id: 'q1',
          lessonId: 'l1',
          lesson: { id: 'l1', courseId: 'c1' },
          questions: [],
        },
      });

      // Student 2 tries to submit Student 1's attempt
      const res = await request(app)
        .post('/api/student/learning/quizzes/q1/submit')
        .set('Cookie', student2Cookie)
        .send({
          attemptId: 'att_other_student',
          answers: [],
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Quiz attempt not found');
    });

    it('returns only the requesting student attempts, never another students', async () => {
      (prisma.quiz.findUnique as any).mockResolvedValue({ id: 'q1', passPercent: 60 });
      (prisma.quizAttempt.findMany as any).mockResolvedValue([]);

      await request(app)
        .get('/api/student/learning/quizzes/q1/attempts')
        .set('Cookie', student2Cookie);

      // Verifies findMany specifically scoped by requesting studentId
      expect(prisma.quizAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            quizId: 'q1',
            studentId: student2Payload.studentId,
          },
        })
      );
    });
  });

  describe('2. Course Visibility & Enrollment Restrictions', () => {
    it('never exposes DRAFT or ARCHIVED courses in public student catalog', async () => {
      (prisma.course.findMany as any).mockResolvedValue([]);
      (prisma.course.count as any).mockResolvedValue(0);

      await request(app)
        .get('/api/student/learning/courses')
        .set('Cookie', student1Cookie);

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CourseStatus.PUBLISHED,
          }),
        })
      );
    });

    it('returns 404 when student attempts to access a DRAFT course directly', async () => {
      (prisma.course.findFirst as any).mockResolvedValue({
        id: 'c_draft',
        title: 'Secret Draft Course',
        status: CourseStatus.DRAFT,
      });

      const res = await request(app)
        .get('/api/student/learning/courses/c_draft')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(404);
    });

    it('forbids student self-enrollment into ASSIGNED_ONLY course with 403', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({
        id: 'c_invite_only',
        title: 'Invite Only Course',
        status: CourseStatus.PUBLISHED,
        enrolment: EnrolmentType.ASSIGNED_ONLY,
      });

      const res = await request(app)
        .post('/api/student/learning/courses/c_invite_only/enroll')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('invite-only');
    });

    it('forbids student enrollment into an unpublished course with 403', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({
        id: 'c_draft_enroll',
        title: 'Draft Course',
        status: CourseStatus.DRAFT,
        enrolment: EnrolmentType.OPEN,
      });

      const res = await request(app)
        .post('/api/student/learning/courses/c_draft_enroll/enroll')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Quiz Answer Key & Explanation Leak Prevention', () => {
    it('GET /quizzes/:quizId NEVER exposes isCorrect or explanations to student', async () => {
      (prisma.quiz.findUnique as any).mockResolvedValue({
        id: 'q_secret',
        courseId: 'c1',
        lessonId: 'l1',
        opensAt: null,
        dueAt: null,
        maxAttempts: 3,
        timeLimitMin: 20,
        passPercent: 70,
        showAnswers: QuizShowAnswers.AFTER_SUBMIT,
        course: { status: CourseStatus.PUBLISHED },
        questions: [
          {
            id: 'qq_leak',
            order: 1,
            type: QuizQuestionType.SINGLE,
            text: 'Secret Question',
            points: 5,
            explanation: 'TOP SECRET EXPLANATION THAT MUST NOT LEAK',
            options: [
              { id: 'opt_a', order: 1, text: 'Option A (Correct)', isCorrect: true },
              { id: 'opt_b', order: 2, text: 'Option B (Wrong)', isCorrect: false },
            ],
          },
        ],
      });
      (prisma.quizAttempt.count as any).mockResolvedValue(0);
      (prisma.quizAttempt.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/student/learning/quizzes/q_secret')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      const question = res.body.questions[0];
      expect(question).not.toHaveProperty('explanation');
      expect(question).not.toHaveProperty('isCorrect');
      expect(question.options[0]).not.toHaveProperty('isCorrect');
      expect(question.options[1]).not.toHaveProperty('isCorrect');
    });

    it('POST /quizzes/:quizId/start returns only attempt timer info and no questions or answers', async () => {
      (prisma.quiz.findUnique as any).mockResolvedValue({
        id: 'q_secret',
        courseId: 'c1',
        maxAttempts: 3,
        timeLimitMin: 25,
        course: { status: CourseStatus.PUBLISHED },
      });
      (prisma.quizAttempt.count as any).mockResolvedValue(0);
      (prisma.quizAttempt.create as any).mockResolvedValue({
        id: 'att_clean',
        startedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/student/learning/quizzes/q_secret/start')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('questions');
      expect(res.body).not.toHaveProperty('options');
      expect(res.body).not.toHaveProperty('answers');
    });

    it('POST /quizzes/:quizId/submit with showAnswers=NEVER suppresses answersReview', async () => {
      (prisma.quizAttempt.findUnique as any).mockResolvedValue({
        id: 'att_never_review',
        quizId: 'q_secret',
        studentId: student1Payload.studentId,
        startedAt: new Date(),
        submittedAt: null,
        quiz: {
          id: 'q_secret',
          courseId: 'c1',
          lessonId: 'l1',
          passPercent: 50,
          showAnswers: QuizShowAnswers.NEVER,
          lesson: { id: 'l1', courseId: 'c1' },
          questions: [
            {
              id: 'qq1',
              order: 1,
              type: QuizQuestionType.SINGLE,
              points: 10,
              explanation: 'Secret',
              options: [
                { id: 'opt1', order: 1, text: 'A', isCorrect: true },
                { id: 'opt2', order: 2, text: 'B', isCorrect: false },
              ],
            },
          ],
        },
      });
      (prisma.quizAttempt.update as any).mockResolvedValue({});
      (prisma.lessonProgress.upsert as any).mockResolvedValue({});
      (prisma.lesson.count as any).mockResolvedValue(1);
      (prisma.lessonProgress.count as any).mockResolvedValue(1);
      (prisma.enrollment.update as any).mockResolvedValue({});

      const res = await request(app)
        .post('/api/student/learning/quizzes/q_secret/submit')
        .set('Cookie', student1Cookie)
        .send({
          attemptId: 'att_never_review',
          answers: [{ questionId: 'qq1', selectedOptionIds: ['opt1'] }],
        });

      expect(res.status).toBe(200);
      expect(res.body.answersReview).toBeUndefined();
    });

    it('GET /home aggregator strictly strips lesson notes and quiz options', async () => {
      (prisma.course.findMany as any).mockResolvedValue([]);
      (prisma.enrollment.findMany as any).mockResolvedValue([]);
      (prisma.lessonProgress.findMany as any).mockResolvedValue([]);
      (prisma.course.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/student/learning/home')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(200);
      const stringified = JSON.stringify(res.body);
      expect(stringified).not.toContain('"notes"');
      expect(stringified).not.toContain('"isCorrect"');
    });
  });

  describe('4. Quiz Limits, Timers, Deadlines & Anti-Tamper Enforcement', () => {
    it('POST /quizzes/:quizId/start forbids starting when maxAttempts is reached with 403', async () => {
      (prisma.quiz.findUnique as any).mockResolvedValue({
        id: 'q_max',
        courseId: 'c1',
        maxAttempts: 2,
        timeLimitMin: 20,
        course: { status: CourseStatus.PUBLISHED },
      });
      // 2 submitted attempts already taken
      (prisma.quizAttempt.findMany as any).mockResolvedValue([
        { id: 'att_1', submittedAt: new Date() },
        { id: 'att_2', submittedAt: new Date() },
      ]);

      const res = await request(app)
        .post('/api/student/learning/quizzes/q_max/start')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Maximum quiz attempts exceeded');
    });

    it('POST /quizzes/:quizId/start forbids starting before opensAt timestamp with 403', async () => {
      const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hour in future
      (prisma.quiz.findUnique as any).mockResolvedValue({
        id: 'q_future',
        courseId: 'c1',
        opensAt: futureDate,
        maxAttempts: 3,
        course: { status: CourseStatus.PUBLISHED },
      });

      const res = await request(app)
        .post('/api/student/learning/quizzes/q_future/start')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Quiz has not opened yet');
    });

    it('POST /quizzes/:quizId/start forbids starting after dueAt deadline with 403', async () => {
      const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour in past
      (prisma.quiz.findUnique as any).mockResolvedValue({
        id: 'q_past',
        courseId: 'c1',
        dueAt: pastDate,
        maxAttempts: 3,
        course: { status: CourseStatus.PUBLISHED },
      });

      const res = await request(app)
        .post('/api/student/learning/quizzes/q_past/start')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Quiz deadline has passed');
    });

    it('POST /quizzes/:quizId/submit rejects submission if time limit was exceeded with 403', async () => {
      (prisma.quizAttempt.findUnique as any).mockResolvedValue({
        id: 'att_overtime',
        quizId: 'q_timed',
        studentId: student1Payload.studentId,
        startedAt: new Date(Date.now() - 35 * 60 * 1000), // started 35 mins ago
        submittedAt: null,
        quiz: {
          id: 'q_timed',
          timeLimitMin: 15, // limit was 15 mins (+ 30s grace)
          dueAt: null,
          questions: [],
          lesson: { id: 'l1', courseId: 'c1' },
        },
      });

      const res = await request(app)
        .post('/api/student/learning/quizzes/q_timed/submit')
        .set('Cookie', student1Cookie)
        .send({
          attemptId: 'att_overtime',
          answers: [],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Time limit exceeded');
    });

    it('POST /quizzes/:quizId/submit rejects double-submission of an already graded attempt with 409', async () => {
      (prisma.quizAttempt.findUnique as any).mockResolvedValue({
        id: 'att_already_done',
        quizId: 'q1',
        studentId: student1Payload.studentId,
        startedAt: new Date(Date.now() - 10 * 60 * 1000),
        submittedAt: new Date(), // ALREADY SUBMITTED
        quiz: {
          id: 'q1',
          timeLimitMin: 30,
          dueAt: null,
          questions: [],
          lesson: { id: 'l1', courseId: 'c1' },
        },
      });

      const res = await request(app)
        .post('/api/student/learning/quizzes/q1/submit')
        .set('Cookie', student1Cookie)
        .send({
          attemptId: 'att_already_done',
          answers: [],
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Attempt has already been submitted');
    });
  });

  describe('5. Admin RBAC Restrictions', () => {
    it('rejects unauthenticated requests to all admin endpoints with 401', async () => {
      const endpoints = [
        ['get', '/admin/api/learning/courses'],
        ['post', '/admin/api/learning/courses'],
        ['get', '/admin/api/learning/courses/c1'],
        ['put', '/admin/api/learning/courses/c1'],
        ['delete', '/admin/api/learning/courses/c1'],
        ['post', '/admin/api/learning/courses/c1/lessons'],
        ['post', '/admin/api/learning/courses/c1/assign'],
        ['get', '/admin/api/learning/courses/c1/enrollments'],
        ['post', '/admin/api/learning/courses/c1/quizzes'],
        ['get', '/admin/api/learning/reports/overview'],
        ['get', '/admin/api/learning/reports/courses/c1'],
        ['get', '/admin/api/learning/reports/courses/c1/export'],
        ['get', '/admin/api/learning/youtube/preview?url=https://youtube.com'],
      ];

      for (const [method, url] of endpoints) {
        const res = await (request(app) as any)[method](url);
        expect(res.status).toBe(401);
      }
    });

    it('rejects student tokens attempting to access admin endpoints with 401', async () => {
      const res = await request(app)
        .get('/admin/api/learning/courses')
        .set('Cookie', student1Cookie);

      expect(res.status).toBe(401);
    });

    it('allows verified admin requests to access admin endpoints', async () => {
      (prisma.course.findMany as any).mockResolvedValue([]);
      (prisma.course.count as any).mockResolvedValue(0);

      const res = await request(app)
        .get('/admin/api/learning/courses')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
    });
  });
});
