import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import adminApiRouter from '../src/routes/admin.api.routes';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

/**
 * Regression guard for the admin Events table's Registrations column.
 *
 * AdminEvents.tsx renders `registrationCount` and falls back to 0 when it is
 * missing. This route previously did a bare findMany with no _count, so the column
 * read 0 for every event regardless of how many students had actually registered —
 * a plausible-looking number that was simply invented. The equivalent portal route
 * has always computed it; the admin client just calls this one.
 */
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    event: { findMany: vi.fn() },
    student: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    submission: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
    activityLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}));

const eventFindMany = prisma.event.findMany as unknown as ReturnType<typeof vi.fn>;

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use('/admin/api', adminApiRouter);

const adminToken = jwt.sign(
  { userId: 'admin-1', email: 'admin@example.com', username: 'admin' },
  env.JWT_SECRET,
  { expiresIn: '1h' },
);

beforeEach(() => {
  vi.clearAllMocks();
  eventFindMany.mockResolvedValue([
    {
      id: 'hackathon-2026',
      name: 'Campus Hackathon 2026',
      slug: 'campus-hackathon-2026',
      year: 2026,
      status: 'OPEN',
      _count: { registrations: 47, submissions: 12 },
    },
  ]);
});

describe('GET /admin/api/events', () => {
  it('requires an authenticated admin session', async () => {
    const response = await request(app).get('/admin/api/events');

    expect(response.status).toBe(401);
    expect(eventFindMany).not.toHaveBeenCalled();
  });

  it('asks for the registration and submission counts', async () => {
    const response = await request(app)
      .get('/admin/api/events')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(response.status).toBe(200);
    expect(eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          _count: {
            select: { registrations: true, submissions: true },
          },
        },
      }),
    );
  });

  it('reports the real registration count instead of leaving it undefined', async () => {
    const response = await request(app)
      .get('/admin/api/events')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    // AdminEvents.tsx reads this field directly; undefined here is what made the
    // column silently render 0.
    expect(response.body.events[0].registrationCount).toBe(47);
    expect(response.body.events[0].submissionCount).toBe(12);
  });

  it('reports a genuine zero rather than dropping the field', async () => {
    eventFindMany.mockResolvedValue([
      { id: 'quiet-2026', name: 'Quiet Seminar', status: 'DRAFT', _count: { registrations: 0, submissions: 0 } },
    ]);

    const response = await request(app)
      .get('/admin/api/events')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(response.body.events[0].registrationCount).toBe(0);
  });
});
