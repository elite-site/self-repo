import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { errorHandler } from '../src/middleware/errorHandler';
import { requireAdminAuth } from '../src/middleware/auth';
import { requireStudentAuth } from '../src/middleware/studentAuth';
import { logger } from '../src/utils/logger';
import { requestIdMiddleware } from '../src/middleware/requestId';

function buildApp() {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(cookieParser());
  app.get('/admin', requireAdminAuth, (_req, res) => res.json({ ok: true }));
  app.get('/student', requireStudentAuth, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

const app = buildApp();

describe('auth middleware failures use the central error envelope', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns UNAUTHORIZED with a generated requestId when the admin cookie is missing', async () => {
    const res = await request(app).get('/admin');

    expect(res.status).toBe(401);
    expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'requestId']);
    expect(res.body).toMatchObject({
      error: 'UNAUTHORIZED',
      message: 'Admin authentication required. Please log in.',
    });
    expect(res.body.requestId).toMatch(/^req_[0-9a-f]+$/);
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
  });

  it('returns UNAUTHORIZED with a generated requestId when the student cookie is missing', async () => {
    const res = await request(app).get('/student');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'UNAUTHORIZED',
      message: 'Student authentication required. Please log in.',
    });
    expect(res.body.requestId).toMatch(/^req_[0-9a-f]+$/);
  });

  it('returns INVALID_TOKEN with the caller requestId for a bad admin token', async () => {
    const token = jwt.sign({ userId: 'synthetic-admin' }, 'synthetic_wrong_secret');
    const res = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-Id', 'req_test_admin_1');

    expect(res.status).toBe(401);
    expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'requestId']);
    expect(res.body).toMatchObject({
      error: 'INVALID_TOKEN',
      message: 'Your session has expired or is invalid. Please log in again.',
      requestId: 'req_test_admin_1',
    });
    expect(res.headers['x-request-id']).toBe('req_test_admin_1');
  });

  it('returns INVALID_TOKEN with the caller requestId for a bad student token', async () => {
    const token = jwt.sign({ studentId: 'synthetic-student' }, 'synthetic_wrong_secret');
    const res = await request(app)
      .get('/student')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-Id', 'req_test_student_1');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'INVALID_TOKEN',
      message: 'Your session has expired or is invalid. Please log in again.',
      requestId: 'req_test_student_1',
    });
    expect(res.headers['x-request-id']).toBe('req_test_student_1');
  });
});
