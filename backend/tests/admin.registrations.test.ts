import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    eventRegistration: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    team: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    teamMember: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    registrationAnswer: {
      deleteMany: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../src/services/activity.service', () => ({
  ActivityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

const adminToken = jwt.sign(
  { userId: 'admin-1', username: 'admin' },
  env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Admin Event Registrations & Teams API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/admin/api/registrations');
    expect(res.status).toBe(401);
  });

  it('returns registrations and calculated stats on GET /admin/api/registrations', async () => {
    (prisma.eventRegistration.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.team.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.eventRegistration.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'reg-1',
        eventId: 'self-introduction-2026',
        studentId: 's-1',
        status: 'CONFIRMED',
        registeredAt: new Date('2026-09-25T02:00:00Z'),
        updatedAt: new Date('2026-09-25T02:00:00Z'),
        student: {
          id: 's-1',
          name: 'Jane Doe',
          rollNo: '24K61A1201',
          email: 'jane@sasi.ac.in',
          year: 3,
          section: 'A',
          branch: 'IT',
        },
        event: {
          id: 'self-introduction-2026',
          name: 'Self Introduction',
          slug: 'self-introduction',
          year: 2026,
          status: 'OPEN',
        },
        team: null,
        answers: [],
      },
    ]);

    const res = await request(app)
      .get('/admin/api/registrations')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.registrations).toHaveLength(1);
    expect(res.body.registrations[0].student.name).toBe('Jane Doe');
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.stats).toBeDefined();
  });

  it('updates registration status on PATCH /admin/api/registrations/:id/status', async () => {
    (prisma.eventRegistration.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'reg-1',
      eventId: 'self-introduction-2026',
      student: { name: 'Jane Doe', rollNo: '24K61A1201', email: 'jane@sasi.ac.in' },
      event: { name: 'Self Introduction' },
    });
    (prisma.eventRegistration.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'reg-1',
      status: 'WAITLISTED',
      eventId: 'self-introduction-2026',
      student: { name: 'Jane Doe', rollNo: '24K61A1201' },
      answers: [],
    });

    const res = await request(app)
      .patch('/admin/api/registrations/reg-1/status')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`])
      .send({ status: 'WAITLISTED', note: 'Moved due to capacity' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.registration.status).toBe('WAITLISTED');
  });

  it('rejects invalid registration status', async () => {
    const res = await request(app)
      .patch('/admin/api/registrations/reg-1/status')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`])
      .send({ status: 'NON_EXISTENT_STATUS' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_STATUS');
  });

  it('fetches teams on GET /admin/api/teams', async () => {
    (prisma.team.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'team-1',
        name: 'Alpha Coders',
        eventId: 'self-introduction-2026',
        leaderId: 's-1',
        status: 'ACTIVE',
        members: [],
        invitations: [],
        registrations: [],
      },
    ]);
    (prisma.student.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 's-1', name: 'Leader Jane', rollNo: '24K61A1201' },
    ]);

    const res = await request(app)
      .get('/admin/api/teams')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.teams).toHaveLength(1);
    expect(res.body.teams[0].name).toBe('Alpha Coders');
    expect(res.body.teams[0].leader.name).toBe('Leader Jane');
  });
});
