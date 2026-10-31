import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeCodeChefStars, generateVerificationCode, CODECHEF_HANDLE_REGEX } from '../src/modules/codechef/codechef.constants';
import { parseConnectBody, parseVisibilityBody, parseAdminFilterQuery } from '../src/modules/codechef/codechef.schemas';
import * as service from '../src/modules/codechef/codechef.service';
import * as repo from '../src/modules/codechef/codechef.repository';
import { codeChefClient } from '../src/infrastructure/codechef.client';

describe('CodeChef Constants & Star Ratings', () => {
  it('correctly validates handles with regex', () => {
    expect(CODECHEF_HANDLE_REGEX.test('tourist')).toBe(true);
    expect(CODECHEF_HANDLE_REGEX.test('gennady.korotkevich')).toBe(true);
    expect(CODECHEF_HANDLE_REGEX.test('chef_123')).toBe(true);
    expect(CODECHEF_HANDLE_REGEX.test('ab')).toBe(false); // too short
    expect(CODECHEF_HANDLE_REGEX.test('handle-with-hyphen')).toBe(false); // hyphens not allowed
    expect(CODECHEF_HANDLE_REGEX.test('handle$special')).toBe(false);
  });

  it('computes CodeChef stars matching official rating tiers', () => {
    expect(computeCodeChefStars(null)).toBeNull();
    expect(computeCodeChefStars(undefined)).toBeNull();
    expect(computeCodeChefStars(0)).toBeNull();
    expect(computeCodeChefStars(1250)).toBe(1); // 1★ < 1400
    expect(computeCodeChefStars(1399)).toBe(1);
    expect(computeCodeChefStars(1400)).toBe(2); // 2★ 1400-1599
    expect(computeCodeChefStars(1599)).toBe(2);
    expect(computeCodeChefStars(1600)).toBe(3); // 3★ 1600-1799
    expect(computeCodeChefStars(1799)).toBe(3);
    expect(computeCodeChefStars(1800)).toBe(4); // 4★ 1800-1999
    expect(computeCodeChefStars(1999)).toBe(4);
    expect(computeCodeChefStars(2000)).toBe(5); // 5★ 2000-2199
    expect(computeCodeChefStars(2199)).toBe(5);
    expect(computeCodeChefStars(2200)).toBe(6); // 6★ 2200-2499
    expect(computeCodeChefStars(2499)).toBe(6);
    expect(computeCodeChefStars(2500)).toBe(7); // 7★ >= 2500
    expect(computeCodeChefStars(3355)).toBe(7);
  });

  it('generates verification codes prefixed with ELITE-', () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^ELITE-[2-9A-Z]{6}$/);
  });

  it('parses connect body and rejects invalid handles', () => {
    expect(() => parseConnectBody({ handle: 'tourist' })).not.toThrow();
    expect(() => parseConnectBody({ handle: 'ab' })).toThrow('between 3 and 30 characters');
    expect(() => parseConnectBody({ handle: 'bad-handle' })).toThrow('may only contain');
    expect(() => parseConnectBody(null)).toThrow('must be an object');
  });

  it('parses visibility body', () => {
    expect(parseVisibilityBody({ showPublic: true })).toEqual({ showPublic: true });
    expect(() => parseVisibilityBody({ showPublic: 'yes' })).toThrow('must be a boolean');
  });

  it('caps admin query limits at 100', () => {
    const parsed = parseAdminFilterQuery({ page: '2', limit: '500' });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(100);
  });
});

describe('CodeChef Real Fixtures Parsing', () => {
  it('parses real gennady fixtures accurately', () => {
    const fixtureDir = path.join(__dirname, 'fixtures/codechef/gennady');
    const summary = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'summary.json'), 'utf8')).data;
    const profile = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'profile.json'), 'utf8')).data;
    const contests = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'contests.json'), 'utf8')).data;

    expect(summary.currentRating).toBe(3355);
    expect(summary.totalSolved).toBe(632);
    expect(profile.displayName).toBe('Gennady Korotkevich');
    expect(profile.avatar).toContain('https://');
    expect(contests.history.length).toBe(102);
    expect(computeCodeChefStars(summary.currentRating)).toBe(7);
  });

  it('tolerantly handles unpopulated tashif profile fixture', () => {
    const fixtureDir = path.join(__dirname, 'fixtures/codechef/tashif');
    const profile = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'profile.json'), 'utf8')).data;
    const summary = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'summary.json'), 'utf8')).data;

    expect(profile.displayName).toBeNull();
    expect(profile.avatar).toBeNull();
    expect(profile.bio).toBeNull();
    expect(summary.currentRating).toBeNull();
    expect(computeCodeChefStars(summary.currentRating)).toBeNull();
  });
});

describe('CodeChef Service Business Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns NOT_CONNECTED when student has no account', async () => {
    vi.spyOn(repo, 'findAccountByStudentId').mockResolvedValue(null);
    const status = await service.getStatus('non_existent_student');
    expect(status.connected).toBe(false);
    expect(status.status).toBe('NOT_CONNECTED');
  });

  it('prevents linking handle already owned by another student', async () => {
    vi.spyOn(repo, 'findAccountByHandle').mockResolvedValue({
      id: 'acc_other',
      studentId: 'student_different',
      handle: 'taken_handle',
      verified: true,
    } as any);

    await expect(service.connect('student_current', 'taken_handle')).rejects.toThrow(
      'This CodeChef handle is already linked to another student account',
    );
  });

  it('auto-verifies if student GitHub login matches CodeChef social.github', async () => {
    vi.spyOn(repo, 'findAccountByHandle').mockResolvedValue(null);
    vi.spyOn(repo, 'upsertAccount').mockResolvedValue({ id: 'acc_1' } as any);
    vi.spyOn(codeChefClient, 'fetchProfile').mockResolvedValue({
      displayName: 'Dev',
      username: 'dev_user',
      avatar: null,
      country: null,
      countryFlag: null,
      institution: null,
      company: null,
      bio: null,
      websites: [],
      social: { github: 'github_candidate', twitter: null, linkedin: null },
      verified: false,
    });
    vi.spyOn(repo, 'findAccountByStudentId').mockResolvedValue({
      id: 'acc_1',
      studentId: 'stud_1',
      handle: 'dev_user',
      verified: true,
      status: 'CONNECTED',
      showPublic: false,
      student: { name: 'Dev', rollNo: '21A91A0501', githubAccount: { login: 'github_candidate' } },
    } as any);
    const updateSpy = vi.spyOn(repo, 'updateAccount').mockResolvedValue({} as any);

    const result = await service.connect('stud_1', 'dev_user');
    expect(updateSpy).toHaveBeenCalledWith('acc_1', expect.objectContaining({ verified: true }));
    expect(result.connected).toBe(true);
  });

  it('verifies ownership when code is present in CodeChef bio', async () => {
    vi.spyOn(repo, 'findAccountByStudentId').mockResolvedValue({
      id: 'acc_1',
      studentId: 'stud_1',
      handle: 'codechef_user',
      verified: false,
      verifyCode: 'ELITE-9X2K7Q',
      verifyCodeExpiresAt: new Date(Date.now() + 100000),
      student: { githubAccount: null },
    } as any);

    vi.spyOn(codeChefClient, 'fetchProfile').mockResolvedValue({
      displayName: 'CodeChef User',
      username: 'codechef_user',
      avatar: null,
      country: null,
      countryFlag: null,
      institution: null,
      company: null,
      bio: 'Solving problems. Verification code: ELITE-9X2K7Q',
      websites: [],
      social: { github: null, twitter: null, linkedin: null },
      verified: false,
    });

    const updateSpy = vi.spyOn(repo, 'updateAccount').mockResolvedValue({} as any);
    const res = await service.verify('stud_1');
    expect(res.verified).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith('acc_1', expect.objectContaining({ verified: true }));
  });

  it('rejects verification if code has expired and regenerates a new one', async () => {
    vi.spyOn(repo, 'findAccountByStudentId').mockResolvedValue({
      id: 'acc_1',
      studentId: 'stud_1',
      handle: 'codechef_user',
      verified: false,
      verifyCode: 'ELITE-OLD123',
      verifyCodeExpiresAt: new Date(Date.now() - 10000), // expired
    } as any);

    const updateSpy = vi.spyOn(repo, 'updateAccount').mockResolvedValue({} as any);
    await expect(service.verify('stud_1')).rejects.toThrow('Verification code expired');
    expect(updateSpy).toHaveBeenCalledWith('acc_1', expect.objectContaining({ verifyCode: expect.stringMatching(/^ELITE-/) }));
  });

  it('enforces sync cooldown of 15 minutes', async () => {
    vi.spyOn(repo, 'findAccountByStudentId').mockResolvedValue({
      id: 'acc_1',
      studentId: 'stud_1',
      handle: 'chef_user',
      lastSyncedAt: new Date(Date.now() - 5 * 60 * 1000), // synced 5 mins ago (<15)
    } as any);

    await expect(service.sync('stud_1')).rejects.toThrow('Please wait');
  });
});
