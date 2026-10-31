import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { deleteEventWithCascade } from '../src/modules/events/events.repository';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    event: {
      delete: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock('../src/modules/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/modules/admin')>();
  return {
    ...actual,
    ActivityService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

const studentPayload = {
  studentId: 'stud_notif_1',
  rollNo: '23K61A1201',
  name: 'Notif Student',
  email: 'notif@college.edu',
};

const token = jwt.sign(studentPayload, env.STUDENT_JWT_SECRET, { expiresIn: '1h' });

describe('Student Notifications API & Event Cascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.student.findUnique as any).mockResolvedValue({
      id: 'stud_notif_1',
      rollNo: '23K61A1201',
      name: 'Notif Student',
      email: 'notif@college.edu',
      status: 'ACTIVE',
    });
  });

  describe('GET /api/student/notifications', () => {
    it('queries notifications excluding any Spring Boot event notifications', async () => {
      (prisma.notification.findMany as any).mockResolvedValue([
        {
          id: 'n1',
          studentId: 'stud_notif_1',
          title: 'System Notice',
          message: 'Welcome to the platform',
          status: 'UNREAD',
          type: 'SYSTEM',
        },
      ]);
      (prisma.notification.count as any).mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/student/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe('n1');

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: 'stud_notif_1',
            NOT: expect.arrayContaining([
              { title: { contains: 'Spring Boot', mode: 'insensitive' } },
              { message: { contains: 'Spring Boot', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('DELETE /api/student/notifications/:id', () => {
    it('deletes notification for student and returns success', async () => {
      (prisma.notification.deleteMany as any).mockResolvedValue({ count: 1 });

      const res = await request(app)
        .delete('/api/student/notifications/n_target')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Notification deleted' });
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: 'n_target', studentId: 'stud_notif_1' },
      });
    });

    it('returns 404 when notification does not exist or belongs to another student', async () => {
      (prisma.notification.deleteMany as any).mockResolvedValue({ count: 0 });

      const res = await request(app)
        .delete('/api/student/notifications/non_existent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/student/notifications/query', () => {
    it('deletes notifications matching search query', async () => {
      (prisma.notification.deleteMany as any).mockResolvedValue({ count: 2 });

      const res = await request(app)
        .delete('/api/student/notifications/query?q=Spring%20Boot')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, count: 2, message: 'Deleted 2 notification(s)' });
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          studentId: 'stud_notif_1',
          OR: [
            { title: { contains: 'Spring Boot', mode: 'insensitive' } },
            { message: { contains: 'Spring Boot', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('returns 400 when query parameter q is missing', async () => {
      const res = await request(app)
        .delete('/api/student/notifications/query')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('deleteEventWithCascade notification purging', () => {
    it('cascades deletion to event notifications matching notif_event_${id}_ and /events/${id}', async () => {
      (prisma.event.delete as any).mockResolvedValue({ id: 'ev_spring_boot' });

      await deleteEventWithCascade('ev_spring_boot', {
        registrations: 0,
        formFields: 0,
        teams: 0,
        votes: 0,
        submissions: 0,
        emailLogs: 0,
      });

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: { startsWith: 'notif_event_ev_spring_boot_' } },
            { actionUrl: { contains: '/events/ev_spring_boot' } },
          ],
        },
      });
      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: 'ev_spring_boot' } });
    });
  });
});
