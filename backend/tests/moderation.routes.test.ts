import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { driveService } from '../src/modules/media/drive';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    introVideo: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    resume: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    certificate: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    achievement: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    project: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    submission: { updateMany: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

vi.mock('../src/modules/media/drive', () => ({
  driveService: {
    deleteFileById: vi.fn(),
  },
}));

const adminToken = jwt.sign({ userId: 'admin-1', username: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });

type ModerationTestType = 'videos' | 'resumes' | 'certificates' | 'achievements' | 'projects';

interface DelegateMock {
  findMany: unknown;
  findUnique: unknown;
  update: unknown;
  delete: unknown;
}

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const delegates: Record<ModerationTestType, DelegateMock> = {
  videos: prisma.introVideo as unknown as DelegateMock,
  resumes: prisma.resume as unknown as DelegateMock,
  certificates: prisma.certificate as unknown as DelegateMock,
  achievements: prisma.achievement as unknown as DelegateMock,
  projects: prisma.project as unknown as DelegateMock,
};

const pendingRow = { id: 'item-1', status: 'PENDING', isPublic: false, student: null, publishedAt: null };

function asAdmin<T extends { set(field: string, value: string): T }>(req: T): T {
  return req.set('Authorization', `Bearer ${adminToken}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Admin moderation routes', () => {
  it('rejects every new route without an admin session', async () => {
    const requests = [
      request(app).get('/admin/api/moderation/projects'),
      request(app).patch('/admin/api/moderation/videos/item-1').send({ action: 'approve' }),
      request(app).patch('/admin/api/moderation/videos/item-1/visibility').send({ isPublic: true }),
      request(app).delete('/admin/api/moderation/resumes/item-1'),
      request(app).post('/admin/api/moderation/projects/item-1/request-changes').send({ note: 'Fix it' }),
    ];

    for (const req of requests) {
      const res = await req;
      expect(res.status).toBe(401);
    }
  });

  describe('GET /moderation/projects', () => {
    it('returns the project queue as { items }', async () => {
      asMock(delegates.projects.findMany).mockResolvedValue([
        {
          id: 'proj-1',
          studentId: 'stud-1',
          title: 'Campus Portal',
          description: 'A portal for campus events',
          githubUrl: 'https://github.com/example/campus-portal',
          driveVideoUrl: null,
          status: 'PENDING',
          isPublic: false,
          reviewNote: null,
          createdAt: new Date('2026-01-05T10:00:00Z'),
          student: { name: 'Test Student', rollNo: '23K61A1201', year: 3, section: 'A', branch: 'IT' },
        },
      ]);

      const res = await asAdmin(request(app).get('/admin/api/moderation/projects'));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [expect.any(Object)] });
      expect(res.body.items[0]).toMatchObject({
        id: 'proj-1',
        type: 'projects',
        itemType: 'project',
        studentName: 'Test Student',
        studentRoll: '23K61A1201',
        title: 'Campus Portal',
        githubUrl: 'https://github.com/example/campus-portal',
        status: 'PENDING',
        isPublic: false,
      });
    });

    it('returns an empty list when nothing has been submitted', async () => {
      asMock(delegates.projects.findMany).mockResolvedValue([]);

      const res = await asAdmin(request(app).get('/admin/api/moderation/projects'));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [] });
    });
  });

  describe('PATCH /moderation/:type/:id', () => {
    it.each<ModerationTestType>(['videos', 'resumes', 'certificates', 'achievements', 'projects'])(
      'applies an approval to %s',
      async (type) => {
        asMock(delegates[type].findUnique).mockResolvedValue(pendingRow);
        asMock(delegates[type].update).mockResolvedValue({
          id: 'item-1',
          status: 'APPROVED',
          isPublic: type === 'videos',
        });

        const res = await asAdmin(
          request(app)
            .patch(`/admin/api/moderation/${type}/item-1`)
            .send({ decision: 'APPROVED', approvalNote: 'Looks good' })
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(delegates[type].update).toHaveBeenCalledWith({
          where: { id: 'item-1' },
          data: expect.objectContaining({ status: 'APPROVED' }),
        });
      }
    );

    it('accepts the legacy action payload and keeps the old video response keys', async () => {
      asMock(delegates.videos.findUnique).mockResolvedValue(pendingRow);
      asMock(delegates.videos.update).mockResolvedValue({
        id: 'item-1',
        status: 'APPROVED',
        isPublic: true,
      });

      const res = await asAdmin(
        request(app).patch('/admin/api/moderation/videos/item-1').send({ action: 'approve' })
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'Success',
        isPublic: true,
        video: { id: 'item-1', status: 'APPROVED' },
      });
      expect(delegates.videos.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          isPublic: true,
          reviewNote: null,
          reviewedBy: 'admin',
        }),
      });
    });

    it('maps action "changes" onto a change request', async () => {
      asMock(delegates.resumes.findUnique).mockResolvedValue(pendingRow);
      asMock(delegates.resumes.update).mockResolvedValue({ id: 'item-1', status: 'CHANGES_REQUESTED' });

      const res = await asAdmin(
        request(app)
          .patch('/admin/api/moderation/resumes/item-1')
          .send({ action: 'changes', reason: 'Add the missing page' })
      );

      expect(res.status).toBe(200);
      expect(delegates.resumes.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          status: 'CHANGES_REQUESTED',
          reviewNote: 'Add the missing page',
        }),
      });
    });

    it.each<ModerationTestType>(['videos', 'resumes', 'certificates', 'achievements', 'projects'])(
      'returns 404 for an unknown %s item',
      async (type) => {
        asMock(delegates[type].findUnique).mockResolvedValue(null);

        const res = await asAdmin(
          request(app).patch(`/admin/api/moderation/${type}/missing`).send({ action: 'approve' })
        );

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('NOT_FOUND');
      }
    );

    it('returns 404 for an unknown moderation type', async () => {
      const res = await asAdmin(
        request(app).patch('/admin/api/moderation/widgets/item-1').send({ action: 'approve' })
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('returns 400 when the decision is missing', async () => {
      const res = await asAdmin(request(app).patch('/admin/api/moderation/videos/item-1').send({}));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.details).toEqual([{ field: 'action', message: expect.any(String) }]);
      expect(delegates.videos.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /moderation/:type/:id/visibility', () => {
    it('hides an approved item', async () => {
      asMock(delegates.certificates.findUnique).mockResolvedValue({
        id: 'item-1',
        status: 'APPROVED',
        isPublic: true,
        fileDriveId: null,
      });
      asMock(delegates.certificates.update).mockResolvedValue({ id: 'item-1', isPublic: false });

      const res = await asAdmin(
        request(app)
          .patch('/admin/api/moderation/certificates/item-1/visibility')
          .send({ isPublic: false })
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(delegates.certificates.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { isPublic: false },
      });
    });

    it('keeps the legacy video response body', async () => {
      asMock(delegates.videos.findUnique).mockResolvedValue({
        id: 'item-1',
        status: 'APPROVED',
        isPublic: false,
        driveFileId: null,
        student: null,
        publishedAt: null,
      });
      asMock(delegates.videos.update).mockResolvedValue({ id: 'item-1', isPublic: true });

      const res = await asAdmin(
        request(app).patch('/admin/api/moderation/videos/item-1/visibility').send({ isPublic: true })
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        video: { id: 'item-1' },
        message: 'Video is now visible on the public page.',
      });
    });

    it('refuses to publish an item that was not approved', async () => {
      asMock(delegates.projects.findUnique).mockResolvedValue({ id: 'item-1', status: 'PENDING', isPublic: false });

      const res = await asAdmin(
        request(app).patch('/admin/api/moderation/projects/item-1/visibility').send({ isPublic: true })
      );

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
      expect(delegates.projects.update).not.toHaveBeenCalled();
    });

    it('returns 400 when isPublic is not a boolean', async () => {
      const res = await asAdmin(
        request(app).patch('/admin/api/moderation/projects/item-1/visibility').send({ isPublic: 'yes' })
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /moderation/:type/:id', () => {
    it('removes the record and its Drive file', async () => {
      asMock(delegates.certificates.findUnique).mockResolvedValue({
        id: 'item-1',
        status: 'APPROVED',
        isPublic: true,
        fileDriveId: 'drive-file-1',
      });
      asMock(delegates.certificates.delete).mockResolvedValue({ id: 'item-1' });

      const res = await asAdmin(request(app).delete('/admin/api/moderation/certificates/item-1'));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(asMock(driveService.deleteFileById)).toHaveBeenCalledWith('drive-file-1');
      expect(delegates.certificates.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        select: { id: true },
      });
    });

    it('returns 404 when the record is gone', async () => {
      asMock(delegates.projects.findUnique).mockResolvedValue(null);

      const res = await asAdmin(request(app).delete('/admin/api/moderation/projects/missing'));

      expect(res.status).toBe(404);
      expect(delegates.projects.delete).not.toHaveBeenCalled();
    });
  });

  describe('POST /moderation/:type/:id/request-changes', () => {
    it('records the note and responds with the portal body', async () => {
      asMock(delegates.resumes.findUnique).mockResolvedValue(pendingRow);
      asMock(delegates.resumes.update).mockResolvedValue({ id: 'item-1', status: 'CHANGES_REQUESTED' });

      const res = await asAdmin(
        request(app)
          .post('/admin/api/moderation/resumes/item-1/request-changes')
          .send({ note: 'Please add page two' })
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Changes requested' });
      expect(delegates.resumes.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          status: 'CHANGES_REQUESTED',
          reviewNote: 'Please add page two',
        }),
      });
    });

    it('returns 404 for an unknown type', async () => {
      const res = await asAdmin(
        request(app).post('/admin/api/moderation/widgets/item-1/request-changes').send({ note: 'x' })
      );

      expect(res.status).toBe(404);
    });
  });
});
