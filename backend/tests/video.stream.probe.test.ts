import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Readable } from 'stream';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { driveService } from '../src/services/drive.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
    },
    submission: {
      findFirst: vi.fn(),
    },
    introVideo: {
      findFirst: vi.fn(),
    },
    studentProfile: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../src/services/drive.service', () => ({
  driveService: {
    canRedirectToDrive: vi.fn(() => true),
    getDirectLink: vi.fn((fileId?: string | null) => (fileId ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t` : null)),
    isPubliclyReadable: vi.fn(async () => true),
    setViewerPermission: vi.fn(async () => true),
    probeDirectLink: vi.fn(async () => true),
    streamDriveFile: vi.fn(),
  },
}));

const STUDENT = {
  id: 'stud_probe_1',
  rollNo: '23K61A1299',
  name: 'Probe Student',
  email: 'probe@sasi.ac.in',
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

function mockStream() {
  const stream = new Readable({
    read() {
      this.push(Buffer.from('mock-video-stream-content'));
      this.push(null);
    },
  });
  (driveService.streamDriveFile as any).mockResolvedValue({
    stream,
    mimeType: 'video/mp4',
    size: 25,
    contentRange: undefined,
  });
}

describe('Video Stream Probe and ?proxy=1 Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.student.findUnique as any).mockResolvedValue(STUDENT);
    (prisma.submission.findFirst as any).mockResolvedValue({
      videoDriveId: 'drive_video_test_file_id',
      driveFolderPath: 'Students/23K61A1299',
    });
    (driveService.canRedirectToDrive as any).mockReturnValue(true);
    (driveService.getDirectLink as any).mockImplementation((id: string) => `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`);
    (driveService.isPubliclyReadable as any).mockResolvedValue(true);
  });

  describe('GET /api/student/submission/media/video', () => {
    it('redirects (302) to Google Drive direct link when probe succeeds', async () => {
      (driveService.probeDirectLink as any).mockResolvedValue(true);

      const res = await signIn(request(app).get('/api/student/submission/media/video'));

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('drive.usercontent.google.com/download?id=drive_video_test_file_id');
      expect(driveService.probeDirectLink).toHaveBeenCalledWith(
        expect.stringContaining('drive_video_test_file_id'),
        'drive_video_test_file_id',
      );
      expect(driveService.streamDriveFile).not.toHaveBeenCalled();
    });

    it('falls back to proxy stream (200) when probe fails (e.g. 403 Forbidden)', async () => {
      (driveService.probeDirectLink as any).mockResolvedValue(false);
      mockStream();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const res = await signIn(request(app).get('/api/student/submission/media/video'));

      expect(res.status).toBe(200);
      expect(driveService.probeDirectLink).toHaveBeenCalled();
      expect(driveService.streamDriveFile).toHaveBeenCalledWith(
        'drive_video_test_file_id',
        'Students/23K61A1299',
        undefined,
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Direct link probe failed for drive_video_test_file_id'));
      warnSpy.mockRestore();
    });

    it('forces proxy stream without redirect when ?proxy=1 is requested', async () => {
      (driveService.probeDirectLink as any).mockResolvedValue(true);
      mockStream();

      const res = await signIn(request(app).get('/api/student/submission/media/video?proxy=1'));

      expect(res.status).toBe(200);
      expect(driveService.probeDirectLink).not.toHaveBeenCalled();
      expect(driveService.streamDriveFile).toHaveBeenCalledWith(
        'drive_video_test_file_id',
        'Students/23K61A1299',
        undefined,
      );
    });
  });

  describe('GET /api/public/media/video/:id', () => {
    beforeEach(() => {
      (prisma.introVideo.findFirst as any).mockResolvedValue({
        id: 'vid_pub_1',
        driveFileId: 'drive_pub_file_id',
      });
    });

    it('redirects (302) to Google Drive direct link when probe succeeds', async () => {
      (driveService.probeDirectLink as any).mockResolvedValue(true);

      const res = await request(app).get('/api/public/media/video/vid_pub_1');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('drive.usercontent.google.com/download?id=drive_pub_file_id');
      expect(driveService.probeDirectLink).toHaveBeenCalledWith(
        expect.stringContaining('drive_pub_file_id'),
        'drive_pub_file_id',
      );
      expect(driveService.streamDriveFile).not.toHaveBeenCalled();
    });

    it('falls back to proxy stream (200) when probe fails', async () => {
      (driveService.probeDirectLink as any).mockResolvedValue(false);
      mockStream();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const res = await request(app).get('/api/public/media/video/vid_pub_1');

      expect(res.status).toBe(200);
      expect(driveService.probeDirectLink).toHaveBeenCalled();
      expect(driveService.streamDriveFile).toHaveBeenCalledWith('drive_pub_file_id', undefined, undefined);
      warnSpy.mockRestore();
    });

    it('forces proxy stream and bypasses redirect probe when ?proxy=1 is passed', async () => {
      (driveService.probeDirectLink as any).mockResolvedValue(true);
      mockStream();

      const res = await request(app).get('/api/public/media/video/vid_pub_1?proxy=1');

      expect(res.status).toBe(200);
      expect(driveService.probeDirectLink).not.toHaveBeenCalled();
      expect(driveService.streamDriveFile).toHaveBeenCalledWith('drive_pub_file_id', undefined, undefined);
    });
  });
});
