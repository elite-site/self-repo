import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

// ---------------------------------------------------------------------------
// Prisma mock — mirrors the pattern in student.submission.delete.test.ts
// ---------------------------------------------------------------------------
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    student: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    studentProfile: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    studentSkill: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    skill: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    githubAccount: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    githubRepo: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    githubStudentSkill: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    githubOAuthState: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    githubSyncJob: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    project: {
      updateMany: vi.fn(),
    },
    submission: {
      findFirst: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Shorthand cast helper (same style as student.submission.delete.test.ts)
// ---------------------------------------------------------------------------
const mock = (fn: unknown) => fn as unknown as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Auth tokens
// ---------------------------------------------------------------------------
const studentA = { studentId: 'stud_aaa', rollNo: '23K61A1201', name: 'Alice', email: 'alice@sasi.ac.in' };
const studentB = { studentId: 'stud_bbb', rollNo: '23K61A1202', name: 'Bob',   email: 'bob@sasi.ac.in' };

const tokenA = jwt.sign(studentA, env.STUDENT_JWT_SECRET);
const tokenB = jwt.sign(studentB, env.STUDENT_JWT_SECRET);

// A convenience reusable GithubAccount stub for studentA
const fakeAccount = {
  id: 'gh_acc_1',
  studentId: studentA.studentId,
  githubUserId: BigInt('12345678'),
  login: 'alice-gh',
  avatarUrl: 'https://avatars.githubusercontent.com/u/12345678',
  accessToken: 'gho_fake',
  tokenType: 'bearer',
  lastSyncedAt: new Date('2026-10-01T12:00:00Z'),
  nextSyncAllowedAt: null,
  manualSyncCountToday: 0,
  manualSyncDay: null,
};

// Fake repos belonging to studentA
const fakeRepo = {
  id: 'repo_aaa_1',
  studentId: studentA.studentId,
  githubRepoId: BigInt('987654321'),
  name: 'my-project',
  fullName: 'alice-gh/my-project',
  description: 'A test project',
  url: 'https://github.com/alice-gh/my-project',
  isPrivate: false,
  isFork: false,
  stargazersCount: 3,
  forksCount: 0,
  openIssuesCount: 0,
  size: 120,
  defaultBranch: 'main',
  pushedAt: new Date('2026-09-20T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-09-20T00:00:00Z'),
  isShowcased: false,
  showcaseRank: null,
  removedFromGithub: false,
  commitCount: 5,
  languages: { TypeScript: 80 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setupConnectedAccount() {
  // Student record with embedded githubAccount
  mock(prisma.student.findUnique).mockResolvedValue({
    id: studentA.studentId,
    githubReminderSnoozedUntil: null,
    githubAccount: fakeAccount,
  });
  mock(prisma.githubAccount.findUnique).mockResolvedValue(fakeAccount);
  mock(prisma.githubRepo.findMany).mockResolvedValue([fakeRepo]);
  mock(prisma.githubStudentSkill.findMany).mockResolvedValue([]);
}

// ---------------------------------------------------------------------------

describe('GitHub Portfolio — Auth Guards (unauthenticated → 401)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const routes: Array<{ method: 'get' | 'post' | 'put' | 'delete'; path: string }> = [
    { method: 'get',    path: '/api/student/github' },
    { method: 'post',   path: '/api/student/github/connect' },
    { method: 'post',   path: '/api/student/github/sync' },
    { method: 'put',    path: '/api/student/github/showcase' },
    { method: 'delete', path: '/api/student/github' },
    { method: 'post',   path: '/api/student/github/reminder/snooze' },
    { method: 'get',    path: '/api/student/portfolio' },
  ];

  for (const { method, path } of routes) {
    it(`${method.toUpperCase()} ${path} — no cookie → 401`, async () => {
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
    });
  }
});

// ---------------------------------------------------------------------------

describe('GET /api/student/github — structure when connected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedAccount();
    mock(prisma.githubSyncJob.findFirst).mockResolvedValue(null);
  });

  it('returns connected=true, repos array, skills array', async () => {
    const res = await request(app)
      .get('/api/student/github')
      .set('Cookie', `pc_student_session=${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      connected: true,
      repos: expect.any(Array),
      skills: expect.any(Array),
    });
    expect(Array.isArray(res.body.repos)).toBe(true);
    expect(Array.isArray(res.body.skills)).toBe(true);
  });

  it('returns connected=false when no github account', async () => {
    mock(prisma.student.findUnique).mockResolvedValue({
      id: studentA.studentId,
      githubReminderSnoozedUntil: null,
      githubAccount: null,
    });

    const res = await request(app)
      .get('/api/student/github')
      .set('Cookie', `pc_student_session=${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
    expect(res.body.repos).toEqual([]);
    expect(res.body.skills).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('PUT /api/student/github/showcase — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedAccount();
  });

  it('rejects empty array with 400', async () => {
    const res = await request(app)
      .put('/api/student/github/showcase')
      .set('Cookie', `pc_student_session=${tokenA}`)
      .send({ repoIds: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_SHOWCASE_COUNT');
  });

  it('rejects 6 ids with 400', async () => {
    const res = await request(app)
      .put('/api/student/github/showcase')
      .set('Cookie', `pc_student_session=${tokenA}`)
      .send({ repoIds: ['a', 'b', 'c', 'd', 'e', 'f'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_SHOWCASE_COUNT');
  });

  it('rejects duplicate ids with 400', async () => {
    const res = await request(app)
      .put('/api/student/github/showcase')
      .set('Cookie', `pc_student_session=${tokenA}`)
      .send({ repoIds: ['repo_1', 'repo_1', 'repo_2'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('DUPLICATE_REPOSITORIES');
  });

  it('rejects repos belonging to another student with 400 (cross-student isolation)', async () => {
    // studentB tries to showcase a repo that belongs to studentA
    // The route queries { id: { in: ids }, studentId: <caller>, removedFromGithub: false }
    // — the mis-matched studentId means the DB returns 0 rows → 400 INVALID_REPOSITORIES
    mock(prisma.githubRepo.findMany).mockResolvedValue([]); // nothing matched for studentB

    const res = await request(app)
      .put('/api/student/github/showcase')
      .set('Cookie', `pc_student_session=${tokenB}`)
      .send({ repoIds: [fakeRepo.id] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_REPOSITORIES');
  });
});

// ---------------------------------------------------------------------------

describe('POST /api/student/github/connect — feature flag', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 or 404 when FEATURE_GITHUB_PORTFOLIO is false', async () => {
    // Override the feature flag for this test
    const originalFlag = env.FEATURE_GITHUB_PORTFOLIO;
    (env as any).FEATURE_GITHUB_PORTFOLIO = false;

    // The service's createConnectUrl checks the flag and throws a GithubAccountError
    // with statusCode 403, or the route returns 404 if unregistered — either is acceptable.
    mock(prisma.student.findUnique).mockResolvedValue({
      id: studentA.studentId,
      rollNo: studentA.rollNo,
      name: studentA.name,
    });

    const res = await request(app)
      .post('/api/student/github/connect')
      .set('Cookie', `pc_student_session=${tokenA}`);

    expect([403, 404]).toContain(res.status);

    (env as any).FEATURE_GITHUB_PORTFOLIO = originalFlag;
  });
});

// ---------------------------------------------------------------------------

describe('PUT /api/student/profile/skills — blocked when FEATURE_GITHUB_PORTFOLIO=true', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when feature flag is enabled (skills are managed by GitHub integration)', async () => {
    const originalFlag = env.FEATURE_GITHUB_PORTFOLIO;
    (env as any).FEATURE_GITHUB_PORTFOLIO = true;

    mock(prisma.studentProfile.upsert).mockResolvedValue({ id: 'prof_1', studentId: studentA.studentId });
    mock(prisma.skill.findMany).mockResolvedValue([]);
    mock(prisma.studentSkill.deleteMany).mockResolvedValue({ count: 0 });
    mock(prisma.studentSkill.createMany).mockResolvedValue({ count: 0 });
    mock(prisma.studentSkill.findMany).mockResolvedValue([]);

    const res = await request(app)
      .put('/api/student/profile/skills')
      .set('Cookie', `pc_student_session=${tokenA}`)
      .send({ skillNames: ['TypeScript'] });

    expect(res.status).toBe(403);

    (env as any).FEATURE_GITHUB_PORTFOLIO = originalFlag;
  });
});

// ---------------------------------------------------------------------------

describe('DELETE /api/student/github — disconnect safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes GithubAccount, GithubRepo, GithubStudentSkill but preserves StudentSkill rows', async () => {
    // The disconnect() service method runs inside $transaction. We simulate it
    // by making $transaction invoke the callback with a proxy that records calls.
    const txMock = {
      project:            { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      githubStudentSkill: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      githubRepo:         { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      githubAccount:      { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      githubOAuthState:   { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };

    mock(prisma.$transaction).mockImplementation(async (fn: any) => fn(txMock));

    const res = await request(app)
      .delete('/api/student/github')
      .set('Cookie', `pc_student_session=${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // GitHub-specific rows must be deleted
    expect(txMock.githubStudentSkill.deleteMany).toHaveBeenCalledWith({ where: { studentId: studentA.studentId } });
    expect(txMock.githubRepo.deleteMany).toHaveBeenCalledWith({ where: { studentId: studentA.studentId } });
    expect(txMock.githubAccount.deleteMany).toHaveBeenCalledWith({ where: { studentId: studentA.studentId } });

    // Legacy StudentSkill rows must NOT be touched — confirm no deleteMany was
    // called on the plain prisma.studentSkill mock (which was never set up above)
    expect(mock(prisma.studentSkill.deleteMany)).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

describe('Cross-student isolation — GET /api/student/github', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only returns data scoped to the authenticated student', async () => {
    // Student B's token; the service query uses B's studentId
    mock(prisma.student.findUnique).mockResolvedValue({
      id: studentB.studentId,
      githubReminderSnoozedUntil: null,
      githubAccount: null,
    });

    const res = await request(app)
      .get('/api/student/github')
      .set('Cookie', `pc_student_session=${tokenB}`);

    expect(res.status).toBe(200);
    // B has no connected account, so repos must be empty
    expect(res.body.connected).toBe(false);
    expect(res.body.repos).toEqual([]);

    // Verify the lookup was scoped to B's id, not A's
    expect(mock(prisma.student.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: studentB.studentId } }),
    );
  });
});
