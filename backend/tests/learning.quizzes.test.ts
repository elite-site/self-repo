import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { studentQuizzesRouter, adminQuizzesRouter } from '../src/modules/learning-quizzes/quizzes.routes';
import { errorHandler } from '../src/middleware/errorHandler';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    quiz: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    quizQuestion: {
      deleteMany: vi.fn(),
    },
    quizAttempt: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    lessonProgress: {
      upsert: vi.fn(),
      count: vi.fn(),
    },
    lesson: {
      count: vi.fn(),
    },
    enrollment: {
      update: vi.fn(),
    },
  },
}));

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use('/quizzes', studentQuizzesRouter);
app.use('/admin', adminQuizzesRouter);
app.use(errorHandler);

const studentPayload = {
  studentId: 'stud_quiz_1',
  rollNo: '23K61A1203',
  name: 'Student Three',
};
const studentCookie = `pc_student_session=${jwt.sign(studentPayload, env.STUDENT_JWT_SECRET)}`;

const adminPayload = {
  userId: 'admin_1',
  email: 'admin@sasi.ac.in',
  username: 'admin',
};
const adminCookie = `${env.ADMIN_SESSION_COOKIE_NAME}=${jwt.sign(adminPayload, env.JWT_SECRET)}`;

describe('LearningHub - Quizzes Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Student Quiz Endpoints', () => {
    it('GET /quizzes/:quizId - NEVER returns isCorrect or explanations to student', async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz_1',
        courseId: 'c_1',
        lessonId: 'l_1',
        opensAt: null,
        dueAt: null,
        maxAttempts: 2,
        timeLimitMin: 15,
        passPercent: 70,
        showAnswers: 'AFTER_SUBMIT',
        questions: [
          {
            id: 'q_1',
            order: 0,
            type: 'SINGLE',
            text: 'What is JSX?',
            explanation: 'JSX is syntax extension for JavaScript',
            points: 2,
            options: [
              { id: 'opt_1', order: 0, text: 'A syntax extension', isCorrect: true },
              { id: 'opt_2', order: 1, text: 'A database', isCorrect: false },
            ],
          },
        ],
        lesson: { id: 'l_1', courseId: 'c_1' },
      } as any);

      vi.mocked(prisma.quizAttempt.findMany).mockResolvedValue([]);

      const res = await request(app)
        .get('/quizzes/quiz_1')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(1);
      const question = res.body.questions[0];
      expect(question.text).toBe('What is JSX?');
      // CRITICAL SECURITY GUARD: Never expose isCorrect or explanation
      expect(question).not.toHaveProperty('explanation');
      expect(question.options[0]).not.toHaveProperty('isCorrect');
      expect(question.options[1]).not.toHaveProperty('isCorrect');
    });

    it('POST /quizzes/:quizId/start - checks deadline, open time, and enforces maxAttempts', async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz_1',
        opensAt: null,
        dueAt: null,
        maxAttempts: 1,
        timeLimitMin: 10,
      } as any);

      // Student has already used 1 attempt
      vi.mocked(prisma.quizAttempt.findMany).mockResolvedValue([
        { id: 'att_old', submittedAt: new Date() },
      ] as any);

      const res = await request(app)
        .post('/quizzes/quiz_1/start')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Maximum quiz attempts exceeded');
    });

    it('POST /quizzes/:quizId/start - creates new attempt with server time when eligible', async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz_1',
        opensAt: null,
        dueAt: null,
        maxAttempts: 2,
        timeLimitMin: 20,
      } as any);

      vi.mocked(prisma.quizAttempt.findMany).mockResolvedValue([]);
      vi.mocked(prisma.quizAttempt.create).mockResolvedValue({
        id: 'att_new',
        quizId: 'quiz_1',
        studentId: 'stud_quiz_1',
        startedAt: new Date('2026-04-01T10:00:00Z'),
        answers: [],
      } as any);

      const res = await request(app)
        .post('/quizzes/quiz_1/start')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(201);
      expect(res.body.attemptId).toBe('att_new');
      expect(res.body.timeLimitMin).toBe(20);
      expect(res.body).toHaveProperty('serverTime');
    });

    it('POST /quizzes/:quizId/submit - grades answers, marks lesson complete, and returns review according to showAnswers', async () => {
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'att_valid',
        quizId: 'quiz_1',
        studentId: 'stud_quiz_1',
        startedAt: new Date(Date.now() - 5 * 60 * 1000), // started 5 mins ago
        submittedAt: null,
        quiz: {
          id: 'quiz_1',
          dueAt: null,
          timeLimitMin: 15,
          passPercent: 50,
          showAnswers: 'AFTER_SUBMIT',
          lessonId: 'l_quiz',
          lesson: { id: 'l_quiz', courseId: 'c_1' },
          questions: [
            {
              id: 'q_1',
              type: 'SINGLE',
              points: 5,
              explanation: 'Because TypeScript is typed',
              options: [
                { id: 'opt_1', isCorrect: true },
                { id: 'opt_2', isCorrect: false },
              ],
            },
            {
              id: 'q_2',
              type: 'SINGLE',
              points: 5,
              explanation: 'React uses VDOM',
              options: [
                { id: 'opt_3', isCorrect: true },
                { id: 'opt_4', isCorrect: false },
              ],
            },
          ],
        },
      } as any);

      vi.mocked(prisma.quizAttempt.update).mockResolvedValue({} as any);
      vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.lesson.count).mockResolvedValue(2);
      vi.mocked(prisma.lessonProgress.count).mockResolvedValue(1);

      const res = await request(app)
        .post('/quizzes/quiz_1/submit')
        .set('Cookie', studentCookie)
        .send({
          attemptId: 'att_valid',
          answers: [
            { questionId: 'q_1', selectedOptionIds: ['opt_1'] }, // Correct!
            { questionId: 'q_2', selectedOptionIds: ['opt_4'] }, // Incorrect!
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(5);
      expect(res.body.maxScore).toBe(10);
      expect(res.body.scorePercent).toBe(50);
      expect(res.body.passed).toBe(true);
      expect(res.body.answersReview).toBeDefined();
      expect(res.body.answersReview[0].isCorrect).toBe(true);
      expect(res.body.answersReview[1].isCorrect).toBe(false);

      // Verifies lesson complete was marked
      expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId_lessonId: { studentId: 'stud_quiz_1', lessonId: 'l_quiz' } },
          create: expect.objectContaining({ completed: true }),
        })
      );
    });

    it('POST /quizzes/:quizId/submit - rejects late submission when timeLimit is exceeded', async () => {
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'att_late',
        quizId: 'quiz_1',
        studentId: 'stud_quiz_1',
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // started 30 mins ago
        submittedAt: null,
        quiz: {
          id: 'quiz_1',
          timeLimitMin: 10, // 10 min time limit
          dueAt: null,
          questions: [],
          lesson: { id: 'l_1', courseId: 'c_1' },
        },
      } as any);

      const res = await request(app)
        .post('/quizzes/quiz_1/submit')
        .set('Cookie', studentCookie)
        .send({
          attemptId: 'att_late',
          answers: [],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Time limit exceeded');
    });

    it('POST /quizzes/:quizId/submit - withholds answer reviews if showAnswers = NEVER', async () => {
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'att_never',
        quizId: 'quiz_1',
        studentId: 'stud_quiz_1',
        startedAt: new Date(),
        submittedAt: null,
        quiz: {
          id: 'quiz_1',
          timeLimitMin: 60,
          dueAt: null,
          showAnswers: 'NEVER',
          passPercent: 50,
          lessonId: 'l_quiz',
          lesson: { id: 'l_quiz', courseId: 'c_1' },
          questions: [
            { id: 'q_1', type: 'SINGLE', points: 1, options: [{ id: 'o1', isCorrect: true }] },
          ],
        },
      } as any);

      vi.mocked(prisma.quizAttempt.update).mockResolvedValue({} as any);
      vi.mocked(prisma.lessonProgress.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.lesson.count).mockResolvedValue(1);
      vi.mocked(prisma.lessonProgress.count).mockResolvedValue(1);
      vi.mocked(prisma.enrollment.update).mockResolvedValue({} as any);

      const res = await request(app)
        .post('/quizzes/quiz_1/submit')
        .set('Cookie', studentCookie)
        .send({
          attemptId: 'att_never',
          answers: [{ questionId: 'q_1', selectedOptionIds: ['o1'] }],
        });

      expect(res.status).toBe(200);
      expect(res.body.answersReview).toBeUndefined();
    });

    it('GET /quizzes/:quizId/attempts - lists previous attempts for student', async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz_1',
        passPercent: 50,
      } as any);

      vi.mocked(prisma.quizAttempt.findMany).mockResolvedValue([
        {
          id: 'att_1',
          startedAt: new Date('2026-04-01T10:00:00Z'),
          submittedAt: new Date('2026-04-01T10:10:00Z'),
          score: 8,
          maxScore: 10,
        },
      ] as any);

      const res = await request(app)
        .get('/quizzes/quiz_1/attempts')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.attempts).toHaveLength(1);
      expect(res.body.attempts[0].passed).toBe(true);
    });
  });

  describe('Admin Quiz Endpoints', () => {
    it('POST /admin/courses/:id/quizzes - creates quiz with questions and correct answer keys', async () => {
      vi.mocked(prisma.quiz.create).mockResolvedValue({
        id: 'quiz_created',
        courseId: 'c_1',
        lessonId: 'l_quiz',
        passPercent: 60,
      } as any);

      const res = await request(app)
        .post('/admin/courses/c_1/quizzes')
        .set('Cookie', adminCookie)
        .send({
          lessonId: 'l_quiz',
          passPercent: 60,
          showAnswers: 'AFTER_SUBMIT',
          questions: [
            {
              order: 0,
              type: 'SINGLE',
              text: 'Is Node.js single threaded?',
              points: 2,
              options: [
                { order: 0, text: 'Yes', isCorrect: true },
                { order: 1, text: 'No', isCorrect: false },
              ],
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('quiz_created');
      expect(prisma.quiz.create).toHaveBeenCalled();
    });

    it('GET /admin/courses/:id/quizzes/:quizId - returns full quiz including correct answers for admin', async () => {
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz_1',
        questions: [
          {
            id: 'q_1',
            options: [
              { id: 'opt_1', isCorrect: true },
            ],
          },
        ],
      } as any);

      const res = await request(app)
        .get('/admin/courses/c_1/quizzes/quiz_1')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('quiz_1');
      expect(res.body.questions[0].options[0].isCorrect).toBe(true);
    });
  });
});
