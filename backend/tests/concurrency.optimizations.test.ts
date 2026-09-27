import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { buildDatabaseUrl } from '../src/lib/prisma';
import { getClientIdentity } from '../src/middleware/rateLimiter';
import { STUDENT_SESSION_COOKIE_NAME } from '../src/middleware/studentAuth';
import app from '../src/server';
import { prisma } from '../src/lib/prisma';
import { driveService } from '../src/services/drive.service';

vi.mock('../src/lib/prisma', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/prisma')>();
  return {
    ...actual,
    prisma: {
      $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    },
  };
});

vi.mock('../src/services/drive.service', () => ({
  driveService: {
    assertRootReachable: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Supabase Pooler & Database URL Tuning', () => {
  it('detects Supabase pooler by port 6543 and configures PgBouncer flags', () => {
    const rawUrl = 'postgres://postgres.abc:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
    const tuned = buildDatabaseUrl(rawUrl);
    const parsed = new URL(tuned);

    expect(parsed.searchParams.get('pgbouncer')).toBe('true');
    expect(parsed.searchParams.get('statement_cache_size')).toBe('0');
    expect(parsed.searchParams.get('connection_limit')).toBe('15');
    expect(parsed.searchParams.get('pool_timeout')).toBe('15');
    expect(parsed.searchParams.get('connect_timeout')).toBe('10');
  });

  it('detects pooler by hostname containing pooler.supabase.com', () => {
    const rawUrl = 'postgres://postgres:pw@custom.pooler.supabase.com/postgres';
    const tuned = buildDatabaseUrl(rawUrl);
    const parsed = new URL(tuned);

    expect(parsed.searchParams.get('pgbouncer')).toBe('true');
    expect(parsed.searchParams.get('statement_cache_size')).toBe('0');
    expect(parsed.searchParams.get('connection_limit')).toBe('15');
  });

  it('detects pooler by explicit pgbouncer=true query parameter', () => {
    const rawUrl = 'postgres://user:pw@db.local:5432/mydb?pgbouncer=true';
    const tuned = buildDatabaseUrl(rawUrl);
    const parsed = new URL(tuned);

    expect(parsed.searchParams.get('pgbouncer')).toBe('true');
    expect(parsed.searchParams.get('statement_cache_size')).toBe('0');
    expect(parsed.searchParams.get('connection_limit')).toBe('15');
  });

  it('preserves existing connection_limit if already configured by user', () => {
    const rawUrl = 'postgres://user:pw@aws-0-ap-south-1.pooler.supabase.com:6543/db?connection_limit=25';
    const tuned = buildDatabaseUrl(rawUrl);
    const parsed = new URL(tuned);

    expect(parsed.searchParams.get('connection_limit')).toBe('25');
    expect(parsed.searchParams.get('statement_cache_size')).toBe('0');
  });

  it('configures statement caching for standard direct Postgres connections', () => {
    const rawUrl = 'postgres://postgres:password@db.supabase.co:5432/postgres';
    const tuned = buildDatabaseUrl(rawUrl);
    const parsed = new URL(tuned);

    expect(parsed.searchParams.get('pgbouncer')).toBeNull();
    expect(parsed.searchParams.get('statement_cache_size')).toBe('100');
    expect(parsed.searchParams.get('connection_limit')).toBe('20');
  });

  it('handles invalid / non-URL string gracefully without throwing', () => {
    expect(buildDatabaseUrl('in-memory-db-stub')).toBe('in-memory-db-stub');
  });
});

describe('Campus NAT-Friendly Rate Limiter Client Identity', () => {
  it('identifies authenticated student via req.student', () => {
    const req = { student: { studentId: 'stud_456' } };
    expect(getClientIdentity(req)).toBe('student_stud_456');
  });

  it('identifies authenticated admin user via req.user', () => {
    const req = { user: { userId: 'admin_789' } };
    expect(getClientIdentity(req)).toBe('user_admin_789');
  });

  it('identifies student by peeking at JWT session cookie', () => {
    const token = jwt.sign({ studentId: 'stud_cookie_123', rollNo: '23K61A1201' }, 'secret');
    const req = { cookies: { [STUDENT_SESSION_COOKIE_NAME]: token } };
    expect(getClientIdentity(req)).toBe('student_stud_cookie_123');
  });

  it('identifies student by peeking at Authorization Bearer header', () => {
    const token = jwt.sign({ studentId: 'stud_bearer_456', rollNo: '23K61A1202' }, 'secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    expect(getClientIdentity(req)).toBe('student_stud_bearer_456');
  });

  it('falls back to client IP when unauthenticated', () => {
    const req = { ip: '10.0.0.5' };
    expect(getClientIdentity(req)).toBe('ip_10.0.0.5');
  });

  it('extracts client IP from x-forwarded-for header when behind proxy', () => {
    const req = { headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' } };
    expect(getClientIdentity(req)).toBe('ip_203.0.113.195');
  });
});

describe('Readiness Probe Caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves cached status on rapid consecutive /ready probes', async () => {
    const res1 = await request(app).get('/ready');
    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('ok');

    const res2 = await request(app).get('/ready');
    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe('ok');
    // Timestamp should be identical because it was served from cache
    expect(res2.body.timestamp).toBe(res1.body.timestamp);
  });
});
