/**
 * Regression cover for the reported bug: "when the student submits the video it
 * should be there, not just one session — it should be visible after logout and
 * login on the video submission page."
 *
 * The player used to hold a blob URL in React state, so the recording only
 * existed for the lifetime of one page load. These tests pin the two things
 * that make it survive a new session instead:
 *
 *   1. GET /api/student/me keeps returning the stored video (and enough file
 *      metadata to identify it) for a brand-new signed-in session.
 *   2. GET /api/student/submission/media/video serves the whole file on a
 *      normal request, honours Range for seeking, and answers 304 to the
 *      browser's revalidation so a returning student reuses their cache.
 */
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
    student: { findUnique: vi.fn() },
    submission: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    resume: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    introVideo: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    activityLog: { create: vi.fn() },
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

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const STUDENT = {
  id: 'stud_123',
  rollNo: '23K61A1201',
  name: 'Test Student',
  year: 3,
  section: 'A',
  branch: 'IT',
  status: 'ACTIVE',
  graduatedAt: null,
};

const VIDEO_BYTES = Buffer.from('0123456789abcdefghij');

/** A freshly signed token, i.e. what the SSO callback hands out on each login. */
const freshLogin = () =>
  jwt.sign(
    { studentId: STUDENT.id, rollNo: STUDENT.rollNo, name: STUDENT.name, email: 'test@sasi.ac.in' },
    env.STUDENT_JWT_SECRET,
  );

/** Attaches a freshly issued session cookie, as a real login would. */
const signIn = (req: request.Test) => req.set('Cookie', `pc_student_session=${freshLogin()}`);

/** The video row a student ends up with after submitting one take. */
const storedVideo = (overrides: Record<string, unknown> = {}) => ({
  id: 'iv_1',
  studentId: STUDENT.id,
  driveFileId: 'video_take_1',
  filename: 'my-intro.mp4',
  mimeType: 'video/mp4',
  sizeMb: 4.2,
  status: 'PENDING',
  reviewNote: null,
  isPublic: false,
  publishedAt: null,
  changeRequestedAt: null,
  changeRequestNote: null,
  submittedAt: new Date('2026-09-25T10:00:00.000Z'),
  ...overrides,
});

const submissionRow = (videoDriveId = 'video_take_1') => ({
  id: 'sub_1',
  rollNo: STUDENT.rollNo,
  status: 'SUBMITTED',
  submittedAt: new Date('2026-09-25T10:00:00.000Z'),
  videoDriveId,
  driveFolderPath: 'Events/2026/3-A/IT_23K61A1201_Test',
});

describe("Student intro video — persists across logout and login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock(prisma.student.findUnique).mockResolvedValue(STUDENT);
    mock(prisma.submission.findFirst).mockResolvedValue(submissionRow());
    mock(prisma.introVideo.findFirst).mockResolvedValue(storedVideo());
  });

  it('returns the submitted video, with its file metadata, on a brand-new login', async () => {
    const res = await signIn(request(app).get('/api/student/me'));

    expect(res.status).toBe(200);
    expect(res.body.student.video).toEqual(
      expect.objectContaining({
        id: 'iv_1',
        status: 'PENDING',
        isPublic: false,
        filename: 'my-intro.mp4',
        mimeType: 'video/mp4',
        sizeMb: 4.2,
        hasFile: true,
      }),
    );
  });

  it('is not session-scoped: the state is identical after logging out and back in', async () => {
    const first = await signIn(request(app).get('/api/student/me'));

    await request(app).post('/api/student/logout');

    // A new token issued by a *new* callback, as after a real re-login.
    const second = await signIn(request(app).get('/api/student/me'));

    expect(second.status).toBe(200);
    expect(second.body.student.video).toEqual(first.body.student.video);
  });

  it('survives repeated logins without drifting', async () => {
    const seen = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await signIn(request(app).get('/api/student/me'));
      expect(res.status).toBe(200);
      seen.push(res.body.student.video);
    }
    expect(seen[1]).toEqual(seen[0]);
    expect(seen[2]).toEqual(seen[0]);
  });

  it('does not claim a video the student never uploaded', async () => {
    mock(prisma.introVideo.findFirst).mockResolvedValue(null);
    mock(prisma.submission.findFirst).mockResolvedValue(null);

    const res = await signIn(request(app).get('/api/student/me'));

    expect(res.status).toBe(200);
    expect(res.body.student.video).toBeNull();
    expect(res.body.student.submission).toBeNull();
  });
});

describe('Student intro video — stream endpoint serves a returning student', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock(prisma.student.findUnique).mockResolvedValue(STUDENT);
    mock(prisma.submission.findFirst).mockResolvedValue(submissionRow());
    mock(prisma.introVideo.findFirst).mockResolvedValue(storedVideo());
  });

  it('serves the whole recording on a plain request', async () => {
    mock(driveService.streamDriveFile).mockResolvedValue({
      stream: Readable.from([VIDEO_BYTES]),
      mimeType: 'video/mp4',
      size: VIDEO_BYTES.length,
    });

    const res = await signIn(request(app).get('/api/student/submission/media/video'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('video/mp4');
    expect(res.headers['content-length']).toBe(String(VIDEO_BYTES.length));
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['etag']).toBe('"video_take_1"');
    expect(Buffer.from(res.body)).toEqual(VIDEO_BYTES);
  });

  it('forwards the Range header so the player can seek instead of downloading everything', async () => {
    // The range is resolved by the service, not faked by the route.
    mock(driveService.streamDriveFile).mockResolvedValue({
      stream: Readable.from([VIDEO_BYTES.subarray(0, 5)]),
      mimeType: 'video/mp4',
      contentRange: { start: 0, end: 4, total: VIDEO_BYTES.length },
    });

    const res = await signIn(request(app).get('/api/student/submission/media/video').set('Range', 'bytes=0-4'));

    expect(driveService.streamDriveFile).toHaveBeenCalledWith(
      'video_take_1',
      'Events/2026/3-A/IT_23K61A1201_Test',
      'bytes=0-4',
    );
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-4/${VIDEO_BYTES.length}`);
    // The body must match the advertised range exactly, not the whole file.
    expect(res.headers['content-length']).toBe('5');
    expect(Buffer.from(res.body)).toHaveLength(5);
  });

  it('serves a suffix range, which is how browsers probe for the MP4 moov atom', async () => {
    // Chrome/Safari issue `Range: bytes=-N` to read metadata stored at the end of
    // the file. If this is not honoured the player spins forever on "loading".
    mock(driveService.streamDriveFile).mockResolvedValue({
      stream: Readable.from([VIDEO_BYTES.subarray(VIDEO_BYTES.length - 8)]),
      mimeType: 'video/mp4',
      contentRange: {
        start: VIDEO_BYTES.length - 8,
        end: VIDEO_BYTES.length - 1,
        total: VIDEO_BYTES.length,
      },
    });

    const res = await signIn(
      request(app).get('/api/student/submission/media/video').set('Range', 'bytes=-8'),
    );

    expect(driveService.streamDriveFile).toHaveBeenCalledWith(
      'video_take_1',
      'Events/2026/3-A/IT_23K61A1201_Test',
      'bytes=-8',
    );
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(
      `bytes ${VIDEO_BYTES.length - 8}-${VIDEO_BYTES.length - 1}/${VIDEO_BYTES.length}`,
    );
    expect(res.headers['content-length']).toBe('8');
  });

  it('still serves a satisfiable range when the service reports no contentRange', async () => {
    // The service normally resolves the range, but the route must not 416 a range
    // it can satisfy on its own from the known file size.
    mock(driveService.streamDriveFile).mockResolvedValue({
      stream: Readable.from([VIDEO_BYTES.subarray(0, 5)]),
      mimeType: 'video/mp4',
      size: VIDEO_BYTES.length,
    });

    const res = await signIn(
      request(app).get('/api/student/submission/media/video').set('Range', 'bytes=0-4'),
    );

    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-4/${VIDEO_BYTES.length}`);
  });

  it('answers 416 for a range that starts past the end of the file', async () => {
    mock(driveService.streamDriveFile).mockResolvedValue({
      stream: Readable.from([Buffer.alloc(0)]),
      mimeType: 'video/mp4',
      size: VIDEO_BYTES.length,
    });

    const res = await signIn(
      request(app)
        .get('/api/student/submission/media/video')
        .set('Range', `bytes=${VIDEO_BYTES.length + 500}-`),
    );

    expect(res.status).toBe(416);
    expect(res.headers['content-range']).toBe(`bytes */${VIDEO_BYTES.length}`);
  });

  it('answers 304 to a revalidation, so the cached copy is reused across logins', async () => {
    const res = await signIn(request(app).get('/api/student/submission/media/video').set('If-None-Match', '"video_take_1"'));

    expect(res.status).toBe(304);
    expect(driveService.streamDriveFile).not.toHaveBeenCalled();
  });

  it('serves the new take, not the previous one, after a replacement upload', async () => {
    mock(prisma.submission.findFirst).mockResolvedValue(submissionRow('video_take_2'));
    mock(prisma.introVideo.findFirst).mockResolvedValue(storedVideo({ driveFileId: 'video_take_2', filename: 'my-intro-v2.mp4' }));
    mock(driveService.streamDriveFile).mockResolvedValue({
      stream: Readable.from([Buffer.from('v2')]),
      mimeType: 'video/mp4',
      size: 2,
    });

    const me = await signIn(request(app).get('/api/student/me'));
    expect(me.body.student.video.filename).toBe('my-intro-v2.mp4');

    const res = await signIn(request(app).get('/api/student/submission/media/video'));
    expect(res.headers['etag']).toBe('"video_take_2"');
  });

  it('still requires a session — the stream is not public', async () => {
    const res = await request(app).get('/api/student/submission/media/video');

    expect(res.status).toBe(401);
    expect(driveService.streamDriveFile).not.toHaveBeenCalled();
  });
});
