import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Readable } from 'stream';
import app from '../src/server';
import { prisma } from '../src/lib/prisma';
import { driveService } from '../src/services/drive.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    certificate: {
      findUnique: vi.fn(),
    },
    achievement: {
      findUnique: vi.fn(),
    },
    resume: {
      findUnique: vi.fn(),
    },
    studentProfile: {
      findFirst: vi.fn(),
    },
    introVideo: {
      findFirst: vi.fn(),
    },
    submission: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../src/services/drive.service', () => ({
  driveService: {
    streamDriveFile: vi.fn(),
  },
}));

describe('Public Media Streaming Proxy & Drive Masking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockDriveStream(mimeType = 'application/pdf', content = 'mock content') {
    const stream = new Readable({
      read() {
        this.push(Buffer.from(content));
        this.push(null);
      },
    });
    (driveService.streamDriveFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      stream,
      mimeType,
      size: content.length,
      contentRange: undefined,
    });
  }

  it('resolves certificate by internal DB cuid and streams drive file with cache headers', async () => {
    (prisma.certificate.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'cert_cuid_123',
      fileDriveId: 'raw_drive_cert_xyz',
      title: 'AWS Certified',
    });
    mockDriveStream('application/pdf', 'mock certificate content');

    const res = await request(app).get('/api/public/media/certificate/cert_cuid_123');

    expect(res.status).toBe(200);
    expect(prisma.certificate.findUnique).toHaveBeenCalledWith({ where: { id: 'cert_cuid_123' } });
    expect(driveService.streamDriveFile).toHaveBeenCalledWith('raw_drive_cert_xyz', undefined, undefined);
    expect(res.headers['cache-control']).toBe('private, max-age=3600');
    expect(res.headers['etag']).toBe('"raw_drive_cert_xyz"');
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('resolves achievement by internal DB cuid and streams proof file', async () => {
    (prisma.achievement.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'ach_cuid_456',
      proofDriveId: 'raw_drive_ach_proof_abc',
      title: 'Hackathon Winner',
    });
    mockDriveStream('image/png', 'fake image bytes');

    const res = await request(app).get('/api/public/media/achievement/ach_cuid_456');

    expect(res.status).toBe(200);
    expect(prisma.achievement.findUnique).toHaveBeenCalledWith({ where: { id: 'ach_cuid_456' } });
    expect(driveService.streamDriveFile).toHaveBeenCalledWith('raw_drive_ach_proof_abc', undefined, undefined);
    expect(res.headers['cache-control']).toBe('private, max-age=3600');
    expect(res.headers['etag']).toBe('"raw_drive_ach_proof_abc"');
  });

  it('resolves resume by internal DB cuid and streams resume PDF', async () => {
    (prisma.resume.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'resume_cuid_789',
      driveFileId: 'raw_drive_resume_def',
      filename: 'resume.pdf',
    });
    mockDriveStream('application/pdf', '%PDF-1.4 mock resume');

    const res = await request(app).get('/api/public/media/resume/resume_cuid_789');

    expect(res.status).toBe(200);
    expect(prisma.resume.findUnique).toHaveBeenCalledWith({ where: { id: 'resume_cuid_789' } });
    expect(driveService.streamDriveFile).toHaveBeenCalledWith('raw_drive_resume_def', undefined, undefined);
    expect(res.headers['cache-control']).toBe('private, max-age=3600');
    expect(res.headers['etag']).toBe('"raw_drive_resume_def"');
  });

  it('resolves profile photo by profileId or studentId', async () => {
    (prisma.studentProfile.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'prof_cuid_999',
      studentId: 'student_123',
      photoDriveId: 'raw_drive_photo_ghi',
    });
    mockDriveStream('image/jpeg', 'fake avatar bytes');

    const res = await request(app).get('/api/public/media/photo/student_123');

    expect(res.status).toBe(200);
    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ id: 'student_123' }, { studentId: 'student_123' }] },
    });
    expect(driveService.streamDriveFile).toHaveBeenCalledWith('raw_drive_photo_ghi', undefined, undefined);
    expect(res.headers['cache-control']).toBe('private, max-age=3600');
    expect(res.headers['etag']).toBe('"raw_drive_photo_ghi"');
  });

  it('resolves video by videoId or studentId', async () => {
    (prisma.introVideo.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'video_cuid_555',
      studentId: 'student_123',
      driveFileId: 'raw_drive_video_jkl',
    });
    mockDriveStream('video/mp4', 'fake mp4 bytes');

    const res = await request(app).get('/api/public/media/video/video_cuid_555');

    expect(res.status).toBe(200);
    expect(driveService.streamDriveFile).toHaveBeenCalledWith('raw_drive_video_jkl', undefined, undefined);
    expect(res.headers['cache-control']).toBe('private, max-age=3600');
    expect(res.headers['etag']).toBe('"raw_drive_video_jkl"');
  });

  it('falls back to treating fileId as direct driveFileId if not found in database', async () => {
    (prisma.certificate.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockDriveStream('application/pdf', 'mock content direct drive file');

    const res = await request(app).get('/api/public/media/certificate/raw_drive_direct_id');

    expect(res.status).toBe(200);
    expect(driveService.streamDriveFile).toHaveBeenCalledWith('raw_drive_direct_id', undefined, undefined);
    expect(res.headers['etag']).toBe('"raw_drive_direct_id"');
  });

  it('responds with 304 when client sends matching If-None-Match header', async () => {
    (prisma.resume.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'resume_123',
      driveFileId: 'raw_drive_resume_def',
    });

    const res = await request(app)
      .get('/api/public/media/resume/resume_123')
      .set('If-None-Match', '"raw_drive_resume_def"');

    expect(res.status).toBe(304);
    expect(driveService.streamDriveFile).not.toHaveBeenCalled();
  });
});
