import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  handleUncaughtException,
  handleUnhandledRejection,
  installProcessGuards,
  removeProcessGuards,
} from '../src/infrastructure/processGuards';
import { asyncHandler } from '../src/utils/asyncHandler';
import { AppError } from '../src/utils/appError';
import { errorHandler } from '../src/middleware/errorHandler';
import { requestIdMiddleware } from '../src/middleware/requestId';
import { logger } from '../src/utils/logger';
import { env } from '../src/config/env';

describe('process guards', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // server.ts installs the guards on import, so start every test from a known
    // state to make listener counts meaningful.
    removeProcessGuards();
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    removeProcessGuards();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('registers one rejection guard and one exception guard, once', () => {
    const rejectionBefore = process.listenerCount('unhandledRejection');
    const exceptionBefore = process.listenerCount('uncaughtException');

    installProcessGuards();
    installProcessGuards();

    expect(process.listenerCount('unhandledRejection')).toBe(rejectionBefore + 1);
    expect(process.listenerCount('uncaughtException')).toBe(exceptionBefore + 1);
  });

  it('removes both guards so tests and shutdown can uninstall them', () => {
    installProcessGuards();
    removeProcessGuards();

    expect(process.listeners('unhandledRejection')).not.toContain(handleUnhandledRejection);
    expect(process.listeners('uncaughtException')).not.toContain(handleUncaughtException);
  });

  describe('async route failures', () => {
    function buildApp(): express.Express {
      const app = express();
      app.use(requestIdMiddleware);
      app.get(
        '/typed-failure',
        asyncHandler(async () => {
          throw new AppError('EVENT_CLOSED', 'This event is no longer accepting responses.', 409);
        })
      );
      app.get(
        '/unknown-failure',
        asyncHandler(async () => {
          throw new Error('connection reset by peer');
        })
      );
      app.use(errorHandler);
      return app;
    }

    it('routes a rejected typed handler to the central error handler instead of hanging', async () => {
      installProcessGuards();

      const res = await request(buildApp()).get('/typed-failure');

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        error: 'EVENT_CLOSED',
        message: 'This event is no longer accepting responses.',
      });
      expect(res.body.requestId).toMatch(/^req_[0-9a-f]+$/);
    });

    it('returns the ERR-5 envelope for an unexpected rejection', async () => {
      installProcessGuards();

      const res = await request(buildApp()).get('/unknown-failure');

      expect(res.status).toBe(500);
      expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'requestId']);
      expect(res.body.error).toBe('INTERNAL_SERVER_ERROR');
      expect(res.body.requestId).toMatch(/^req_[0-9a-f]+$/);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('unhandled rejections', () => {
    it('logs the reason and keeps the process alive', () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

      installProcessGuards();
      handleUnhandledRejection(new Error('prisma: connection pool exhausted'));

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const [message, context] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
      expect(message).toMatch(/unhandled promise rejection/i);
      expect(context.reason).toBe('prisma: connection pool exhausted');
      expect(String(context.stack)).toContain('prisma: connection pool exhausted');
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('logs only the shape of a non-Error reason so request data never reaches the log', () => {
      installProcessGuards();
      handleUnhandledRejection({ authorization: 'Bearer secret-token', body: { email: 'someone@example.com' } });

      const [, context] = errorSpy.mock.calls[0] as [string, Record<string, unknown>];
      expect(context).toEqual({ reason: 'Non-error value rejected', valueType: 'object' });
      expect(JSON.stringify(context)).not.toContain('secret-token');
      expect(JSON.stringify(context)).not.toContain('someone@example.com');
    });
  });

  describe('uncaught exceptions', () => {
    it('logs and does not exit while running under vitest', () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

      installProcessGuards();
      handleUncaughtException(new Error('unexpected state'));

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toMatch(/uncaught exception/i);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('exits with code 1 outside tests, because process state is unknown', () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
      const originalNodeEnv = env.NODE_ENV;
      vi.stubEnv('VITEST', '');
      env.NODE_ENV = 'production';

      try {
        handleUncaughtException(new Error('unexpected state'));
      } finally {
        env.NODE_ENV = originalNodeEnv;
      }

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
