import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

/**
 * Announcement deletion must remove the Announcement row *and* the per-student
 * notifications it fanned out to, because Notification holds no foreign key to
 * Announcement — only a canonical `actionUrl` string. Without this cleanup the
 * student inbox keeps listing a dead announcement forever.
 *
 * This file keeps its own Prisma mock so the existing delivery tests in
 * announcement.notifications.test.ts stay untouched.
 */
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    announcement: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      deleteMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const adminToken = jwt.sign(
  { userId: 'admin-1', username: 'admin' },
  env.JWT_SECRET,
  { expiresIn: '1h' },
);

const mockAnnouncement = {
  id: 'ann_123',
  title: 'Registration update',
  message: 'Registration opens today.',
  status: 'PUBLISHED',
  targetAll: true,
  targetYear: null,
  targetSection: null,
};

describe('Announcement deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.announcement.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockAnnouncement);
    (prisma.notification.deleteMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });
    // Mirror the real $transaction contract: it takes an array of Prisma
    // promises and resolves to an array of their results, in order.
    (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (ops: Array<Promise<unknown>>) => Promise.all(ops),
    );
  });

  it('deletes the announcement and the notifications it delivered to students', async () => {
    (prisma.announcement.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockAnnouncement);

    const response = await request(app)
      .delete('/admin/api/announcements/ann_123')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.deletedNotifications).toBe(3);

    expect(prisma.announcement.delete).toHaveBeenCalledWith({ where: { id: 'ann_123' } });
  });

  it('scopes the notification purge to ANNOUNCEMENT rows for this exact URL', async () => {
    (prisma.announcement.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockAnnouncement);

    await request(app)
      .delete('/admin/api/announcements/ann_123')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    // This assertion is the regression guard: the filter is constrained by BOTH
    // the notification type and an exact actionUrl match on this one
    // announcement. Moderation notices carry type 'MODERATION' and an
    // actionUrl of '/intro-video' (or null), so they can never be selected.
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: {
        type: 'ANNOUNCEMENT',
        actionUrl: '/announcements/ann_123',
      },
    });
  });

  it('deletes the row and purges notifications in a single transaction', async () => {
    (prisma.announcement.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockAnnouncement);

    await request(app)
      .delete('/admin/api/announcements/ann_123')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    const transactionArg = (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(Array.isArray(transactionArg)).toBe(true);
    expect(transactionArg).toHaveLength(2);
  });

  it('returns 404 and deletes nothing when the announcement does not exist', async () => {
    (prisma.announcement.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await request(app)
      .delete('/admin/api/announcements/does-not-exist')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(response.status).toBe(404);
    expect(prisma.announcement.delete).not.toHaveBeenCalled();
    expect(prisma.notification.deleteMany).not.toHaveBeenCalled();
  });

  it('requires an authenticated admin session', async () => {
    const response = await request(app).delete('/admin/api/announcements/ann_123');

    expect(response.status).toBe(401);
    expect(prisma.announcement.delete).not.toHaveBeenCalled();
    expect(prisma.notification.deleteMany).not.toHaveBeenCalled();
  });

  it('still deletes a scheduled announcement that was never delivered', async () => {
    (prisma.announcement.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockAnnouncement,
      status: 'SCHEDULED',
    });
    (prisma.notification.deleteMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const response = await request(app)
      .delete('/admin/api/announcements/ann_123')
      .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.deletedNotifications).toBe(0);
    // Removing the row stops the scheduler from ever delivering it later.
    expect(prisma.announcement.delete).toHaveBeenCalledWith({ where: { id: 'ann_123' } });
  });
});
