import { describe, it, expect, vi } from 'vitest';
import { SSOService } from '../src/services/sso.service';

const okIdentity = { email: 'aakhila251201@sasi.ac.in', emailVerified: true, domain: 'sasi.ac.in', sub: '111' };

const createService = (verifier: unknown) => new SSOService(verifier as never);

describe('SSOService', () => {
  it('isAllowed accepts verified emails in the college domain', () => {
    expect(createService(null).isAllowed({ ...okIdentity, email: 'aaakhila251201@sasi.ac.in' })).toBe(true);
  });

  it('rejects non-college domains', () => {
    const svc = createService(null);
    expect(svc.isAllowed({ ...okIdentity, email: 'x@gmail.com', domain: 'gmail.com' })).toBe(false);
  });

  it('rejects unverified emails even in the college domain', () => {
    const svc = createService(null);
    expect(svc.isAllowed({ ...okIdentity, emailVerified: false })).toBe(false);
  });

  it('exchangeCode returns a canonical college identity from the id_token payload', async () => {
    const verifier = vi.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'AAKHILA251201@SASI.AC.IN',
        email_verified: true,
        hd: 'sasi.ac.in',
        sub: '111',
      }),
    });
    const svc = createService(verifier);
    const id = await svc.exchangeCode('dummy-code');
    expect(id.email).toBe('aakhila251201@sasi.ac.in');
    expect(id.emailVerified).toBe(true);
    expect(verifier).toHaveBeenCalledWith('dummy-code');
  });

  it('throws when the id_token carries no email', async () => {
    const verifier = vi.fn().mockResolvedValue({ getPayload: () => ({ sub: 'x' }) });
    const svc = createService(verifier);
    await expect(svc.exchangeCode('code')).rejects.toThrow(/email/i);
  });

  it('getAuthUrl targets the Google consent endpoint with the hosted domain', () => {
    const url = createService(null).getAuthUrl();
    expect(url).toMatch(/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
    expect(url).toContain('hd=sasi.ac.in');
  });

  it('consent callback target is the backend callback, not the SPA', () => {
    const url = new URL(createService(null).getAuthUrl());
    const redirectUri = url.searchParams.get('redirect_uri');
    expect(redirectUri).toBeTruthy();
    expect(redirectUri).toContain('/api/student/google/callback');
    expect(redirectUri).not.toMatch(/\/login$/);
  });
});
