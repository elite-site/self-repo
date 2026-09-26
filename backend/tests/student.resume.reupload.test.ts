import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { driveService } from '../src/services/drive.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
    },
    resume: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    submission: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    introVideo: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/services/drive.service', () => ({
  driveService: {
    uploadFile: vi.fn(),
    uploadSubmissionFiles: vi.fn(),
    deleteVideo: vi.fn(),
    deleteFileById: vi.fn(),
    cleanupFailedUpload: vi.fn(),
    streamDriveFile: vi.fn(),
    getWatchUrl: vi.fn().mockImplementation((id: string) => id ? `https://drive.google.com/file/d/${id}/view` : null),
    getPreviewUrl: vi.fn().mockImplementation((id: string) => id ? `https://drive.google.com/file/d/${id}/preview` : null),
  },
}));

const studentPayload = {
  studentId: 'stud_123',
  rollNo: '23K61A1201',
  name: 'Test Student',
  email: 'test@sasi.ac.in',
};

const token = jwt.sign(studentPayload, env.STUDENT_JWT_SECRET);

describe('Resume and Intro Video Reupload Persistence & Cache Invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Resume Upload and Reupload', () => {
    it('uploads resume A, writes to drive storage, and updates DB pointer', async () => {
      (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'stud_123',
        rollNo: '23K61A1201',
        name: 'Test Student',
        year: 3,
        section: 'A',
      });
      (prisma.resume.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (driveService.uploadFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('drive_resume_A');
      (prisma.resume.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'res_1',
        studentId: 'stud_123',
        driveFileId: 'drive_resume_A',
        filename: 'resume_v1.pdf',
        sizeMb: 1.2,
        status: 'APPROVED',
        submittedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/student/resume')
        .set('Cookie', `pc_student_session=${token}`)
        .attach('resume', Buffer.from('%PDF-1.4 mock content A'), 'resume_v1.pdf');

      expect(res.status).toBe(201);
      expect(driveService.uploadFile).toHaveBeenCalled();
      expect(prisma.resume.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: 'stud_123',
          driveFileId: 'drive_resume_A',
          filename: 'resume_v1.pdf',
          status: 'APPROVED',
          isPublic: true,
        }),
      });
      expect(res.body.driveFileId).toBeUndefined();
      expect(res.body.fileUrl).toBe('/api/public/media/resume/res_1');
      expect(res.body.viewUrl).toBe('/api/public/media/resume/res_1');
    });

    it('reuploads resume B, cleans up old drive file, updates DB pointer to new file B and resets status', async () => {
      (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'stud_123',
        rollNo: '23K61A1201',
        name: 'Test Student',
        year: 3,
        section: 'A',
      });
      (prisma.resume.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'res_1',
        studentId: 'stud_123',
        driveFileId: 'drive_resume_A',
        filename: 'resume_v1.pdf',
        status: 'APPROVED',
      });
      (driveService.cleanupFailedUpload as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (driveService.uploadFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('drive_resume_B');
      (prisma.resume.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'res_1',
        studentId: 'stud_123',
        driveFileId: 'drive_resume_B',
        filename: 'resume_v2.pdf',
        sizeMb: 1.5,
        status: 'APPROVED',
        submittedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/student/resume')
        .set('Cookie', `pc_student_session=${token}`)
        .attach('resume', Buffer.from('%PDF-1.4 mock content B'), 'resume_v2.pdf');

      expect(res.status).toBe(201);
      // Confirmed: old file cleaned up
      expect(driveService.cleanupFailedUpload).toHaveBeenCalledWith(['drive_resume_A']);
      // Confirmed: new file uploaded
      expect(driveService.uploadFile).toHaveBeenCalled();
      // Confirmed: database record updated to point to drive_resume_B
      expect(prisma.resume.update).toHaveBeenCalledWith({
        where: { id: 'res_1' },
        data: expect.objectContaining({
          driveFileId: 'drive_resume_B',
          filename: 'resume_v2.pdf',
          status: 'APPROVED',
          isPublic: true,
        }),
      });
      expect(res.body.driveFileId).toBeUndefined();
      expect(res.body.fileUrl).toBe('/api/public/media/resume/res_1');
      expect(res.body.viewUrl).toBe('/api/public/media/resume/res_1');
    });

    it('rejects a non-PDF resume with a 400 the UI can display, storing nothing', async () => {
      const res = await request(app)
        .post('/api/student/resume')
        .set('Cookie', `pc_student_session=${token}`)
        .attach('resume', Buffer.from('not really a pdf'), 'resume.png');

      // A rejected MIME type is the caller's mistake, so it must not surface as
      // a 500 server fault.
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/PDF/i);
      expect(driveService.uploadFile).not.toHaveBeenCalled();
      expect(prisma.resume.create).not.toHaveBeenCalled();
    });

    it('GET /api/student/resume maps fileUrl for each resume record', async () => {
      (prisma.resume.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'res_1',
          studentId: 'stud_123',
          driveFileId: 'drive_resume_B',
          filename: 'resume_v2.pdf',
          status: 'PENDING',
          submittedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/student/resume')
        .set('Cookie', `pc_student_session=${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].fileUrl).toBe('/api/public/media/resume/res_1');
      expect(res.body[0].viewUrl).toBe('/api/public/media/resume/res_1');
      expect(res.body[0].driveFileId).toBeUndefined();
    });
  });

  describe('2. Intro Video Reupload and Admin Sync', () => {
    it('video submission synchronizes both Submission and IntroVideo tables with the new file', async () => {
      (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'stud_123',
        rollNo: '23K61A1201',
        name: 'Test Student',
        year: 3,
        section: 'A',
        branch: 'IT',
      });
      (prisma.submission.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub_1',
        rollNo: '23K61A1201',
        videoDriveId: 'video_old',
        driveFolderPath: 'Events/2026/3-A/IT_23K61A1201_Test',
      });
      (driveService.deleteVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (driveService.deleteFileById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (driveService.uploadSubmissionFiles as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        videoDriveId: 'video_new_123',
        driveFolderPath: 'Events/2026/3-A/IT_23K61A1201_Test',
      });
      (prisma.submission.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub_1',
        videoDriveId: 'video_new_123',
        status: 'SUBMITTED',
      });
      (prisma.introVideo.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'iv_1',
        studentId: 'stud_123',
        driveFileId: 'video_old',
      });
      // A second, superseded row from an earlier take still exists.
      (prisma.introVideo.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'iv_0', driveFileId: 'video_ancient' },
      ]);
      (prisma.introVideo.deleteMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.introVideo.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'iv_1',
        driveFileId: 'video_new_123',
        status: 'PENDING',
      });

      const res = await request(app)
        .post('/api/student/submission')
        .set('Cookie', `pc_student_session=${token}`)
        .attach('video', Buffer.from('000000186674797069736f6d000000006d703432', 'hex'), 'intro.mp4');

      expect(res.status).toBe(201);
      // Confirmed: the superseded files are removed from storage
      expect(driveService.deleteFileById).toHaveBeenCalledWith(
        'video_old',
        'Events/2026/3-A/IT_23K61A1201_Test'
      );
      // Confirmed: the leftover row (and its orphaned file) is purged too
      expect(prisma.introVideo.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['iv_0'] } } });
      expect(driveService.deleteFileById).toHaveBeenCalledWith(
        'video_ancient',
        'Events/2026/3-A/IT_23K61A1201_Test'
      );
      // Confirmed: the new file is never deleted as part of its own cleanup
      expect(driveService.deleteFileById).not.toHaveBeenCalledWith(
        'video_new_123',
        expect.anything()
      );
      // Confirmed: Submission table updated with new videoDriveId
      expect(prisma.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            videoDriveId: 'video_new_123',
            status: 'SUBMITTED',
          }),
        })
      );
      // Confirmed: IntroVideo table also updated so Admin Moderation queue sees it
      expect(prisma.introVideo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            driveFileId: 'video_new_123',
            status: 'PENDING',
          }),
        })
      );
      // Confirmed: a replacement is un-published and must be approved again
      // before it can appear on the public page
      expect(prisma.introVideo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublic: false,
            publishedAt: null,
            changeRequestedAt: null,
            changeRequestNote: null,
          }),
        })
      );
    });

    it('video streaming endpoint sets no-cache and ETag matching the active driveFileId', async () => {
      (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'stud_123',
        rollNo: '23K61A1201',
      });
      (prisma.submission.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub_1',
        rollNo: '23K61A1201',
        videoDriveId: 'video_new_123',
        driveFolderPath: 'path',
      });

      const { Readable } = await import('stream');
      (driveService.streamDriveFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        stream: Readable.from([Buffer.from('video data')]),
        mimeType: 'video/mp4',
        size: 10,
      });

      const res = await request(app)
        .get('/api/student/submission/media/video')
        .set('Cookie', `pc_student_session=${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toContain('no-cache');
      expect(res.headers['etag']).toBe('"video_new_123"');
    });
  });
});
