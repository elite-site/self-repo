import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../src/middleware/errorHandler';
import { requestIdMiddleware } from '../src/middleware/requestId';
import { logger } from '../src/utils/logger';
import { UploadValidationError } from '../src/middleware/upload';

type ErrorRequest = {
  name?: string;
  code?: string;
  message?: string;
  status?: number;
};

function buildApp(error: ErrorRequest) {
  const app = express();
  app.use(requestIdMiddleware);
  app.get('/failure', (_req, _res, next) => {
    next(error);
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler never echoes raw middleware/provider text', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces a raw Multer message with a stable upload code and static text', async () => {
    const app = buildApp({
      name: 'MulterError',
      code: 'LIMIT_UNEXPECTED_FILE',
      message: 'Unexpected field: /srv/app/uploads/private-name',
    });

    const res = await request(app).get('/failure');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'UPLOAD_ERROR',
      message: 'An unexpected upload field was provided.',
      requestId: expect.stringMatching(/^req_[0-9a-f]+$/),
    });
    expect(JSON.stringify(res.body)).not.toContain('/srv/app');
  });

  it('uses a generic message for an unknown Multer error code', async () => {
    const app = buildApp({
      name: 'MulterError',
      code: 'LIMIT_UNKNOWN',
      message: 'provider failure at /srv/app/secret.txt',
    });

    const res = await request(app).get('/failure');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'UPLOAD_ERROR',
      message: 'The upload could not be completed. Please try again.',
    });
  });

  it('keeps the FILE_TOO_LARGE code and safe message', async () => {
    const app = buildApp({
      name: 'MulterError',
      code: 'LIMIT_FILE_SIZE',
      message: 'File too large /srv/app/uploads',
    });

    const res = await request(app).get('/failure');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'FILE_TOO_LARGE',
      message: 'One of your uploaded files exceeds the maximum allowed size limit.',
    });
  });

  it('does not expose parser messages or non-conforming codes on declared 4xx errors', async () => {
    const app = buildApp({
      code: 'entity.parse.failed',
      message: 'Unexpected token "secret" in JSON at /srv/app/src/db.ts:42',
      status: 400,
    });

    const res = await request(app).get('/failure');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'VALIDATION_ERROR',
      message: 'The request could not be processed.',
      requestId: expect.stringMatching(/^req_[0-9a-f]+$/),
    });
    expect(JSON.stringify(res.body)).not.toContain('/srv/app');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('retains safe messages authored by our upload validators', async () => {
    const app = buildApp(new UploadValidationError('Resume must be a PDF document.'));

    const res = await request(app).get('/failure');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'VALIDATION_ERROR',
      message: 'Resume must be a PDF document.',
    });
  });
});
