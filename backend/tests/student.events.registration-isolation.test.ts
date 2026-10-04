import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { INTERNAL_EVENT_ID, INTERNAL_EVENT_SLUG } from '../src/config/constants';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    eventRegistration: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    registrationAnswer: {
      findMany: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/services/activity.service', () => ({
  ActivityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

const studentPayload = {
  studentId: 'stud_123',
  rollNo: '23K61A1203',
  name: 'Test Student',
  email: 'test@sasi.ac.in',
};

const token = jwt.sign(studentPayload, env.STUDENT_JWT_SECRET);
const auth = { Cookie: `pc_student_session=${token}` };

const asMock = (fn: unknown) => fn as unknown as ReturnType<typeof vi.fn>;

/**
 * `self-introduction-2026` is the internal container that Submission rows hang
 * off, not a student-registrable event. These tests pin the behaviour that keeps
 * it out of the student-facing event catalog and registration list — otherwise a
 * leftover registration row renders as a "Self Introduction" event with
 * placeholder copy and a dead detail link.
 */
describe('Internal self-introduction event isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(prisma.student.findUnique).mockResolvedValue({
      id: studentPayload.studentId,
      status: 'ACTIVE',
    });
  });

  describe('GET /api/student/events', () => {
    it('excludes the internal event from the catalog query', async () => {
      asMock(prisma.event.findMany).mockResolvedValue([]);

      const res = await request(app).get('/api/student/events').set(auth);

      expect(res.status).toBe(200);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
            id: { not: INTERNAL_EVENT_ID },
          }),
        })
      );
    });
  });

  describe('GET /api/student/events/:id', () => {
    it('404s for the internal event id instead of rendering an empty page', async () => {
      const res = await request(app)
        .get(`/api/student/events/${INTERNAL_EVENT_ID}`)
        .set(auth);

      expect(res.status).toBe(404);
      expect(prisma.event.findFirst).not.toHaveBeenCalled();
    });

    it('404s for the internal event slug as well', async () => {
      const res = await request(app)
        .get(`/api/student/events/${INTERNAL_EVENT_SLUG}`)
        .set(auth);

      expect(res.status).toBe(404);
      expect(prisma.event.findFirst).not.toHaveBeenCalled();
    });

    it('still serves real events', async () => {
      asMock(prisma.event.findFirst).mockResolvedValue({
        id: 'hackathon-2026',
        name: 'Hackathon 2026',
        slug: 'hackathon-2026',
        year: 2026,
        createdAt: new Date('2026-09-20T00:00:00.000Z'),
        formFields: [],
      });

      const res = await request(app).get('/api/student/events/hackathon-2026').set(auth);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Hackathon 2026');
    });
  });

  describe('POST /api/student/events/:id/register', () => {
    it('refuses to register for the internal event', async () => {
      const res = await request(app)
        .post(`/api/student/events/${INTERNAL_EVENT_ID}/register`)
        .set(auth)
        .send({ answers: {} });

      expect(res.status).toBe(404);
      expect(prisma.eventRegistration.upsert).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/student/registrations', () => {
    it('excludes internal-event registrations from the query', async () => {
      asMock(prisma.eventRegistration.findMany).mockResolvedValue([]);

      const res = await request(app).get('/api/student/registrations').set(auth);

      expect(res.status).toBe(200);
      expect(prisma.eventRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: studentPayload.studentId,
            eventId: { not: INTERNAL_EVENT_ID },
          }),
        })
      );
    });
  });

  describe('GET /api/public/events', () => {
    it('excludes the internal event from the public catalog', async () => {
      asMock(prisma.event.findMany).mockResolvedValue([]);

      const res = await request(app).get('/api/public/events');

      expect(res.status).toBe(200);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
            id: { not: INTERNAL_EVENT_ID },
          }),
        })
      );
    });
  });

  describe('GET /api/public/events/:id', () => {
    it('404s for the internal event', async () => {
      const res = await request(app).get(`/api/public/events/${INTERNAL_EVENT_ID}`);

      expect(res.status).toBe(404);
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/student/teams', () => {
    it('excludes internal-event teams from the query', async () => {
      asMock(prisma.team.findMany).mockResolvedValue([]);

      const res = await request(app).get('/api/student/teams').set(auth);

      expect(res.status).toBe(200);
      expect(prisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId: { not: INTERNAL_EVENT_ID },
          }),
        })
      );
    });
  });

  describe('POST /api/student/teams', () => {
    it('refuses to create a team against the internal event id', async () => {
      const res = await request(app)
        .post('/api/student/teams')
        .set(auth)
        .send({ name: 'Alpha Squad', eventId: INTERNAL_EVENT_ID });

      expect(res.status).toBe(404);
      expect(prisma.team.create).not.toHaveBeenCalled();
    });

    it('refuses to create a team against the internal event slug', async () => {
      const res = await request(app)
        .post('/api/student/teams')
        .set(auth)
        .send({ name: 'Alpha Squad', eventId: INTERNAL_EVENT_SLUG });

      expect(res.status).toBe(404);
      expect(prisma.team.create).not.toHaveBeenCalled();
    });

    it('never auto-picks the internal event when eventId is omitted', async () => {
      asMock(prisma.event.findFirst).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/student/teams')
        .set(auth)
        .send({ name: 'Alpha Squad' });

      expect(res.status).toBe(400);
      // The internal event is seeded as OPEN, so an unfiltered "most recent open
      // event" lookup would attach the team to it.
      expect(prisma.event.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
            id: { not: INTERNAL_EVENT_ID },
          }),
        })
      );
      expect(prisma.team.create).not.toHaveBeenCalled();
    });
  });

  describe('Admin isolation of internal event', () => {
    const adminToken = jwt.sign({ userId: 'admin_1', username: 'admin' }, env.JWT_SECRET);
    const adminAuth = { Authorization: `Bearer ${adminToken}` };

    it('excludes the internal event from GET /admin/api/events', async () => {
      asMock(prisma.event.findMany).mockResolvedValue([]);
      const res = await request(app).get('/admin/api/events').set(adminAuth);
      expect(res.status).toBe(200);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: INTERNAL_EVENT_ID },
          }),
        })
      );
    });

    it('refuses admin PUT update on the internal event with 409', async () => {
      const res = await request(app)
        .put(`/admin/api/portal/events/${INTERNAL_EVENT_ID}`)
        .set(adminAuth)
        .send({ name: 'Renamed Internal Event' });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('SYSTEM_RECORD');
    });

    it('refuses admin archive action on the internal event with 409', async () => {
      const res = await request(app)
        .post(`/admin/api/portal/events/${INTERNAL_EVENT_ID}/archive`)
        .set(adminAuth);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('SYSTEM_RECORD');
    });
  });
});
