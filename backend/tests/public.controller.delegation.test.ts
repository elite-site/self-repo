import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { asyncHandler } from '../src/utils/asyncHandler';
import { errorHandler } from '../src/middleware/errorHandler';
import { requestIdMiddleware } from '../src/middleware/requestId';
import * as service from '../src/modules/public/public.service';
import {
  getMediaThumbnail,
} from '../src/modules/public/controllers/public.media.controller';
import {
  getPublicStudentsEvents,
  listPublicSkills,
} from '../src/modules/public/controllers/public.students.controller';
import {
  listPublicVideos,
} from '../src/modules/public/controllers/public.videos.controller';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: new Proxy({}, {
    get(): never {
      throw new Error('Public controllers must not query Prisma directly');
    },
  }),
  dbTimingStorage: { getStore: () => undefined },
  buildDatabaseUrl: vi.fn((url: string) => url),
  checkDatabaseHealth: vi.fn(async () => false),
  connectDatabase: vi.fn(async () => undefined),
}));

vi.mock('../src/modules/media', () => ({
  driveService: {
    getPreviewUrl: vi.fn(() => null),
    generateThumbnail: vi.fn(async () => null),
    canRedirectToDrive: vi.fn(() => false),
    getDirectLink: vi.fn(() => null),
    isPubliclyReadable: vi.fn(async () => false),
    probeDirectLink: vi.fn(async () => false),
    streamDriveFile: vi.fn(),
  },
}));

function buildApp() {
  const app = express();
  app.use(requestIdMiddleware);
  app.get('/skills', asyncHandler(listPublicSkills));
  app.get('/events', asyncHandler(getPublicStudentsEvents));
  app.get('/videos', asyncHandler(listPublicVideos));
  app.get('/media/:type/:id', asyncHandler(getMediaThumbnail));
  app.use(errorHandler);
  return app;
}

const app = buildApp();

describe('public controllers delegate queries to the service layer', () => {
  beforeEach(() => {
    service.clearPublicStudentCaches();
    service.clearVideoListCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the skills list through public.service', async () => {
    const findSkills = vi
      .spyOn(service, 'findActiveSkills')
      .mockResolvedValue([{ id: 'skill_syn_1', name: 'Synthetic Skill' }]);

    const res = await request(app).get('/skills');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'skill_syn_1', name: 'Synthetic Skill' }]);
    expect(findSkills).toHaveBeenCalledTimes(1);
  });

  it('loads public student events through public.service', async () => {
    const findEvents = vi
      .spyOn(service, 'findPublicStudentEvents')
      .mockResolvedValue([{ id: 'event_syn_1', name: 'Synthetic Event' }]);

    const res = await request(app).get('/events');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'event_syn_1', name: 'Synthetic Event' }]);
    expect(findEvents).toHaveBeenCalledTimes(1);
  });

  it('lists published videos through public.service', async () => {
    const listVideos = vi.spyOn(service, 'listPublishedVideos').mockResolvedValue({
      items: [{
        id: 'video_syn_1',
        driveFileId: 'drive_syn_1',
        submittedAt: new Date('2026-01-01T00:00:00Z'),
        publishedAt: new Date('2026-01-02T00:00:00Z'),
        sizeMb: 1,
        studentId: 'student_syn_1',
        student: {
          name: 'Synthetic Student',
          rollNo: 'SYN-1',
          year: 1,
          section: 'A',
        },
      }],
      total: 1,
    });

    const res = await request(app).get('/videos?limit=5');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].id).toBe('video_syn_1');
    expect(listVideos).toHaveBeenCalledWith(5, {
      status: 'APPROVED',
      isPublic: true,
      isActive: true,
    });
  });

  it('resolves certificate media through public.service', async () => {
    const findCertificate = vi.spyOn(service, 'findCertificateById').mockResolvedValue({
      id: 'certificate_syn_1',
      fileDriveId: 'drive_syn_cert',
      thumbnail: Buffer.from([1, 2, 3]),
    });

    const res = await request(app).get('/media/certificate/certificate_syn_1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(findCertificate).toHaveBeenCalledWith('certificate_syn_1');
  });
});
