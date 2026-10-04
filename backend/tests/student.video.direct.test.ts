import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { driveService } from '../src/services/drive.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    submission: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    introVideo: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/services/drive.service', () => ({
  driveService: {
    resolveStudentFolder: vi.fn(),
    createResumableUploadSession: vi.fn(),
    verifyUploadedVideoFile: vi.fn(),
    deleteFileById: vi.fn(),
    generateThumbnail: vi.fn(),
    isUsingMock: false,
  },
}));

vi.mock('../src/services/activity.service', () => ({
  ActivityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

const STUDENT = {
  id: 'stud_direct_1',
  rollNo: '23K61A1299',
  name: 'Direct Upload Student',
  email: 'direct@sasi.ac.in',
  year: 2,
  section: 'A',
  branch: 'IT',
  status: 'ACTIVE',
  graduatedAt: null,
};

const token = jwt.sign(
  { studentId: STUDENT.id, rollNo: STUDENT.rollNo, name: STUDENT.name, email: STUDENT.email },
  env.STUDENT_JWT_SECRET,
  { expiresIn: '2h' },
);

const signIn = (req: request.Test) => req.set('Cookie', `pc_student_session=${token}`);

describe('Direct-to-Drive Video Upload Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.student.findUnique as any).mockResolvedValue(STUDENT);
  });

  describe('POST /api/student/submission/video-session', () => {
    it('requires authentication', async () => {
      const res = await request(app).post('/api/student/submission/video-session').send({
        fileName: 'intro.mp4',
        fileSize: 5 * 1024 * 1024,
        mimeType: 'video/mp4',
      });
      expect(res.status).toBe(401);
    });

    it('validates file size within MAX_VIDEO_SIZE_MB', async () => {
      const oversized = (env.MAX_VIDEO_SIZE_MB + 5) * 1024 * 1024;
      const res = await signIn(
        request(app).post('/api/student/submission/video-session').send({
          fileName: 'intro.mp4',
          fileSize: oversized,
          mimeType: 'video/mp4',
        }),
      );
      expect(res.status).toBe(413);
      expect(res.body.error).toBe('FILE_TOO_LARGE');
    });

    it('rejects unsupported mime types or extensions', async () => {
      const res = await signIn(
        request(app).post('/api/student/submission/video-session').send({
          fileName: 'intro.pdf',
          fileSize: 1024 * 1024,
          mimeType: 'application/pdf',
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 501 in mock mode so client falls back to video-stream', async () => {
      (driveService as any).isUsingMock = true;

      const res = await signIn(
        request(app).post('/api/student/submission/video-session').send({
          fileName: 'intro.mp4',
          fileSize: 5 * 1024 * 1024,
          mimeType: 'video/mp4',
        }),
      );
      expect(res.status).toBe(501);
      expect(res.body.sessionUrl).toBeNull();
    });

    it('creates resumable upload session with origin and returns sessionUrl and chunkSize', async () => {
      (driveService as any).isUsingMock = false;
      (driveService.resolveStudentFolder as any).mockResolvedValue({
        folderId: 'folder_test_123',
        relativePath: 'Self Introduction/2026/2-A/23K61A1299_Direct Upload Student',
      });
      (driveService.createResumableUploadSession as any).mockResolvedValue(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=mock_session_456',
      );

      const res = await signIn(
        request(app)
          .post('/api/student/submission/video-session')
          .set('Origin', 'https://self-intro-portal.vercel.app')
          .send({
            fileName: 'intro.mp4',
            fileSize: 12 * 1024 * 1024,
            mimeType: 'video/mp4',
          }),
      );

      expect(res.status).toBe(200);
      expect(res.body.sessionUrl).toBe(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=mock_session_456',
      );
      expect(res.body.chunkSize).toBe(8 * 1024 * 1024);

      expect(driveService.createResumableUploadSession).toHaveBeenCalledWith(
        '23K61A1299_video.mp4',
        'video/mp4',
        12 * 1024 * 1024,
        'folder_test_123',
        'https://self-intro-portal.vercel.app',
      );
    });
  });

  describe('POST /api/student/submission/video-complete', () => {
    it('requires authentication', async () => {
      const res = await request(app).post('/api/student/submission/video-complete').send({
        driveFileId: 'drive_uploaded_file_789',
      });
      expect(res.status).toBe(401);
    });

    it('validates presence of driveFileId', async () => {
      const res = await signIn(
        request(app).post('/api/student/submission/video-complete').send({}),
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('verifies file in Drive and deletes file if verification fails', async () => {
      (driveService.resolveStudentFolder as any).mockResolvedValue({
        folderId: 'folder_test_123',
        relativePath: 'Self Introduction/2026/2-A/23K61A1299_Direct Upload Student',
      });
      (driveService.verifyUploadedVideoFile as any).mockResolvedValue({
        valid: false,
        error: 'File parent directory does not match expected student folder.',
      });

      const res = await signIn(
        request(app).post('/api/student/submission/video-complete').send({
          driveFileId: 'drive_invalid_parent_file',
        }),
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(driveService.deleteFileById).toHaveBeenCalledWith(
        'drive_invalid_parent_file',
        'Self Introduction/2026/2-A/23K61A1299_Direct Upload Student',
      );
    });

    it('records submission in DB and syncs introVideo when file verification succeeds', async () => {
      (driveService.resolveStudentFolder as any).mockResolvedValue({
        folderId: 'folder_test_123',
        relativePath: 'Self Introduction/2026/2-A/23K61A1299_Direct Upload Student',
      });
      (driveService.verifyUploadedVideoFile as any).mockResolvedValue({
        valid: true,
        fileMeta: {
          name: '23K61A1299_video.mp4',
          size: 15 * 1024 * 1024,
          mimeType: 'video/mp4',
        },
      });
      (prisma.event.findUnique as any).mockResolvedValue({ id: 'self-introduction-2026', status: 'OPEN' });
      (prisma.submission.findFirst as any).mockResolvedValue(null);
      (prisma.submission.create as any).mockResolvedValue({
        id: 'sub_direct_1',
        rollNo: STUDENT.rollNo,
        videoDriveId: 'drive_verified_123',
        status: 'SUBMITTED',
      });
      (prisma.introVideo.findFirst as any).mockResolvedValue(null);
      (prisma.introVideo.create as any).mockResolvedValue({
        id: 'iv_direct_1',
        studentId: STUDENT.id,
        driveFileId: 'drive_verified_123',
      });

      const res = await signIn(
        request(app).post('/api/student/submission/video-complete').send({
          driveFileId: 'drive_verified_123',
        }),
      );

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBe('sub_direct_1');
      expect(res.body.videoDriveId).toBe('drive_verified_123');
      expect(prisma.submission.create).toHaveBeenCalled();
      expect(prisma.introVideo.create).toHaveBeenCalled();
    });
  });
});
