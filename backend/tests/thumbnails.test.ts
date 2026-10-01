import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/lib/prisma';
import { driveService } from '../src/services/drive.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    certificate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    achievement: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    resume: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    introVideo: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    submission: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../src/services/drive.service', () => ({
  driveService: {
    generateThumbnail: vi.fn(),
    uploadFile: vi.fn(),
    uploadSubmissionFiles: vi.fn(),
    setViewerPermission: vi.fn(),
    streamDriveFile: vi.fn(),
    deleteFileById: vi.fn(),
  },
}));

describe('WebP Thumbnails and Cache Invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWebpBuffer = Buffer.from('RIFF....WEBPVP8 ...fake-webp-bytes...');

  describe('GET /api/media/thumbnail/:type/:id', () => {
    it('serves stored WebP thumbnail with versioned ETag and immutable Cache-Control', async () => {
      vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
        id: 'cert_101',
        title: 'AWS Certified Cloud Practitioner',
        fileDriveId: 'drive_file_abc123',
        thumbnail: mockWebpBuffer,
      } as any);

      const res = await request(app).get('/api/media/thumbnail/certificate/cert_101');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/webp');
      expect(res.headers['cache-control']).toBe('public, max-age=604800, immutable');
      expect(res.headers['etag']).toBe('"drive_file_abc123"');
      expect(res.body).toEqual(mockWebpBuffer);
    });

    it('returns 304 Not Modified when If-None-Match matches the versioned ETag', async () => {
      vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
        id: 'cert_101',
        title: 'AWS Certified Cloud Practitioner',
        fileDriveId: 'drive_file_abc123',
        thumbnail: mockWebpBuffer,
      } as any);

      const res = await request(app)
        .get('/api/media/thumbnail/certificate/cert_101')
        .set('If-None-Match', '"drive_file_abc123"');

      expect(res.status).toBe(304);
      expect(res.headers['cache-control']).toBe('public, max-age=604800, immutable');
      expect(res.headers['etag']).toBe('"drive_file_abc123"');
      expect(res.text).toBe('');
    });

    it('buses cache when file is reuploaded (different driveFileId produces new ETag)', async () => {
      vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
        id: 'cert_101',
        title: 'AWS Certified Cloud Practitioner',
        fileDriveId: 'drive_file_NEW999',
        thumbnail: Buffer.from('new-webp-content'),
      } as any);

      // Client sends old cached ETag
      const res = await request(app)
        .get('/api/media/thumbnail/certificate/cert_101?v=drive_file_NEW999')
        .set('If-None-Match', '"drive_file_abc123"');

      // Must NOT return 304; must return fresh 200 with new ETag
      expect(res.status).toBe(200);
      expect(res.headers['etag']).toBe('"drive_file_NEW999"');
      expect(res.headers['cache-control']).toBe('public, max-age=604800, immutable');
    });

    it('triggers lazy fallback generation if thumbnail is null in DB and stores it', async () => {
      const generatedWebp = Buffer.from('generated-webp-buffer');

      vi.mocked(prisma.achievement.findUnique).mockResolvedValue({
        id: 'ach_55',
        title: 'Hackathon 1st Place',
        proofDriveId: 'drive_ach_proof_777',
        thumbnail: null,
      } as any);

      vi.mocked(driveService.generateThumbnail).mockResolvedValue(generatedWebp);
      vi.mocked(prisma.achievement.update).mockResolvedValue({} as any);

      const res = await request(app).get('/api/media/thumbnail/achievement/ach_55');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/webp');
      expect(res.headers['etag']).toBe('"drive_ach_proof_777"');
      expect(driveService.generateThumbnail).toHaveBeenCalledWith('drive_ach_proof_777', 'achievement');
      expect(prisma.achievement.update).toHaveBeenCalledWith({
        where: { id: 'ach_55' },
        data: { thumbnail: generatedWebp },
      });
    });

    it('returns branded SVG fallback when thumbnail generation fails', async () => {
      vi.mocked(prisma.introVideo.findUnique).mockResolvedValue({
        id: 'vid_fail',
        driveFileId: 'drive_corrupt_file',
        thumbnail: null,
      } as any);

      vi.mocked(driveService.generateThumbnail).mockResolvedValue(null);

      const res = await request(app).get('/api/media/thumbnail/video/vid_fail');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/svg+xml');
      const bodyText = res.text || (Buffer.isBuffer(res.body) ? res.body.toString('utf-8') : String(res.body));
      expect(bodyText).toContain('<svg');
      expect(bodyText).toContain('SASI');
    });
  });

  describe('Public Student Profile Serialisation (GET /api/public/students/:rollNo)', () => {
    it('serializes versioned thumbnailUrl (?v=...) and strips raw thumbnail buffer', async () => {
      const mockRawThumb = Buffer.from('raw-binary-buffer-not-to-serialize');

      vi.mocked(prisma.student.findUnique).mockResolvedValue({
        id: 's_1',
        rollNo: '23K61A1201',
        name: 'Jane Doe',
        year: 3,
        section: 'A',
        status: 'ACTIVE',
        profile: {
          id: 'p_1',
          photoUrl: 'photo.jpg',
          photoDriveId: 'drive_photo_1',
          skills: [],
        },
        projects: [],
        achievements: [
          {
            id: 'ach_1',
            title: 'Code Olympiad Winner',
            proofDriveId: 'drive_ach_123',
            thumbnail: mockRawThumb,
            status: 'APPROVED',
          },
        ],
        certificates: [
          {
            id: 'cert_1',
            title: 'AWS Certified Developer',
            fileDriveId: 'drive_cert_123',
            thumbnail: mockRawThumb,
            status: 'APPROVED',
            isPublic: true,
          },
        ],
        resumes: [
          {
            id: 'res_1',
            driveFileId: 'drive_res_123',
            thumbnail: mockRawThumb,
            status: 'APPROVED',
          },
        ],
        introVideos: [
          {
            id: 'vid_1',
            driveFileId: 'drive_vid_123',
            thumbnail: mockRawThumb,
            submittedAt: new Date('2026-01-01T00:00:00Z'),
            publishedAt: new Date('2026-01-02T00:00:00Z'),
            sizeMb: 15.2,
            status: 'APPROVED',
            isPublic: true,
          },
        ],
      } as any);

      const res = await request(app).get('/api/public/students/23K61A1201');

      expect(res.status).toBe(200);

      // Intro video assertions
      expect(res.body.introVideo).toBeDefined();
      expect(res.body.introVideo.thumbnailUrl).toBe(
        '/api/public/media/thumbnail/video/vid_1?v=drive_vid_123'
      );
      expect(res.body.introVideo.thumbnail).toBeUndefined();

      // Certificate assertions
      expect(res.body.certificates).toHaveLength(1);
      expect(res.body.certificates[0].thumbnailUrl).toBe(
        '/api/public/media/thumbnail/certificate/cert_1?v=drive_cert_123'
      );
      expect(res.body.certificates[0].thumbnail).toBeUndefined();

      // Achievement assertions
      expect(res.body.achievements).toHaveLength(1);
      expect(res.body.achievements[0].thumbnailUrl).toBe(
        '/api/public/media/thumbnail/achievement/ach_1?v=drive_ach_123'
      );
      expect(res.body.achievements[0].thumbnail).toBeUndefined();

      // Resume assertions
      expect(res.body.resumes).toHaveLength(1);
      expect(res.body.resumes[0].thumbnailUrl).toBe(
        '/api/public/media/thumbnail/resume/res_1?v=drive_res_123'
      );
      expect(res.body.resumes[0].thumbnail).toBeUndefined();
    });
  });

  describe('Public Video Showcase Serialisation (GET /api/public/videos)', () => {
    it('returns versioned thumbnailUrl with ?v= parameter in video showcase items', async () => {
      vi.mocked(prisma.introVideo.findMany).mockResolvedValue([
        {
          id: 'iv_public_1',
          driveFileId: 'drive_video_public_xyz',
          submittedAt: new Date('2026-01-05T10:00:00Z'),
          publishedAt: new Date('2026-01-06T10:00:00Z'),
          sizeMb: 14.5,
          studentId: 's_1',
          student: { name: 'Alice Smith', rollNo: '23K61A1202', year: 3, section: 'B' },
        },
      ] as any);
      vi.mocked(prisma.introVideo.count).mockResolvedValue(1);

      const res = await request(app).get('/api/public/videos');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].thumbnailUrl).toBe(
        '/api/public/media/thumbnail/video/iv_public_1?v=drive_video_public_xyz'
      );
      expect(res.body.items[0].thumbnail).toBeUndefined();
    });
  });
});
