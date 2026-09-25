import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    team: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    teamMember: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    teamInvitation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../src/services/activity.service', () => ({
  ActivityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

const studentPayload = {
  studentId: 'stud_123',
  rollNo: '23K61A1201',
  name: 'Test Student',
  email: 'test@sasi.ac.in',
};

const token = jwt.sign(studentPayload, env.STUDENT_JWT_SECRET);

describe('Team Creation API (POST /api/student/teams)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/student/teams')
      .send({ name: 'Alpha Squad', eventId: 'event-1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
    expect(prisma.team.create).not.toHaveBeenCalled();
  });

  it('rejects creation when team name is missing or blank', async () => {
    const res = await request(app)
      .post('/api/student/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ', eventId: 'event-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.message).toBe('Team name is required');
    expect(prisma.team.create).not.toHaveBeenCalled();
  });

  it('successfully creates a team when a valid eventId is provided', async () => {
    const mockEvent = {
      id: 'event-1',
      name: 'Hackathon 2026',
      status: 'OPEN',
    };
    const mockCreatedTeam = {
      id: 'team-1',
      name: 'Alpha Squad',
      eventId: 'event-1',
      leaderId: 'stud_123',
      status: 'FORMING',
      event: mockEvent,
      members: [
        {
          id: 'member-1',
          teamId: 'team-1',
          studentId: 'stud_123',
          student: studentPayload,
        },
      ],
    };

    (prisma.event.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvent);
    (prisma.team.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreatedTeam);

    const res = await request(app)
      .post('/api/student/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Alpha Squad', eventId: 'event-1' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('team-1');
    expect(res.body.name).toBe('Alpha Squad');
    expect(res.body.eventId).toBe('event-1');
    expect(prisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: 'event-1' },
    });
    expect(prisma.team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Alpha Squad',
          eventId: 'event-1',
          leaderId: 'stud_123',
        }),
      })
    );
  });

  it('falls back to the active open event when eventId is omitted', async () => {
    const mockActiveEvent = {
      id: 'event-active-open',
      name: 'Department Innovation Challenge 2026',
      status: 'OPEN',
    };
    const mockCreatedTeam = {
      id: 'team-2',
      name: 'Beta Builders',
      eventId: 'event-active-open',
      leaderId: 'stud_123',
      status: 'FORMING',
      event: mockActiveEvent,
      members: [],
    };

    (prisma.event.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockActiveEvent);
    (prisma.team.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreatedTeam);

    const res = await request(app)
      .post('/api/student/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Beta Builders' }); // No eventId in body

    expect(res.status).toBe(201);
    expect(prisma.event.findFirst).toHaveBeenCalledWith({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });
    expect(prisma.team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Beta Builders',
          eventId: 'event-active-open',
          leaderId: 'stud_123',
        }),
      })
    );
  });

  it('returns a clean 400 error when eventId is missing and NO active open event exists', async () => {
    (prisma.event.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/student/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Solo Coders' }); // No eventId provided, and no open event in DB

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.message).toBe('No active event available to create a team for.');
    // Must NEVER let an undefined event reach prisma.team.create
    expect(prisma.team.create).not.toHaveBeenCalled();
  });

  it('returns 404 when an explicit eventId is provided but not found', async () => {
    (prisma.event.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/student/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nonexistent Team', eventId: 'nonexistent-event-id' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(res.body.message).toBe('Event not found');
    expect(prisma.team.create).not.toHaveBeenCalled();
  });
});
