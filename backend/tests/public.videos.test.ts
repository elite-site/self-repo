import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { Readable } from 'stream';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { driveService } from '../src/services/drive.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    introVideo: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    submission: {
      findUnique: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/services/drive.service', () => ({
  driveService: {
    streamDriveFile: vi.fn(),
    deleteFileById: vi.fn(),
    deleteVideo: vi.fn(),
  },
}));

const studentToken = jwt.sign(
  { studentId: 'stud_1', rollNo: '23K61A1201', name: 'Test Student' },
  env.STUDENT_JWT_SECRET,
  { expiresIn: '1h' },
);

const adminToken = jwt.sign({ userId: 'admin-1', username: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });

const publishedVideo = {
  id: 'iv_public',
  submittedAt: new Date('2026-01-05T10:00:00Z'),
  publishedAt: new Date('2026-01-06T10:00:00Z'),
  sizeMb: 12.5,
  student: { name: 'Test Student', rollNo: '23K61A1201', year: 3, section: 'A' },
};

const streamRow = {
  id: 'iv_public',
  driveFileId: 'drive_123',
  student: { rollNo: '23K61A1201' },
};

describe('Public introduction videos are approval-gated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/public/videos', () => {
    it('lists only approved + published videos, and never exposes a Drive file id', async () => {
      (prisma.introVideo.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([publishedVideo]);
      (prisma.introVideo.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const res = await request(app).get('/api/public/videos');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        id: 'iv_public',
        name: 'Test Student',
        rollNo: '23K61A1201',
        streamUrl: '/api/public/videos/stream/iv_public',
        profileUrl: '/students/23K61A1201',
      });
      expect(JSON.stringify(res.body)).not.toContain('drive_123');

      // The query itself is the gate: APPROVED status AND published.
      expect(prisma.introVideo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'APPROVED',
            isPublic: true,
            isActive: true,
            driveFileId: { not: null },
          }),
        })
      );
    });

    it('returns an empty list while no video is approved', async () => {
      (prisma.introVideo.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.introVideo.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const res = await request(app).get('/api/public/videos');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [], total: 0 });
    });

    it('does not require authentication', async () => {
      (prisma.introVideo.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.introVideo.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const res = await request(app).get('/api/public/videos');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/public/videos/stream/:id', () => {
    it('refuses to stream a video that is not approved and published', async () => {
      (prisma.introVideo.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const res = await request(app).get('/api/public/videos/stream/iv_pending');

      expect(res.status).toBe(404);
      expect(driveService.streamDriveFile).not.toHaveBeenCalled();
    });

    it('streams a published video and supports Range requests for seeking', async () => {
      (prisma.introVideo.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(streamRow);
      (driveService.streamDriveFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        stream: Readable.from([Buffer.alloc(6, 1)]),
        mimeType: 'video/mp4',
        size: 10,
        contentRange: { start: 0, end: 5, total: 10 },
      });

      const res = await request(app)
        .get('/api/public/videos/stream/iv_public')
        .set('Range', 'bytes=0-5');

      expect(res.status).toBe(206);
      expect(res.headers['content-range']).toBe('bytes 0-5/10');
      expect(res.headers['content-length']).toBe('6');
      expect(res.headers['accept-ranges']).toBe('bytes');
      expect(driveService.streamDriveFile).toHaveBeenCalledWith('drive_123', undefined, 'bytes=0-5');
    });
  });

  describe('PATCH /api/student/submission/video-visibility', () => {
    it('refuses to publish a video that has not been approved', async () => {
      (prisma.introVideo.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'iv_pending',
        status: 'PENDING',
        driveFileId: 'drive_123',
        isPublic: false,
      });

      const res = await request(app)
        .patch('/api/student/submission/video-visibility')
        .set('Cookie', `pc_student_session=${studentToken}`)
        .send({ isPublic: true });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('NOT_APPROVED');
      expect(prisma.introVideo.update).not.toHaveBeenCalled();
    });

    it('publishes an approved video', async () => {
      (prisma.introVideo.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'iv_approved',
        status: 'APPROVED',
        driveFileId: 'drive_123',
        isPublic: false,
      });
      (prisma.introVideo.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'iv_approved',
        isPublic: true,
        publishedAt: new Date('2026-01-06T10:00:00Z'),
        status: 'APPROVED',
      });

      const res = await request(app)
        .patch('/api/student/submission/video-visibility')
        .set('Cookie', `pc_student_session=${studentToken}`)
        .send({ isPublic: true });

      expect(res.status).toBe(200);
      expect(res.body.isPublic).toBe(true);
      expect(prisma.introVideo.update).toHaveBeenCalledWith({
        where: { id: 'iv_approved' },
        data: { isPublic: true, publishedAt: expect.any(Date) },
        select: expect.anything(),
      });
    });
  });

  describe('Admin video actions', () => {
    it('requesting a new video keeps the current file and notifies the student', async () => {
      (prisma.submission.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub_1',
        rollNo: '23K61A1201',
        name: 'Test Student',
        eventId: 'self-introduction-2026',
        email: 'test@sasi.ac.in',
        videoDriveId: 'drive_123',
      });
      (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'stud_1' });
      (prisma.introVideo.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'iv_1',
        isPublic: true,
      });
      (prisma.introVideo.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'iv_1' });
      (prisma.notification.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'n_1' });

      const res = await request(app)
        .post('/admin/api/submissions/sub_1/request-video')
        .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`])
        .send({ reason: 'Audio is unclear' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Marked as needing a new take, but not unpublished and not deleted.
      expect(prisma.introVideo.update).toHaveBeenCalledWith({
        where: { id: 'iv_1' },
        data: expect.objectContaining({
          status: 'CHANGES_REQUESTED',
          changeRequestNote: 'Audio is unclear',
          changeRequestedAt: expect.any(Date),
        }),
      });
      expect(driveService.deleteVideo).not.toHaveBeenCalled();
      expect(driveService.deleteFileById).not.toHaveBeenCalled();

      // The student is notified and the link points at the video page.
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: 'stud_1',
          type: 'MODERATION',
          actionUrl: '/intro-video',
          message: expect.stringContaining('Audio is unclear'),
        }),
      });
    });

    it('approving a video publishes it, rejecting it takes it down the public page', async () => {
      (prisma.introVideo.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'iv_1',
        status: 'PENDING',
        isPublic: false,
        publishedAt: null,
        student: { id: 'stud_1', name: 'Test Student' },
      });
      (prisma.introVideo.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'iv_1',
        status: 'APPROVED',
        isPublic: true,
      });
      (prisma.notification.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'n_1' });

      const approve = await request(app)
        .patch('/admin/api/moderation/videos/iv_1')
        .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`])
        .send({ action: 'approve' });

      expect(approve.status).toBe(200);
      expect(prisma.introVideo.update).toHaveBeenCalledWith({
        where: { id: 'iv_1' },
        data: expect.objectContaining({ status: 'APPROVED', isPublic: true }),
      });

      const reject = await request(app)
        .patch('/admin/api/moderation/videos/iv_1')
        .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`])
        .send({ action: 'reject', reason: 'Blurred' });

      expect(reject.status).toBe(200);
      expect(prisma.introVideo.update).toHaveBeenLastCalledWith({
        where: { id: 'iv_1' },
        data: expect.objectContaining({ status: 'REJECTED', isPublic: false, publishedAt: null }),
      });
    });

    it('only an approved video can be published by an admin', async () => {
      (prisma.introVideo.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'iv_1',
        status: 'PENDING',
        isPublic: false,
      });

      const res = await request(app)
        .patch('/admin/api/moderation/videos/iv_1/visibility')
        .set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`])
        .send({ isPublic: true });

      expect(res.status).toBe(409);
      expect(prisma.introVideo.update).not.toHaveBeenCalled();
    });
  });
});
