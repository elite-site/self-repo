import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { driveService } from '../src/services/drive.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    student: {
      findUnique: vi.fn(),
    },
    submission: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    introVideo: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
  },
}));

const mock = (fn: unknown) => fn as unknown as ReturnType<typeof vi.fn>;

const student = { id: 'stud_1', rollNo: '23K61A1201', name: 'Test Student' };
const token = jwt.sign(
  { studentId: student.id, rollNo: student.rollNo, name: student.name },
  env.STUDENT_JWT_SECRET,
);

describe('DELETE /api/student/submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the submission and the active intro video, and removes the stored file', async () => {
    mock(prisma.student.findUnique).mockResolvedValue(student);
    mock(prisma.submission.findMany).mockResolvedValue([
      { id: 'sub_1', videoDriveId: 'drive_video_1', driveFolderPath: '2026/Test' },
    ]);
    mock(prisma.introVideo.findMany).mockResolvedValue([{ id: 'iv_1', driveFileId: 'drive_video_1' }]);
    mock(prisma.$transaction).mockResolvedValue([]);

    const res = await request(app)
      .delete('/api/student/submission')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.submission.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['sub_1'] } } });
    expect(prisma.introVideo.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['iv_1'] } } });
    // The moderation queue must not be left pointing at a file that is gone.
    expect(driveService.deleteFileById).toHaveBeenCalledWith('drive_video_1', '2026/Test');
  });

  it('scopes the delete to the caller so one student cannot remove another\'s video', async () => {
    mock(prisma.student.findUnique).mockResolvedValue(student);
    mock(prisma.submission.findMany).mockResolvedValue([]);
    mock(prisma.introVideo.findMany).mockResolvedValue([]);
    mock(prisma.$transaction).mockResolvedValue([]);

    await request(app).delete('/api/student/submission').set('Authorization', `Bearer ${token}`);

    // Both lookups are keyed on the authenticated student's own roll/id.
    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rollNo: student.rollNo } }),
    );
    expect(prisma.introVideo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: student.id } }),
    );
  });

  it('404s when there is nothing to delete', async () => {
    mock(prisma.student.findUnique).mockResolvedValue(student);
    mock(prisma.submission.findMany).mockResolvedValue([]);
    mock(prisma.introVideo.findMany).mockResolvedValue([]);

    const res = await request(app)
      .delete('/api/student/submission')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('404s for an unknown student', async () => {
    mock(prisma.student.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/student/submission')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    const res = await request(app).delete('/api/student/submission');
    expect(res.status).toBe(401);
  });
});
