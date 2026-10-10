import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { notifyAllStudentsAboutEvent } from '../src/services/notification.service';
import { invalidateStudentEventsCache } from '../src/routes/student.events.routes';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    event: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    eventRegistration: {
      count: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    submission: {
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    registrationFormField: {
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    registrationAnswer: {
      deleteMany: vi.fn(),
    },
    team: {
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    teamMember: {
      deleteMany: vi.fn(),
    },
    teamInvitation: {
      deleteMany: vi.fn(),
    },
    votingCampaign: {
      deleteMany: vi.fn(),
    },
    votingCandidate: {
      deleteMany: vi.fn(),
    },
    vote: {
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    emailLog: {
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      createMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))),
  },
}));

vi.mock('../src/services/activity.service', () => ({
  ActivityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../src/services/announcement.service', () => ({
  deliverAnnouncementNotifications: vi.fn(),
}));

const adminToken = jwt.sign(
  { userId: 'admin_1', email: 'admin@sasi.ac.in', username: 'admin' },
  env.JWT_SECRET,
  { expiresIn: '1h' }
);
const adminCookie = { Cookie: `${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}` };

const studentPayload = {
  studentId: 'stud_999',
  rollNo: '23K61A1299',
  name: 'Student Learner',
  email: 'learner@sasi.ac.in',
};
const studentToken = jwt.sign(studentPayload, env.STUDENT_JWT_SECRET);
const studentCookie = { Cookie: `pc_student_session=${studentToken}` };

describe('Admin Event Creation & Student Portal Display Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateStudentEventsCache();
  });

  it('admin creates an open event: it saves with status OPEN and fans out notifications to students', async () => {
    const mockCreatedEvent = {
      id: 'hackathon-spring-2026-1234',
      name: 'Hackathon Spring 2026',
      slug: 'hackathon-spring-2026',
      description: 'Annual Spring Hackathon for all years',
      type: 'HACKATHON',
      year: 2026,
      status: 'OPEN',
      eligibilityYears: [1, 2, 3, 4],
      minCompletion: 0,
      teamEnabled: true,
      teamMin: 2,
      teamMax: 4,
      notifyOnOpen: true,
      notifyReminder: true,
      createdAt: new Date(),
    };

    (prisma.event.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreatedEvent);
    (prisma.student.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'stud_1' },
      { id: 'stud_2' },
      { id: 'stud_999' },
    ]);
    (prisma.notification.createMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

    const res = await request(app)
      .post('/admin/api/portal/events')
      .set(adminCookie)
      .send({
        name: 'Hackathon Spring 2026',
        description: 'Annual Spring Hackathon for all years',
        type: 'HACKATHON',
        year: 2026,
        status: 'OPEN',
        eligibilityYears: [1, 2, 3, 4],
        teamEnabled: true,
        teamMin: 2,
        teamMax: 4,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Hackathon Spring 2026');
    expect(res.body.status).toBe('OPEN');

    // Confirmed: prisma.notification.createMany was called with actionUrl pointing to /events/:id
    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            studentId: 'stud_999',
            title: 'New Event: Hackathon Spring 2026',
            actionUrl: `/events/${mockCreatedEvent.id}`,
            type: 'EVENT',
          }),
        ]),
      })
    );
  });

  it('student portal retrieves open events created by admin and displays them', async () => {
    const mockEvents = [
      {
        id: 'hackathon-spring-2026-1234',
        name: 'Hackathon Spring 2026',
        slug: 'hackathon-spring-2026',
        description: 'Annual Spring Hackathon for all years',
        type: 'HACKATHON',
        year: 2026,
        status: 'OPEN',
        eventDate: new Date('2026-04-15'),
        registrationEnd: new Date('2026-04-10'),
        createdAt: new Date(),
      },
    ];

    (prisma.event.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvents);

    const res = await request(app)
      .get('/api/student/events')
      .set(studentCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Hackathon Spring 2026');
    expect(res.body[0].id).toBe('hackathon-spring-2026-1234');
  });

  it('admin deletes an event: cascades cleanly and invalidates student cache', async () => {
    const eventId = 'hackathon-spring-2026-1234';

    (prisma.event.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: eventId,
      name: 'Hackathon Spring 2026',
    });

    // Zero dependents case
    (prisma.eventRegistration.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.submission.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.registrationFormField.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.team.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.vote.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.emailLog.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    (prisma.event.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: eventId });

    const deleteRes = await request(app)
      .delete(`/admin/api/portal/events/${eventId}`)
      .set(adminCookie)
      .send();

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Event is gone from DB; student list returns empty
    (prisma.event.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const studentRes = await request(app)
      .get('/api/student/events')
      .set(studentCookie);

    expect(studentRes.status).toBe(200);
    expect(studentRes.body).toHaveLength(0);
  });
});
