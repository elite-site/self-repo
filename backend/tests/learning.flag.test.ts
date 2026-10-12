import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { env } from '../src/config/env';

describe('LearningHub - Feature Flag Gating (FEATURE_LEARNINGHUB=false)', () => {
  beforeEach(() => {
    env.FEATURE_LEARNINGHUB = false;
  });

  describe('Student Endpoints return 404 when disabled', () => {
    it('GET /api/student/learning/home returns 404 with disabled message', async () => {
      const res = await request(app).get('/api/student/learning/home');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
      expect(res.body.message).toBe('LearningHub is disabled');
    });

    it('GET /api/student/learning/courses returns 404', async () => {
      const res = await request(app).get('/api/student/learning/courses');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /api/student/learning/courses/:slugOrId returns 404', async () => {
      const res = await request(app).get('/api/student/learning/courses/test-course');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('POST /api/student/learning/courses/:id/enroll returns 404', async () => {
      const res = await request(app).post('/api/student/learning/courses/c1/enroll');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /api/student/learning/my-learning returns 404', async () => {
      const res = await request(app).get('/api/student/learning/my-learning');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /api/student/learning/lessons/:id returns 404', async () => {
      const res = await request(app).get('/api/student/learning/lessons/l1');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('POST /api/student/learning/lessons/:id/progress returns 404', async () => {
      const res = await request(app).post('/api/student/learning/lessons/l1/progress');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /api/student/learning/quizzes/:quizId returns 404', async () => {
      const res = await request(app).get('/api/student/learning/quizzes/q1');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('POST /api/student/learning/quizzes/:quizId/start returns 404', async () => {
      const res = await request(app).post('/api/student/learning/quizzes/q1/start');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('POST /api/student/learning/quizzes/:quizId/submit returns 404', async () => {
      const res = await request(app).post('/api/student/learning/quizzes/q1/submit');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /api/student/learning/quizzes/:quizId/attempts returns 404', async () => {
      const res = await request(app).get('/api/student/learning/quizzes/q1/attempts');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });
  });

  describe('Admin Endpoints return 404 when disabled', () => {
    it('GET /admin/api/learning/courses returns 404', async () => {
      const res = await request(app).get('/admin/api/learning/courses');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
      expect(res.body.message).toBe('LearningHub is disabled');
    });

    it('POST /admin/api/learning/courses returns 404', async () => {
      const res = await request(app).post('/admin/api/learning/courses');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /admin/api/learning/courses/:id returns 404', async () => {
      const res = await request(app).get('/admin/api/learning/courses/c1');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('PUT /admin/api/learning/courses/:id returns 404', async () => {
      const res = await request(app).put('/admin/api/learning/courses/c1');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('DELETE /admin/api/learning/courses/:id returns 404', async () => {
      const res = await request(app).delete('/admin/api/learning/courses/c1');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('POST /admin/api/learning/courses/:id/lessons returns 404', async () => {
      const res = await request(app).post('/admin/api/learning/courses/c1/lessons');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('POST /admin/api/learning/courses/:id/assign returns 404', async () => {
      const res = await request(app).post('/admin/api/learning/courses/c1/assign');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /admin/api/learning/courses/:id/enrollments returns 404', async () => {
      const res = await request(app).get('/admin/api/learning/courses/c1/enrollments');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('POST /admin/api/learning/courses/:id/quizzes returns 404', async () => {
      const res = await request(app).post('/admin/api/learning/courses/c1/quizzes');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /admin/api/learning/reports/overview returns 404', async () => {
      const res = await request(app).get('/admin/api/learning/reports/overview');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /admin/api/learning/reports/courses/:id returns 404', async () => {
      const res = await request(app).get('/admin/api/learning/reports/courses/c1');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /admin/api/learning/reports/courses/:id/export returns 404', async () => {
      const res = await request(app).get('/admin/api/learning/reports/courses/c1/export');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('GET /admin/api/learning/youtube/preview returns 404', async () => {
      const res = await request(app).get('/admin/api/learning/youtube/preview?url=https://youtube.com');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });
  });
});
