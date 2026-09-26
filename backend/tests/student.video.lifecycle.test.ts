import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Readable } from 'stream';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { driveService } from '../src/services/drive.service';
import { parseRange } from '../src/utils/rangeParser';

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
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    introVideo: {
      findFirst: vi.fn(),
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
    streamUploadToDrive: vi.fn(),
    streamDriveFile: vi.fn(),
    deleteVideo: vi.fn(),
  },
}));

vi.mock('../src/services/activity.service', () => ({
  ActivityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

const studentPayload = {
  studentId: 'student_video_test_id',
  rollNo: '23K61A1299',
  name: 'Test Student Lifecycle',
  email: 'lifecycle@sasi.ac.in',
};

const token = jwt.sign(studentPayload, env.STUDENT_JWT_SECRET, { expiresIn: '2h' });

describe('Student Video Upload & Playback Lifecycle Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Step 1: Student uploads video -> Video saved permanently in DB & Drive', async () => {
    (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: studentPayload.studentId,
      rollNo: studentPayload.rollNo,
      name: studentPayload.name,
      email: studentPayload.email,
      year: 2,
      section: 'A',
      branch: 'IT',
    });

    (prisma.event.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'self-introduction-2026',
      status: 'OPEN',
    });

    (prisma.submission.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    (driveService.resolveStudentFolder as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      folderId: 'folder_123',
      relativePath: 'Self Introduction/2026/2-A/23K61A1299_Test Student',
    });

    (driveService.createResumableUploadSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    (driveService.streamUploadToDrive as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('drive_video_permanent_id_123');

    (prisma.submission.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sub_permanent_1',
      rollNo: studentPayload.rollNo,
      videoDriveId: 'drive_video_permanent_id_123',
      status: 'SUBMITTED',
      submittedAt: new Date(),
    });

    (prisma.introVideo.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.introVideo.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'intro_video_1',
      driveFileId: 'drive_video_permanent_id_123',
    });

    const videoBuffer = Buffer.from('mock video bytes for streaming test');

    const res = await request(app)
      .post('/api/student/submission/video-stream')
      .set('Cookie', `pc_student_session=${token}`)
      .set('Content-Type', 'video/mp4')
      .set('Content-Length', String(videoBuffer.length))
      .set('X-Filename', 'my_intro_video.mp4')
      .send(videoBuffer);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.videoDriveId).toBe('drive_video_permanent_id_123');

    // Verify submission creation in database
    expect(prisma.submission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rollNo: studentPayload.rollNo,
          videoDriveId: 'drive_video_permanent_id_123',
          status: 'SUBMITTED',
        }),
      }),
    );

    // Verify introVideo sync
    expect(prisma.introVideo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: studentPayload.studentId,
          driveFileId: 'drive_video_permanent_id_123',
        }),
      }),
    );
  });

  it('Step 2 & 3: Play, Pause, Replay, Seek -> HTTP Range and no-cache streaming', async () => {
    (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: studentPayload.studentId,
      rollNo: studentPayload.rollNo,
    });

    (prisma.submission.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sub_permanent_1',
      rollNo: studentPayload.rollNo,
      videoDriveId: 'drive_video_permanent_id_123',
      driveFolderPath: 'path/to/folder',
      submittedAt: new Date(),
    });

    const mockVideoData = Buffer.alloc(5000, 'a');
    (driveService.streamDriveFile as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (_fileId: string, _path?: string, range?: string) => {
        let streamData = mockVideoData;
        if (range) {
          const parsed = parseRange(range, mockVideoData.length);
          if (parsed) {
            streamData = mockVideoData.subarray(parsed.start, parsed.end + 1);
          } else {
            streamData = Buffer.alloc(0);
          }
        }
        return {
          stream: Readable.from([streamData]),
          mimeType: 'video/mp4',
          size: mockVideoData.length,
        };
      },
    );

    // Initial stream / Play
    const streamRes = await request(app)
      .get('/api/student/submission/media/video')
      .set('Cookie', `pc_student_session=${token}`);

    expect(streamRes.status).toBe(200);
    expect(streamRes.headers['content-type']).toContain('video/mp4');
    expect(streamRes.headers['accept-ranges']).toBe('bytes');
    expect(streamRes.headers['cache-control']).toContain('no-cache');
    expect(streamRes.headers['etag']).toBe('"drive_video_permanent_id_123"');

    // Seeking (Range header)
    const rangeRes = await request(app)
      .get('/api/student/submission/media/video')
      .set('Cookie', `pc_student_session=${token}`)
      .set('Range', 'bytes=1000-2000');

    expect(rangeRes.status).toBe(206);
    expect(rangeRes.headers['content-range']).toBe('bytes 1000-2000/5000');
    expect(rangeRes.headers['content-length']).toBe('1001');

    // Suffix range (e.g. Chrome/Safari probing MP4 moov metadata atom at end of file)
    const suffixRangeRes = await request(app)
      .get('/api/student/submission/media/video')
      .set('Cookie', `pc_student_session=${token}`)
      .set('Range', 'bytes=-500');

    expect(suffixRangeRes.status).toBe(206);
    expect(suffixRangeRes.headers['content-range']).toBe('bytes 4500-4999/5000');
    expect(suffixRangeRes.headers['content-length']).toBe('500');

    // Unsatisfiable range -> 416
    const invalidRangeRes = await request(app)
      .get('/api/student/submission/media/video')
      .set('Cookie', `pc_student_session=${token}`)
      .set('Range', 'bytes=99999-');

    expect(invalidRangeRes.status).toBe(416);
    expect(invalidRangeRes.headers['content-range']).toBe('bytes */5000');

    // Token query param support (for HTML5 <video src="...">)
    const tokenQueryRes = await request(app)
      .get(`/api/student/submission/media/video?token=${token}`);
    expect(tokenQueryRes.status).toBe(200);

    // Download own video (?download=1)
    const downloadRes = await request(app)
      .get('/api/student/submission/media/video?download=1')
      .set('Cookie', `pc_student_session=${token}`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-disposition']).toContain('attachment');
    expect(downloadRes.headers['content-disposition']).toContain('self-introduction_23K61A1299.mp4');
  });

  it('Step 4 & 5: Logout -> Login again -> Same video automatically appears for playback', async () => {
    // 1. Verify /me returns no-store and videoUploaded=true
    (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: studentPayload.studentId,
      rollNo: studentPayload.rollNo,
      name: studentPayload.name,
      email: studentPayload.email,
      year: 2,
      section: 'A',
      branch: 'IT',
      status: 'ACTIVE',
      graduatedAt: null,
    });

    (prisma.submission.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sub_permanent_1',
      rollNo: studentPayload.rollNo,
      videoDriveId: 'drive_video_permanent_id_123',
      status: 'SUBMITTED',
      submittedAt: new Date('2026-09-25T10:00:00Z'),
    });

    const meRes = await request(app)
      .get('/api/student/me')
      .set('Cookie', `pc_student_session=${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.headers['cache-control']).toContain('no-store');
    expect(meRes.body.student.submission.videoUploaded).toBe(true);
    expect(meRes.body.student.submission.status).toBe('SUBMITTED');

    // 2. Student logs out
    const logoutRes = await request(app).post('/api/student/logout');
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // 3. Student logs in again -> calls /me
    const loginAgainRes = await request(app)
      .get('/api/student/me')
      .set('Cookie', `pc_student_session=${token}`);

    expect(loginAgainRes.status).toBe(200);
    expect(loginAgainRes.body.student.submission.videoUploaded).toBe(true);

    // 4. Video is ready to Play again
    const sameMockData = Buffer.alloc(5000, 'b');
    (driveService.streamDriveFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      stream: Readable.from([sameMockData]),
      mimeType: 'video/mp4',
      size: sameMockData.length,
    });

    const playAgainRes = await request(app)
      .get('/api/student/submission/media/video')
      .set('Cookie', `pc_student_session=${token}`);

    expect(playAgainRes.status).toBe(200);
    expect(playAgainRes.headers['etag']).toBe('"drive_video_permanent_id_123"');
  });
});
