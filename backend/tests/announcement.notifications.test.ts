import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    announcement: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      createMany: vi.fn(),
    },
  },
}));

const adminToken = jwt.sign(
  { userId: 'admin-1', username: 'admin' },
  env.JWT_SECRET,
  { expiresIn: '1h' },
);

const studentToken = jwt.sign(
  { studentId: 'student-1', rollNo: '24K61A1201', name: 'Test Student' },
  env.STUDENT_JWT_SECRET,
  { expiresIn: '1h' },
);

describe('Announcement notification routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a canonical announcement URL on every delivered notification', async () => {
    (prisma.announcement.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'ann_123',
      title: 'Registration update',
      message: 'Registration opens today.',
    });
    (prisma.student.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'student-1' },
      { id: 'student-2' },
    ]);
    (prisma.notification.createMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

    const response = await request(app)
      .post('/admin/api/announcements')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`])
      .send({
        title: 'Registration update',
        body: 'Registration opens today.',
        targetAll: true,
      });

    expect(response.status).toBe(201);
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          studentId: 'student-1',
          title: 'Announcement: Registration update',
          message: 'Registration opens today.',
          type: 'ANNOUNCEMENT',
          actionUrl: '/announcements/ann_123',
        },
        {
          studentId: 'student-2',
          title: 'Announcement: Registration update',
          message: 'Registration opens today.',
          type: 'ANNOUNCEMENT',
          actionUrl: '/announcements/ann_123',
        },
      ],
    });
  });

  it('delivers a canonical URL when a scheduled announcement is published', async () => {
    (prisma.announcement.findUnique as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'ann_scheduled',
        title: 'Scheduled update',
        message: 'The scheduled update is now live.',
        status: 'SCHEDULED',
        targetAll: true,
        targetYear: null,
        targetSection: null,
      })
      .mockResolvedValueOnce({
        id: 'ann_scheduled',
        title: 'Scheduled update',
        message: 'The scheduled update is now live.',
        status: 'PUBLISHED',
        targetAll: true,
        targetYear: null,
        targetSection: null,
      });
    // The route claims the SCHEDULED -> PUBLISHED transition atomically.
    (prisma.announcement.updateMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (prisma.student.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'student-1' }]);
    (prisma.notification.createMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    const response = await request(app)
      .post('/admin/api/announcements/ann_scheduled/publish')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(response.status).toBe(200);
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          studentId: 'student-1',
          title: 'Announcement: Scheduled update',
          message: 'The scheduled update is now live.',
          type: 'ANNOUNCEMENT',
          actionUrl: '/announcements/ann_scheduled',
        },
      ],
    });
  });

  it('claims the publish transition atomically so a concurrent publisher cannot double-deliver', async () => {
    (prisma.announcement.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'ann_race',
      title: 'Racy update',
      message: 'Only one publisher may deliver this.',
      status: 'SCHEDULED',
      targetAll: true,
      targetYear: null,
      targetSection: null,
    });
    // count 0 means another caller (e.g. the cron scheduler) already moved the
    // row to PUBLISHED, so this caller lost the race and must not deliver.
    (prisma.announcement.updateMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const response = await request(app)
      .post('/admin/api/announcements/ann_race/publish')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(response.status).toBe(200);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('only claims rows that are not already PUBLISHED', async () => {
    (prisma.announcement.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'ann_claim',
      title: 'Claim check',
      message: 'Guard the transition.',
      status: 'SCHEDULED',
      targetAll: true,
      targetYear: null,
      targetSection: null,
    });
    (prisma.announcement.updateMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    await request(app)
      .post('/admin/api/announcements/ann_claim/publish')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(prisma.announcement.updateMany).toHaveBeenCalledWith({
      where: { id: 'ann_claim', status: { not: 'PUBLISHED' } },
      data: { status: 'PUBLISHED', publishedAt: expect.any(Date) },
    });
  });

  it('reports the real recipient count for an audience instead of a placeholder', async () => {
    (prisma.student.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(136);

    const all = await request(app)
      .get('/admin/api/announcements/preview?audience=ALL')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(all.status).toBe(200);
    expect(all.body.count).toBe(136);
    expect(prisma.student.count).toHaveBeenCalledWith({ where: {} });

    const year = await request(app)
      .get('/admin/api/announcements/preview?audience=YEAR_3')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(year.status).toBe(200);
    expect(year.body.targetYear).toBe(3);
    expect(prisma.student.count).toHaveBeenCalledWith({ where: { year: 3 } });
  });

  it('returns a published announcement for an authenticated targeted student', async () => {
    (prisma.announcement.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'ann_123',
      title: 'Registration update',
      message: 'Registration opens today.',
      targetAll: false,
      targetYear: 3,
      targetSection: 'A',
      publishedAt: new Date('2026-09-25T00:00:00.000Z'),
    });
    (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      year: 3,
      section: 'A',
    });

    const response = await request(app)
      .get('/api/student/announcements/ann_123')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.body).toBe('Registration opens today.');
    expect(response.body.message).toBe('Registration opens today.');
  });
});
