import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { ssoService } from '../src/services/sso.service';

vi.mock('../src/lib/prisma', () => ({ prisma: { student: { findUnique: vi.fn() } } }));
vi.mock('../src/services/sso.service', () => ({
  ssoService: {
    getAuthUrl: vi.fn(),
    exchangeCode: vi.fn(),
    isAllowed: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (ssoService.isAllowed as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
});

const goodState = jwt.sign({ nonce: 'n1' }, env.STUDENT_JWT_SECRET, { expiresIn: '10m' });

describe('blank-email lockout (via the SSO callback route)', () => {
  it('no email is fabricated from a roll number', async () => {
    (ssoService.exchangeCode as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      email: '23k61a1201@sasi.ac.in',
      emailVerified: true,
      domain: 'sasi.ac.in',
      sub: '222',
    });
    (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/student/google/callback')
      .query({ code: 'c1', state: goodState });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('EMAIL_NOT_REGISTERED');
    expect(res.headers.location ?? '').not.toMatch(/token=/);
  });

  it('only a registered roster email yields a token', async () => {
    (ssoService.exchangeCode as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      email: 'test@sasi.ac.in',
      emailVerified: true,
      domain: 'sasi.ac.in',
      sub: '333',
    });
    (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/student/google/callback')
      .query({ code: 'c1', state: goodState });

    expect(prisma.student.findUnique).toHaveBeenCalledWith({ where: { email: 'test@sasi.ac.in' } });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('EMAIL_NOT_REGISTERED');
  });
});
