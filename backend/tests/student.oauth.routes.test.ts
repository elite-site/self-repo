import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { ssoService } from '../src/services/sso.service';

vi.mock('../src/lib/prisma', () => ({ prisma: { student: { findUnique: vi.fn() } } }));
vi.mock('../src/services/sso.service', () => {
  const ssoService = {
    getAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?hd=sasi.ac.in&x=1'),
    exchangeCode: vi.fn(),
    isAllowed: vi.fn(),
  };
  return { ssoService };
});

beforeEach(() => {
  vi.clearAllMocks();
  (ssoService.exchangeCode as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    email: 'aakhila251201@sasi.ac.in',
    emailVerified: true,
    domain: 'sasi.ac.in',
    sub: '111',
  });
  (ssoService.isAllowed as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
  (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 's1',
    rollNo: '25K61A1201',
    name: 'Akhila',
    email: 'aakhila251201@sasi.ac.in',
  });
});

const goodState = jwt.sign({ nonce: 'n1' }, env.STUDENT_JWT_SECRET, { expiresIn: '10m' });

describe('student google oauth', () => {
  it('authorize redirects to the Google consent URL with a signed state', async () => {
    const res = await request(app).get('/api/student/google/authorize');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
    expect(res.headers.location).toContain('state=');
    const state = /[?&]state=([^&]+)/.exec(res.headers.location)?.[1];
    expect(state).toBeTruthy();
    expect(() => jwt.verify(state!, env.STUDENT_JWT_SECRET)).not.toThrow();
  });

  it('callback redirects to the student app with an httpOnly session cookie', async () => {
    const res = await request(app)
      .get('/api/student/google/callback')
      .query({ code: 'c1', state: goodState });
    expect(res.status).toBe(302);
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(setCookie).toBeDefined();
    expect(setCookie!.some((c) => c.includes('pc_student_session='))).toBe(true);
    expect(setCookie!.some((c) => c.includes('HttpOnly'))).toBe(true);
    expect(res.headers.location).not.toMatch(/token=/);
    expect(prisma.student.findUnique).toHaveBeenCalledWith({ where: { email: 'aakhila251201@sasi.ac.in' } });
  });

  it('403s when the college email is not in the roster', async () => {
    (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await request(app)
      .get('/api/student/google/callback')
      .query({ code: 'c1', state: goodState });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('EMAIL_NOT_REGISTERED');
  });

  it('403s for a non-college domain', async () => {
    (ssoService.isAllowed as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await request(app)
      .get('/api/student/google/callback')
      .query({ code: 'c1', state: goodState });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('DOMAIN_FORBIDDEN');
  });

  it('rejects an invalid/expired state', async () => {
    const res = await request(app)
      .get('/api/student/google/callback')
      .query({ code: 'c1', state: 'not-a-real-state' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_STATE');
  });
});