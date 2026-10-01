import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { announcementStudentWhere, resolveAnnouncementTarget } from '../src/services/announcement.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    announcement: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    notification: {
      createMany: vi.fn(),
    },
  },
}));

const { prisma } = await import('../src/lib/prisma');

const adminToken = jwt.sign(
  { userId: 'admin-1', username: 'admin' },
  env.JWT_SECRET,
  { expiresIn: '1h' },
);

describe('announcement audience resolution', () => {
  describe('resolveAnnouncementTarget', () => {
    it('treats the ALL audience token as targeting every student', () => {
      expect(resolveAnnouncementTarget({ audience: 'ALL' })).toEqual({
        targetAll: true,
        targetYear: null,
        targetSection: null,
      });
    });

    // The regression: the admin UI sends `audience: 'YEAR_2'`, and the create route
    // used to read only `targetYear`. That made every announcement target all
    // students regardless of the audience the admin picked.
    it.each([
      ['YEAR_1', 1],
      ['YEAR_2', 2],
      ['YEAR_3', 3],
      ['YEAR_4', 4],
    ])('maps the %s audience token onto targetYear %i', (audience, year) => {
      expect(resolveAnnouncementTarget({ audience })).toEqual({
        targetAll: false,
        targetYear: year,
        targetSection: null,
      });
    });

    it('still honours an explicit targetYear for older callers', () => {
      expect(resolveAnnouncementTarget({ targetYear: 3 })).toEqual({
        targetAll: false,
        targetYear: 3,
        targetSection: null,
      });
    });

    it('lets an explicit targetAll win over the audience token', () => {
      expect(resolveAnnouncementTarget({ audience: 'YEAR_2', targetAll: true })).toEqual({
        targetAll: true,
        targetYear: 2,
        targetSection: null,
      });
    });

    it('narrows to a section without dropping the year', () => {
      expect(resolveAnnouncementTarget({ targetYear: 2, targetSection: 'B' })).toEqual({
        targetAll: false,
        targetYear: 2,
        targetSection: 'B',
      });
    });
  });

  describe('announcementStudentWhere', () => {
    it('produces an unfiltered clause when targeting everyone', () => {
      expect(announcementStudentWhere({ targetAll: true, targetYear: null, targetSection: null })).toEqual({});
    });

    it('filters by year and section together', () => {
      expect(announcementStudentWhere({ targetAll: false, targetYear: 2, targetSection: 'C' })).toEqual({
        year: 2,
        section: 'C',
      });
    });

    it('ignores an empty section string', () => {
      expect(announcementStudentWhere({ targetAll: false, targetYear: 1, targetSection: '' })).toEqual({
        year: 1,
      });
    });
  });

  describe('GET /admin/api/announcements/preview', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns the real student count for an audience token', async () => {
      (prisma.student.count as any).mockResolvedValue(42);

      const res = await request(app)
        .get('/admin/api/announcements/preview?audience=YEAR_2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 42 });
      expect((prisma.student.count as any).mock.calls[0][0]).toEqual({ where: { year: 2 } });
    });

    it('counts every student for the ALL audience', async () => {
      (prisma.student.count as any).mockResolvedValue(120);

      const res = await request(app)
        .get('/admin/api/announcements/preview?audience=ALL')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect((prisma.student.count as any).mock.calls[0][0]).toEqual({ where: {} });
    });

    it('requires admin auth', async () => {
      const res = await request(app).get('/admin/api/announcements/preview?audience=ALL');
      expect(res.status).toBe(401);
    });
  });
});
