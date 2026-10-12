import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { errorHandler } from '../src/middleware/errorHandler';
import { studentCoursesRouter } from '../src/modules/learning-courses/courses.routes';
import { coursesService } from '../src/modules/learning-courses/courses.service';
import {
  fetchYouTubeTranscript,
  clearTranscriptCache,
} from '../src/modules/learning-courses/youtube';
import { NotFoundError } from '../src/utils/appError';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    lesson: {
      findUnique: vi.fn(),
    },
  },
}));

const originalFetch = global.fetch;

const sampleFormat3Xml = `
<timedtext format="3">
  <body>
    <p t="1000" d="2500">Hello &amp; welcome</p>
    <p t="3500" d="3000"><s>In this</s> <s>lesson, we learn &quot;coding&#39;s&quot; basics</s></p>
    <p t="6500" d="1200"><span>tags are stripped &lt;test&gt;</span></p>
  </body>
</timedtext>
`;

const sampleClassicXml = `
<transcript>
  <text start="0.5" dur="1.5">First classic caption</text>
  <text start="2.0" dur="2.5">Second line with &amp; entity</text>
</transcript>
`;

const makePlayerResponse = (captionTracks?: any[]) => ({
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: captionTracks ?? [
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=testVideo1&lang=en',
          languageCode: 'en',
          name: { simpleText: 'English' },
        },
      ],
    },
  },
});

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use('/api/student/learning', studentCoursesRouter);
app.use(errorHandler);

const studentPayload = {
  studentId: 'stud_trans_1',
  rollNo: '23K61A1201',
  name: 'Transcript Student',
  email: 'stud1@sasi.ac.in',
};
const studentCookie = `pc_student_session=${jwt.sign(studentPayload, env.STUDENT_JWT_SECRET)}`;

describe('LearningHub - YouTube Transcription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTranscriptCache();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    clearTranscriptCache();
  });

  describe('fetchYouTubeTranscript (InnerTube API & XML parsing)', () => {
    it('successfully fetches and parses Format 3 XML (<p t="ms" d="ms">) converting ms to seconds', async () => {
      const fetchMock = vi.fn();
      // First call: InnerTube player endpoint
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse(),
      });
      // Second call: caption track baseUrl
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => sampleFormat3Xml,
      });
      global.fetch = fetchMock;

      const result = await fetchYouTubeTranscript('abc12345678');

      expect(result.available).toBe(true);
      expect(result.language).toBe('en');
      expect(result.segments).toHaveLength(3);

      expect(result.segments[0]).toEqual({
        text: 'Hello & welcome',
        offset: 1,
        duration: 2.5,
      });

      expect(result.segments[1]).toEqual({
        text: 'In this lesson, we learn "coding\'s" basics',
        offset: 3.5,
        duration: 3,
      });

      expect(result.segments[2]).toEqual({
        text: 'tags are stripped <test>',
        offset: 6.5,
        duration: 1.2,
      });

      // Verify InnerTube API request payload
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [playerUrl, playerOptions] = fetchMock.mock.calls[0];
      expect(playerUrl).toBe('https://www.youtube.com/youtubei/v1/player?prettyPrint=false');
      expect(playerOptions.method).toBe('POST');
      expect(playerOptions.headers['User-Agent']).toBe(
        'com.google.android.youtube/20.10.38 (Linux; U; Android 14)'
      );
      const body = JSON.parse(playerOptions.body);
      expect(body.videoId).toBe('abc12345678');
      expect(body.context.client.clientName).toBe('ANDROID');
      expect(body.context.client.clientVersion).toBe('20.10.38');
    });

    it('successfully fetches and parses classic XML (<text start="s" dur="s">)', async () => {
      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse(),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => sampleClassicXml,
      });
      global.fetch = fetchMock;

      const result = await fetchYouTubeTranscript('abc12345678');

      expect(result.available).toBe(true);
      expect(result.language).toBe('en');
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toEqual({
        text: 'First classic caption',
        offset: 0.5,
        duration: 1.5,
      });
      expect(result.segments[1]).toEqual({
        text: 'Second line with & entity',
        offset: 2,
        duration: 2.5,
      });
    });

    it('picks requested language track when available', async () => {
      const tracks = [
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=en',
          languageCode: 'en',
          name: { simpleText: 'English' },
        },
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=es',
          languageCode: 'es',
          name: { simpleText: 'Spanish' },
        },
      ];

      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse(tracks),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<timedtext format="3"><body><p t="1000" d="2000">Hola mundo</p></body></timedtext>',
      });
      global.fetch = fetchMock;

      const result = await fetchYouTubeTranscript('abc12345678', 'es');

      expect(result.available).toBe(true);
      expect(result.language).toBe('es');
      expect(result.segments[0].text).toBe('Hola mundo');
      expect(fetchMock.mock.calls[1][0]).toContain('lang=es');
    });

    it('defaults to English track when requested language is absent', async () => {
      const tracks = [
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=fr',
          languageCode: 'fr',
        },
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=en',
          languageCode: 'en',
        },
      ];

      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse(tracks),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<timedtext format="3"><body><p t="500" d="1000">English fallback</p></body></timedtext>',
      });
      global.fetch = fetchMock;

      const result = await fetchYouTubeTranscript('abc12345678', 'de');

      expect(result.available).toBe(true);
      expect(result.language).toBe('en');
      expect(result.segments[0].text).toBe('English fallback');
    });

    it('falls back gracefully to first track when English track is absent', async () => {
      const tracks = [
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=hi',
          languageCode: 'hi',
        },
      ];

      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse(tracks),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<timedtext format="3"><body><p t="1000" d="1000">नमस्ते</p></body></timedtext>',
      });
      global.fetch = fetchMock;

      const result = await fetchYouTubeTranscript('abc12345678');

      expect(result.available).toBe(true);
      expect(result.language).toBe('hi');
      expect(result.segments[0].text).toBe('नमस्ते');
    });

    it('falls back gracefully without throwing when captions are not available in player response', async () => {
      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // No captions property
          playabilityStatus: { status: 'OK' },
        }),
      });
      global.fetch = fetchMock;

      const result = await fetchYouTubeTranscript('nocaptions12');

      expect(result).toEqual({
        segments: [],
        language: 'en',
        available: false,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('falls back gracefully when captionTracks array is empty', async () => {
      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse([]),
      });
      global.fetch = fetchMock;

      const result = await fetchYouTubeTranscript('emptytracks1');

      expect(result).toEqual({
        segments: [],
        language: 'en',
        available: false,
      });
    });

    it('falls back gracefully without throwing when player API returns HTTP 404', async () => {
      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      global.fetch = fetchMock;

      const result = await fetchYouTubeTranscript('notfound123');

      expect(result).toEqual({
        segments: [],
        language: 'en',
        available: false,
      });
    });

    it('falls back gracefully without throwing on network / fetch error', async () => {
      const fetchMock = vi.fn();
      fetchMock.mockRejectedValueOnce(new Error('Network error: ECONNREFUSED'));
      global.fetch = fetchMock;

      const result = await fetchYouTubeTranscript('networkfail1');

      expect(result).toEqual({
        segments: [],
        language: 'en',
        available: false,
      });
    });

    it('falls back gracefully when videoId is invalid or empty', async () => {
      const result = await fetchYouTubeTranscript('');
      expect(result).toEqual({
        segments: [],
        language: 'en',
        available: false,
      });
    });

    it('caches transcripts in-memory to prevent repeated YouTube requests', async () => {
      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse(),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => sampleFormat3Xml,
      });
      global.fetch = fetchMock;

      const result1 = await fetchYouTubeTranscript('cachedVideo1');
      expect(result1.available).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Second call for the same video should be served from in-memory cache
      const result2 = await fetchYouTubeTranscript('cachedVideo1');
      expect(result2).toEqual(result1);
      expect(fetchMock).toHaveBeenCalledTimes(2); // no extra fetch calls

      // Clearing cache forces re-fetch
      clearTranscriptCache();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse(),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => sampleFormat3Xml,
      });

      const result3 = await fetchYouTubeTranscript('cachedVideo1');
      expect(result3.available).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('coursesService.getLessonTranscript', () => {
    it('throws NotFoundError if lesson does not exist in repository', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValueOnce(null);

      await expect(coursesService.getLessonTranscript('non_existent_lesson')).rejects.toThrow(
        NotFoundError
      );
    });

    it('returns available: false with message if lesson type is not YOUTUBE', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValueOnce({
        id: 'lesson_notes_1',
        courseId: 'course_1',
        title: 'Reading Material',
        order: 1,
        type: 'NOTES',
        youtubeVideoId: null,
        url: null,
        notes: 'Read chapter 3',
        durationSec: null,
      } as any);

      const result = await coursesService.getLessonTranscript('lesson_notes_1');

      expect(result).toEqual({
        available: false,
        segments: [],
        message: 'Lesson is not a YouTube video',
      });
    });

    it('returns available: false with message if youtubeVideoId is missing', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValueOnce({
        id: 'lesson_yt_novideo',
        courseId: 'course_1',
        title: 'Intro Video',
        order: 1,
        type: 'YOUTUBE',
        youtubeVideoId: null,
        url: null,
        notes: null,
        durationSec: null,
      } as any);

      const result = await coursesService.getLessonTranscript('lesson_yt_novideo');

      expect(result).toEqual({
        available: false,
        segments: [],
        message: 'Lesson is not a YouTube video',
      });
    });

    it('returns transcript payload when lesson has valid YouTube video', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValueOnce({
        id: 'lesson_valid_yt',
        courseId: 'course_1',
        title: 'Video Lecture',
        order: 1,
        type: 'YOUTUBE',
        youtubeVideoId: 'dQw4w9WgXcQ',
        url: null,
        notes: null,
        durationSec: 212,
      } as any);

      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse(),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => sampleClassicXml,
      });
      global.fetch = fetchMock;

      const result = await coursesService.getLessonTranscript('lesson_valid_yt');

      expect(result).toEqual({
        lessonId: 'lesson_valid_yt',
        videoId: 'dQw4w9WgXcQ',
        available: true,
        language: 'en',
        segments: [
          { text: 'First classic caption', offset: 0.5, duration: 1.5 },
          { text: 'Second line with & entity', offset: 2, duration: 2.5 },
        ],
      });
    });
  });

  describe('HTTP API: GET /api/student/learning/lessons/:id/transcript', () => {
    it('returns 401 when student is unauthenticated', async () => {
      const res = await request(app).get('/api/student/learning/lessons/lesson_123/transcript');
      expect(res.status).toBe(401);
    });

    it('returns 404 when lesson does not exist', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/student/learning/lessons/lesson_missing/transcript')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('returns 200 with available: false for non-YouTube lesson', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValueOnce({
        id: 'lesson_quiz_1',
        courseId: 'course_1',
        title: 'Quiz 1',
        order: 2,
        type: 'QUIZ',
        youtubeVideoId: null,
        url: null,
        notes: null,
        durationSec: null,
      } as any);

      const res = await request(app)
        .get('/api/student/learning/lessons/lesson_quiz_1/transcript')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        available: false,
        segments: [],
        message: 'Lesson is not a YouTube video',
      });
    });

    it('returns 200 with transcript segments for valid YouTube lesson', async () => {
      vi.mocked(prisma.lesson.findUnique).mockResolvedValueOnce({
        id: 'lesson_yt_ok',
        courseId: 'course_1',
        title: 'YouTube Lecture',
        order: 1,
        type: 'YOUTUBE',
        youtubeVideoId: 'video123456',
        url: null,
        notes: null,
        durationSec: 300,
      } as any);

      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => makePlayerResponse(),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => sampleFormat3Xml,
      });
      global.fetch = fetchMock;

      const res = await request(app)
        .get('/api/student/learning/lessons/lesson_yt_ok/transcript')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.lessonId).toBe('lesson_yt_ok');
      expect(res.body.videoId).toBe('video123456');
      expect(res.body.available).toBe(true);
      expect(res.body.language).toBe('en');
      expect(res.body.segments).toHaveLength(3);
      expect(res.body.segments[0]).toEqual({
        text: 'Hello & welcome',
        offset: 1,
        duration: 2.5,
      });
    });
  });
});
