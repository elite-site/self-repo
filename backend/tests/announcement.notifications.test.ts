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
      update: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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
    (prisma.announcement.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'ann_scheduled',
      title: 'Scheduled update',
      message: 'The scheduled update is now live.',
      status: 'SCHEDULED',
      targetAll: true,
      targetYear: null,
      targetSection: null,
    });
    (prisma.announcement.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'ann_scheduled',
      title: 'Scheduled update',
      message: 'The scheduled update is now live.',
      status: 'PUBLISHED',
      targetAll: true,
      targetYear: null,
      targetSection: null,
    });
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
