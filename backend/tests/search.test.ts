import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { ValidationError } from '../src/utils/appError';
import {
  parseSearchQuery,
  SearchService,
  searchService,
} from '../src/modules/search';
import {
  SearchRepository,
  type SharedCatalogIndex,
} from '../src/modules/search/search.repository';
import app from '../src/server';

const now = new Date('2026-11-26T10:00:00.000Z');

function makeCatalog(): SharedCatalogIndex {
  return {
    courses: [
      {
        item: {
          type: 'course',
          id: 'course-1',
          title: 'Python Foundations',
          description: 'Core programming',
          url: '/learning/courses/python-foundations',
          studentId: null,
          updatedAt: now,
        },
        titleLower: 'python foundations',
        searchText: 'python foundations core programming',
      },
    ],
    lessons: [
      {
        item: {
          type: 'lesson',
          id: 'lesson-1',
          title: 'Python Functions',
          description: 'Python Foundations',
          url: '/learning/lessons/lesson-1',
          studentId: null,
          updatedAt: now,
        },
        titleLower: 'python functions',
        searchText: 'python functions python foundations',
      },
    ],
    events: [
      {
        item: {
          type: 'event',
          id: 'event-1',
          title: 'Python Hackathon',
          description: 'Annual coding event',
          url: '/events/event-1',
          studentId: null,
          updatedAt: now,
        },
        titleLower: 'python hackathon',
        searchText: 'python hackathon annual coding event',
      },
    ],
    resources: [
      {
        item: {
          type: 'resource',
          id: 'res-sem2',
          title: 'Python Lab Manual',
          description: 'Programming · Sem 2',
          url: '/resources',
          studentId: null,
          updatedAt: now,
        },
        titleLower: 'python lab manual',
        searchText: 'python lab manual programming sem 2',
        semester: 2,
      },
      {
        item: {
          type: 'resource',
          id: 'res-sem7',
          title: 'Python Compiler Notes',
          description: 'Compilers · Sem 7',
          url: '/resources',
          studentId: null,
          updatedAt: now,
        },
        titleLower: 'python compiler notes',
        searchText: 'python compiler notes compilers sem 7',
        semester: 7,
      },
    ],
    announcements: [
      {
        item: {
          type: 'announcement',
          id: 'ann-all',
          title: 'Python Workshop Update',
          description: 'Open to all',
          url: '/announcements/ann-all',
          studentId: null,
          updatedAt: now,
        },
        titleLower: 'python workshop update',
        searchText: 'python workshop update open to all',
        targetAll: true,
      },
      {
        item: {
          type: 'announcement',
          id: 'ann-y4',
          title: 'Python Placement Drive',
          description: 'Final year only',
          url: '/announcements/ann-y4',
          studentId: null,
          updatedAt: now,
        },
        titleLower: 'python placement drive',
        searchText: 'python placement drive final year only',
        targetAll: false,
        targetYear: 4,
        targetSection: null,
      },
    ],
    students: [
      {
        item: {
          type: 'student',
          id: 'student-2',
          title: 'Synthetic Peer',
          description: 'SYN002 · Year 2 A',
          url: '/students/SYN002',
          studentId: 'student-2',
          updatedAt: now,
        },
        titleLower: 'synthetic peer',
        searchText: 'synthetic peer syn002 year 2 a',
      },
    ],
  };
}

describe('parseSearchQuery', () => {
  it('throws ValidationError when q is missing or shorter than 2 chars', () => {
    expect(() => parseSearchQuery({})).toThrow(ValidationError);
    expect(() => parseSearchQuery({ q: ' a ' })).toThrow(ValidationError);
  });

  it('throws ValidationError when type is unknown or limit is non-positive', () => {
    expect(() => parseSearchQuery({ q: 'python', type: 'invalid' })).toThrow(ValidationError);
    expect(() => parseSearchQuery({ q: 'python', limit: '0' })).toThrow(ValidationError);
    expect(() => parseSearchQuery({ q: 'python', limit: 'abc' })).toThrow(ValidationError);
  });

  it('normalizes q, clamps limit to 50, and accepts valid types', () => {
    expect(parseSearchQuery({ q: '  python  ', limit: '200', type: 'course' })).toEqual({
      q: 'python',
      limit: 50,
      type: 'course',
    });
    expect(parseSearchQuery({ q: 'resume' })).toEqual({
      q: 'resume',
      limit: 15,
      type: undefined,
    });
  });
});

describe('SearchService', () => {
  const originalLearningFlag = env.FEATURE_LEARNINGHUB;

  beforeEach(() => {
    env.FEATURE_LEARNINGHUB = true;
    searchService.invalidateIndexCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    env.FEATURE_LEARNINGHUB = originalLearningFlag;
  });

  it('caches the shared catalog index across searches and enforces semester & audience rules', async () => {
    const repo = new SearchRepository();
    const getStudentSpy = vi.spyOn(repo, 'getStudentContext').mockResolvedValue({
      id: 'student-1',
      year: 1,
      semester: 2,
      section: 'A',
    });
    const catalogSpy = vi
      .spyOn(repo, 'loadSharedCatalogIndex')
      .mockResolvedValue(makeCatalog());
    vi.spyOn(repo, 'findPersonalByType').mockImplementation(async (type) => {
      if (type === 'project') {
        return [
          {
            type: 'project',
            id: 'proj-1',
            title: 'Python',
            description: 'CLI analyzer',
            url: '/portfolio/projects',
            studentId: 'student-1',
            updatedAt: now,
          },
        ];
      }
      if (type === 'resume') {
        return [
          {
            type: 'resume',
            id: 'resume-1',
            title: 'python_cv.pdf',
            description: 'My Resume',
            url: '/resume',
            studentId: 'student-1',
            updatedAt: now,
          },
        ];
      }
      return [];
    });

    const svc = new SearchService(repo);
    svc.invalidateIndexCache();

    const first = await svc.search('student-1', { q: 'python', limit: 20 });
    const second = await svc.search('student-1', { q: 'python', limit: 20 });

    expect(getStudentSpy).toHaveBeenCalledTimes(2);
    // Warm TtlCache prevents redundant shared-catalog DB loads
    expect(catalogSpy).toHaveBeenCalledTimes(1);
    expect(second.items).toEqual(first.items);

    const ids = first.items.map((item) => item.id);
    // Own exact-match project ranks first
    expect(ids[0]).toBe('proj-1');
    expect(ids).toContain('course-1');
    expect(ids).toContain('lesson-1');
    expect(ids).toContain('resume-1');
    expect(ids).toContain('event-1');
    expect(ids).toContain('res-sem2');
    expect(ids).toContain('ann-all');
    // Year 1 student must not see Sem 7 resource or Year 4 announcement
    expect(ids).not.toContain('res-sem7');
    expect(ids).not.toContain('ann-y4');
  });

  it('omits courses and lessons when FEATURE_LEARNINGHUB is false', async () => {
    env.FEATURE_LEARNINGHUB = false;
    const repo = new SearchRepository();
    vi.spyOn(repo, 'getStudentContext').mockResolvedValue({
      id: 'student-1',
      year: 2,
      semester: 3,
      section: 'A',
    });
    vi.spyOn(repo, 'loadSharedCatalogIndex').mockResolvedValue(makeCatalog());
    vi.spyOn(repo, 'findPersonalByType').mockResolvedValue([]);

    const svc = new SearchService(repo);
    svc.invalidateIndexCache();

    const res = await svc.search('student-1', { q: 'python' });
    const types = res.items.map((i) => i.type);
    expect(types).not.toContain('course');
    expect(types).not.toContain('lesson');
    expect(types).toContain('event');
  });
});

describe('GET /api/student/search route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    searchService.invalidateIndexCache();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/student/search?q=python');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('returns 400 with field details when query is too short', async () => {
    const token = jwt.sign(
      { studentId: 'student-1', rollNo: 'SYN001', name: 'Synthetic Student' },
      env.STUDENT_JWT_SECRET,
    );

    const res = await request(app)
      .get('/api/student/search?q=p')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual([{ field: 'q', message: 'Must be at least 2 characters' }]);
    expect(res.body.requestId).toBeDefined();
  });

  it('returns private no-store search results for an authenticated student', async () => {
    const token = jwt.sign(
      { studentId: 'student-1', rollNo: 'SYN001', name: 'Synthetic Student' },
      env.STUDENT_JWT_SECRET,
    );

    vi.spyOn(prisma.student, 'findUnique').mockResolvedValue({
      id: 'student-1',
      year: 2,
      semester: 4,
      section: 'A',
    } as never);
    vi.spyOn(prisma.course, 'findMany').mockResolvedValue([
      {
        id: 'course-1',
        slug: 'python-101',
        title: 'Python 101',
        description: 'Intro',
        category: 'Programming',
        instructor: null,
        skills: [],
        updatedAt: now,
      },
    ] as never);
    vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.event, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.resource, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.announcement, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.student, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.project, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.resume, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.achievement, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.certificate, 'findMany').mockResolvedValue([] as never);
    vi.spyOn(prisma.githubRepo, 'findMany').mockResolvedValue([] as never);

    const res = await request(app)
      .get('/api/student/search?q=python')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body.query).toBe('python');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      type: 'course',
      id: 'course-1',
      title: 'Python 101',
      url: '/learning/courses/python-101',
    });
  });
});
