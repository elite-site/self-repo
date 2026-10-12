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

const studentPayload = {
  studentId: 'student_contract_1',
  rollNo: '23K61A1201',
  name: 'Student Contract',
  email: 'contract@sasi.ac.in',
};
const studentToken = jwt.sign(studentPayload, env.STUDENT_JWT_SECRET);
const studentCookie = `pc_student_session=${studentToken}`;

const adminPayload = {
  userId: 'admin_contract_1',
  email: 'admin@sasi.ac.in',
  username: 'admin_contract',
};
const adminToken = jwt.sign(adminPayload, env.JWT_SECRET);
const adminCookie = `${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`;

describe('LearningHub - Contract Verification Tests (API_CONTRACT.md)', () => {
  beforeEach(() => {
    env.FEATURE_LEARNINGHUB = true;
    vi.clearAllMocks();
  });

  describe('Student Contracts (/api/student/learning/*)', () => {
    it('2.1 GET /api/student/learning/home returns HomeFeedResponse structure', async () => {
      (prisma.course.findMany as any).mockResolvedValue([]);
      (prisma.enrollment.findMany as any).mockResolvedValue([]);
      (prisma.lessonProgress.findMany as any).mockResolvedValue([]);
      (prisma.course.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/student/learning/home')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hero');
      expect(res.body).toHaveProperty('rows');
      expect(res.body.rows).toHaveProperty('continueLearning');
      expect(res.body.rows).toHaveProperty('assignedToYou');
      expect(res.body.rows).toHaveProperty('topCourses');
      expect(res.body.rows).toHaveProperty('newCourses');
      expect(res.body.rows).toHaveProperty('categories');
      expect(res.body.rows).toHaveProperty('history');
      expect(Array.isArray(res.body.rows.continueLearning)).toBe(true);
      expect(Array.isArray(res.body.rows.topCourses)).toBe(true);
    });

    it('2.1b GET /api/student/learning/home response is under 40 KB for 20 enrolments and single request', async () => {
      const mock20Courses = Array.from({ length: 20 }, (_, i) => ({
        id: `c_${i}`,
        title: `Course Number ${i}: Advanced Fullstack Development`,
        slug: `course-number-${i}`,
        description: `Description of course ${i} with complete learning syllabus and curriculum topics.`,
        thumbnailUrl: `https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault_${i}.jpg`,
        category: i % 2 === 0 ? 'Backend' : 'Frontend',
        level: 'INTERMEDIATE',
        estimatedHours: 4.5,
        status: CourseStatus.PUBLISHED,
        enrolment: EnrolmentType.OPEN,
        featured: i < 3,
        dueAt: new Date(Date.now() + 86400000 * 7),
        lessons: [{ durationSec: 600 }, { durationSec: 1200 }],
      }));

      const mock20Enrollments = mock20Courses.map((c, i) => ({
        courseId: c.id,
        course: c,
        status: i % 3 === 0 ? 'COMPLETED' : 'ACTIVE',
        completedAt: i % 3 === 0 ? new Date() : null,
        lastAccessedAt: new Date(),
        source: 'SELF',
      }));

      (prisma.course.findMany as any).mockResolvedValue(mock20Courses);
      (prisma.enrollment.findMany as any).mockResolvedValue(mock20Enrollments);
      (prisma.lessonProgress.findMany as any).mockResolvedValue([]);
      (prisma.course.findFirst as any).mockResolvedValue(mock20Courses[0]);

      const res = await request(app)
        .get('/api/student/learning/home')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      const payloadBytes = Buffer.byteLength(JSON.stringify(res.body), 'utf8');
      expect(payloadBytes).toBeLessThan(40 * 1024); // strictly under 40 KB
    });

    it('2.2 GET /api/student/learning/courses returns paginated courses list and caps limit at 100', async () => {
      (prisma.course.findMany as any).mockResolvedValue([
        {
          id: 'c1',
          title: 'Intro to React',
          slug: 'intro-to-react',
          description: 'Learn React',
          thumbnailUrl: null,
          category: 'Web',
          level: 'BEGINNER',
          estimatedHours: 5,
          status: CourseStatus.PUBLISHED,
          enrolment: EnrolmentType.OPEN,
          featured: true,
          dueAt: null,
          lessons: [{ durationSec: 120 }],
        },
      ]);
      (prisma.course.count as any).mockResolvedValue(1);
      (prisma.enrollment.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/student/learning/courses')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('courses');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(res.body.courses[0]).toMatchObject({
        id: 'c1',
        title: 'Intro to React',
        slug: 'intro-to-react',
      });

      // Verify limit cap: query with limit=500 caps at 100
      const cappedRes = await request(app)
        .get('/api/student/learning/courses?limit=500')
        .set('Cookie', studentCookie);
      expect(cappedRes.status).toBe(200);
      expect(cappedRes.body.pagination.limit).toBe(100);
    });

    it('2.3 GET /api/student/learning/courses/:slugOrId returns CourseDetailResponse', async () => {
      (prisma.course.findFirst as any).mockResolvedValue({
        id: 'c1',
        title: 'Intro to React',
        slug: 'intro-to-react',
        description: 'Learn React',
        thumbnailUrl: null,
        category: 'Web',
        level: 'BEGINNER',
        estimatedHours: 5,
        status: CourseStatus.PUBLISHED,
        enrolment: EnrolmentType.OPEN,
        featured: true,
        dueAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lessons: [
          {
            id: 'l1',
            courseId: 'c1',
            title: 'Lesson 1',
            order: 1,
            type: LessonType.YOUTUBE,
            durationSec: 300,
          },
        ],
      });
      (prisma.enrollment.findUnique as any).mockResolvedValue(null);
      (prisma.lessonProgress.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/student/learning/courses/intro-to-react')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('course');
      expect(res.body).toHaveProperty('enrollment');
      expect(res.body.course).toHaveProperty('lessons');
      expect(res.body.enrollment).toHaveProperty('enrolled');
      expect(res.body.enrollment).toHaveProperty('progressPercent');
    });

    it('2.4 POST /api/student/learning/courses/:id/enroll enrolls student', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({
        id: 'c1',
        status: CourseStatus.PUBLISHED,
        enrolment: EnrolmentType.OPEN,
      });
      (prisma.enrollment.upsert as any).mockResolvedValue({
        id: 'en1',
        studentId: studentPayload.studentId,
        courseId: 'c1',
        enrolledAt: new Date(),
      });

      const res = await request(app)
        .post('/api/student/learning/courses/c1/enroll')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        success: true,
        courseId: 'c1',
      });
      expect(res.body).toHaveProperty('enrolledAt');
    });

    it('2.5 GET /api/student/learning/my-learning returns inProgress, completed, deadlines', async () => {
      (prisma.enrollment.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/student/learning/my-learning')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('inProgress');
      expect(res.body).toHaveProperty('completed');
      expect(res.body).toHaveProperty('deadlines');
      expect(Array.isArray(res.body.inProgress)).toBe(true);
      expect(Array.isArray(res.body.completed)).toBe(true);
      expect(Array.isArray(res.body.deadlines)).toBe(true);
    });

    it('2.6 GET /api/student/learning/lessons/:id returns LessonDetailResponse', async () => {
      (prisma.lesson.findUnique as any).mockResolvedValue({
        id: 'l1',
        title: 'Component State',
        order: 1,
        type: LessonType.YOUTUBE,
        durationSec: 600,
        youtubeVideoId: 'xyz123',
        url: null,
        notes: null,
        courseId: 'c1',
        course: { id: 'c1', title: 'React 101', slug: 'react-101', status: CourseStatus.PUBLISHED, enrolment: EnrolmentType.OPEN },
        quiz: null,
      });
      (prisma.enrollment.findUnique as any).mockResolvedValue({ id: 'en1' });
      (prisma.lesson.findMany as any).mockResolvedValue([{ id: 'l1', order: 1 }]);
      (prisma.lessonProgress.findUnique as any).mockResolvedValue({
        completed: false,
        secondsWatched: 120,
        maxPositionSec: 150,
      });

      const res = await request(app)
        .get('/api/student/learning/lessons/l1')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 'l1',
        courseId: 'c1',
        title: 'Component State',
        type: 'YOUTUBE',
      });
      expect(res.body).toHaveProperty('progress');
      expect(res.body.progress).toMatchObject({
        completed: false,
        secondsWatched: 120,
        maxPositionSec: 150,
      });
    });

    it('2.7 POST /api/student/learning/lessons/:id/progress updates lesson progress', async () => {
      (prisma.lesson.findUnique as any).mockResolvedValue({
        id: 'l1',
        courseId: 'c1',
        type: LessonType.YOUTUBE,
        durationSec: 300,
        course: { id: 'c1', status: CourseStatus.PUBLISHED },
      });
      (prisma.lessonProgress.findUnique as any).mockResolvedValue(null);
      (prisma.lessonProgress.upsert as any).mockResolvedValue({ id: 'lp1', completed: false });
      (prisma.lesson.count as any).mockResolvedValue(3);
      (prisma.lessonProgress.count as any).mockResolvedValue(1);
      (prisma.enrollment.update as any).mockResolvedValue({});

      const res = await request(app)
        .post('/api/student/learning/lessons/l1/progress')
        .set('Cookie', studentCookie)
        .send({ secondsWatched: 150, maxPositionSec: 150 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        completed: false,
        courseProgressPercent: 33,
      });
    });

    it('2.8 GET /api/student/learning/quizzes/:quizId returns QuizDetailResponse without answers', async () => {
      (prisma.quiz.findUnique as any).mockResolvedValue({
        id: 'q1',
        courseId: 'c1',
        lessonId: 'l1',
        opensAt: null,
        dueAt: null,
        maxAttempts: 3,
        timeLimitMin: 20,
        passPercent: 75,
        showAnswers: QuizShowAnswers.AFTER_SUBMIT,
        course: { status: CourseStatus.PUBLISHED },
        questions: [
          {
            id: 'qq1',
            order: 1,
            type: QuizQuestionType.SINGLE,
            text: 'What is JSX?',
            points: 2,
            options: [
              { id: 'opt1', order: 1, text: 'JavaScript XML', isCorrect: true },
              { id: 'opt2', order: 2, text: 'Java Syntax', isCorrect: false },
            ],
          },
        ],
      });
      (prisma.quizAttempt.count as any).mockResolvedValue(0);
      (prisma.quizAttempt.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/student/learning/quizzes/q1')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 'q1',
        courseId: 'c1',
        lessonId: 'l1',
        maxAttempts: 3,
        timeLimitMin: 20,
        passPercent: 75,
        totalPoints: 2,
        passed: false,
      });
      expect(res.body.questions[0]).not.toHaveProperty('isCorrect');
      expect(res.body.questions[0].options[0]).not.toHaveProperty('isCorrect');
    });

    it('2.9 POST /api/student/learning/quizzes/:quizId/start starts timed attempt', async () => {
      (prisma.quiz.findUnique as any).mockResolvedValue({
        id: 'q1',
        courseId: 'c1',
        maxAttempts: 3,
        timeLimitMin: 20,
        course: { status: CourseStatus.PUBLISHED },
      });
      (prisma.quizAttempt.count as any).mockResolvedValue(0);
      (prisma.quizAttempt.create as any).mockResolvedValue({
        id: 'att_123',
        startedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/student/learning/quizzes/q1/start')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        attemptId: 'att_123',
        timeLimitMin: 20,
      });
      expect(res.body).toHaveProperty('startedAt');
      expect(res.body).toHaveProperty('serverTime');
    });

    it('2.10 POST /api/student/learning/quizzes/:quizId/submit grades and returns QuizAttemptResult', async () => {
      (prisma.quizAttempt.findUnique as any).mockResolvedValue({
        id: 'att_123',
        quizId: 'q1',
        studentId: studentPayload.studentId,
        startedAt: new Date(),
        submittedAt: null,
        quiz: {
          id: 'q1',
          courseId: 'c1',
          lessonId: 'l1',
          passPercent: 50,
          showAnswers: QuizShowAnswers.AFTER_SUBMIT,
          lesson: { id: 'l1', courseId: 'c1' },
          questions: [
            {
              id: 'qq1',
              order: 1,
              type: QuizQuestionType.SINGLE,
              points: 10,
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
        .post('/api/student/learning/quizzes/q1/submit')
        .set('Cookie', studentCookie)
        .send({
          attemptId: 'att_123',
          answers: [{ questionId: 'qq1', selectedOptionIds: ['opt1'] }],
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        attemptId: 'att_123',
        score: 10,
        maxScore: 10,
        scorePercent: 100,
        passed: true,
      });
      expect(res.body).toHaveProperty('submittedAt');
      expect(res.body).toHaveProperty('answersReview');
    });

    it('2.11 GET /api/student/learning/quizzes/:quizId/attempts returns list of attempts', async () => {
      (prisma.quiz.findUnique as any).mockResolvedValue({ id: 'q1', passPercent: 70 });
      (prisma.quizAttempt.findMany as any).mockResolvedValue([
        {
          id: 'att_123',
          startedAt: new Date(),
          submittedAt: new Date(),
          score: 8,
          maxScore: 10,
        },
      ]);

      const res = await request(app)
        .get('/api/student/learning/quizzes/q1/attempts')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('attempts');
      expect(res.body.attempts[0]).toMatchObject({
        id: 'att_123',
        score: 8,
        maxScore: 10,
        passed: true,
      });
    });
  });

  describe('Admin Contracts (/admin/api/learning/*)', () => {
    it('3.1 GET /admin/api/learning/courses returns admin course list with stats', async () => {
      (prisma.course.findMany as any).mockResolvedValue([
        {
          id: 'c1',
          title: 'Admin Course',
          slug: 'admin-course',
          description: 'Desc',
          thumbnailUrl: null,
          category: null,
          level: null,
          estimatedHours: null,
          status: CourseStatus.DRAFT,
          enrolment: EnrolmentType.OPEN,
          featured: false,
          dueAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { enrollments: 5 },
          enrollments: [],
          lessons: [],
        },
      ]);
      (prisma.course.count as any).mockResolvedValue(1);
      (prisma.enrollment.count as any).mockResolvedValue(2);

      const res = await request(app)
        .get('/admin/api/learning/courses')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('courses');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.courses[0]).toHaveProperty('enrollmentCount');
      expect(res.body.courses[0]).toHaveProperty('completionCount');
    });

    it('3.2 POST /admin/api/learning/courses creates course', async () => {
      (prisma.course.findUnique as any).mockResolvedValue(null);
      (prisma.course.create as any).mockResolvedValue({
        id: 'c_new',
        title: 'New Course',
        slug: 'new-course',
        description: 'New Course Description',
        status: CourseStatus.DRAFT,
        enrolment: EnrolmentType.OPEN,
        featured: false,
        dueAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lessons: [],
      });

      const res = await request(app)
        .post('/admin/api/learning/courses')
        .set('Cookie', adminCookie)
        .send({ title: 'New Course', description: 'New Course Description' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: 'c_new',
        title: 'New Course',
      });
    });

    it('3.3 GET /admin/api/learning/courses/:id returns full course with lessons', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({
        id: 'c1',
        title: 'Course One',
        slug: 'course-one',
        description: 'Desc',
        status: CourseStatus.PUBLISHED,
        lessons: [],
        targets: [],
      });

      const res = await request(app)
        .get('/admin/api/learning/courses/c1')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'c1');
      expect(res.body).toHaveProperty('lessons');
    });

    it('3.4 PUT /admin/api/learning/courses/:id updates course', async () => {
      (prisma.course.update as any).mockResolvedValue({
        id: 'c1',
        title: 'Updated Course',
        description: 'Updated Desc',
        status: CourseStatus.PUBLISHED,
      });

      const res = await request(app)
        .put('/admin/api/learning/courses/c1')
        .set('Cookie', adminCookie)
        .send({ title: 'Updated Course' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', 'Updated Course');
    });

    it('3.5 DELETE /admin/api/learning/courses/:id deletes course', async () => {
      (prisma.course.delete as any).mockResolvedValue({ id: 'c1' });

      const res = await request(app)
        .delete('/admin/api/learning/courses/c1')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
    });

    it('3.6 POST /admin/api/learning/courses/:id/lessons adds lesson', async () => {
      (prisma.lesson.findFirst as any).mockResolvedValue(null);
      (prisma.lesson.create as any).mockResolvedValue({
        id: 'l_new',
        courseId: 'c1',
        title: 'New Lesson',
        type: LessonType.YOUTUBE,
        order: 1,
      });

      const res = await request(app)
        .post('/admin/api/learning/courses/c1/lessons')
        .set('Cookie', adminCookie)
        .send({ title: 'New Lesson', type: 'YOUTUBE' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: 'l_new',
        title: 'New Lesson',
      });
    });

    it('3.9 PUT /admin/api/learning/courses/:id/lessons/reorder reorders lessons', async () => {
      (prisma.lesson.update as any).mockResolvedValue({});

      const res = await request(app)
        .put('/admin/api/learning/courses/c1/lessons/reorder')
        .set('Cookie', adminCookie)
        .send({ lessonIds: ['l1', 'l2'] });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
    });

    it('3.10 POST /admin/api/learning/courses/:id/assign assigns course', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({ id: 'c1' });
      (prisma.student.findMany as any).mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
      (prisma.courseTarget.createMany as any).mockResolvedValue({ count: 1 });
      (prisma.enrollment.upsert as any).mockResolvedValue({});

      const res = await request(app)
        .post('/admin/api/learning/courses/c1/assign')
        .set('Cookie', adminCookie)
        .send({ targetType: 'ALL' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
    });

    it('3.11 GET /admin/api/learning/courses/:id/enrollments returns enrolments list', async () => {
      (prisma.enrollment.findMany as any).mockResolvedValue([]);
      (prisma.enrollment.count as any).mockResolvedValue(0);

      const res = await request(app)
        .get('/admin/api/learning/courses/c1/enrollments')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('enrollments');
      expect(res.body).toHaveProperty('pagination');
    });

    it('3.12 POST /admin/api/learning/courses/:id/quizzes creates quiz', async () => {
      (prisma.quiz.create as any).mockResolvedValue({
        id: 'q_new',
        courseId: 'c1',
        lessonId: 'l1',
      });
      (prisma.quizQuestion.deleteMany as any).mockResolvedValue({});
      (prisma.quizQuestion.create as any).mockResolvedValue({});

      const res = await request(app)
        .post('/admin/api/learning/courses/c1/quizzes')
        .set('Cookie', adminCookie)
        .send({
          lessonId: 'l1',
          passPercent: 80,
          questions: [
            {
              order: 1,
              type: 'SINGLE',
              text: 'Q1',
              points: 1,
              options: [
                { order: 1, text: 'Opt1', isCorrect: true },
                { order: 2, text: 'Opt2', isCorrect: false },
              ],
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 'q_new');
    });

    it('3.15 GET /admin/api/learning/reports/overview returns platform overview', async () => {
      (prisma.course.count as any).mockResolvedValue(10);
      (prisma.enrollment.count as any).mockResolvedValue(50);
      (prisma.enrollment.groupBy as any).mockResolvedValue([{ studentId: 's1' }]);

      const res = await request(app)
        .get('/admin/api/learning/reports/overview')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalCourses');
      expect(res.body).toHaveProperty('publishedCourses');
      expect(res.body).toHaveProperty('totalEnrolments');
      expect(res.body).toHaveProperty('completedEnrolments');
      expect(res.body).toHaveProperty('overallCompletionRate');
      expect(res.body).toHaveProperty('activeLearnersLast7Days');
    });

    it('3.17 GET /admin/api/learning/reports/courses/:id/export streams CSV', async () => {
      (prisma.course.findUnique as any).mockResolvedValue({ id: 'c1', title: 'Test Course' });
      (prisma.enrollment.findMany as any)
        .mockResolvedValueOnce([
          {
            student: { name: 'Alice', rollNo: '23K61A1201', email: 'alice@sasi.ac.in' },
            status: 'ACTIVE',
            source: 'SELF',
            enrolledAt: new Date(),
            completedAt: null,
            lastAccessedAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([]); // end batch

      const res = await request(app)
        .get('/admin/api/learning/reports/courses/c1/export')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Roll Number,Name,Email,Enrolled At,Status,Completed At');
    });

    it('3.18 GET /admin/api/learning/youtube/preview parses YouTube URL', async () => {
      const res = await request(app)
        .get('/admin/api/learning/youtube/preview?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        videoId: 'dQw4w9WgXcQ',
        embeddable: true,
      });
      expect(res.body).toHaveProperty('thumbnailUrl');
    });
  });
});
