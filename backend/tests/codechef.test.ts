import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeCodeChefStars, CODECHEF_HANDLE_REGEX, extractCodeChefHandle } from '../src/modules/codechef/codechef.constants';
import { parseConnectBody, parseVisibilityBody, parseAdminFilterQuery } from '../src/modules/codechef/codechef.schemas';
import * as service from '../src/modules/codechef/codechef.service';
import * as repo from '../src/modules/codechef/codechef.repository';
import * as syncService from '../src/modules/codechef/services/codechef.sync.service';

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

  it('extracts CodeChef handle from diverse URL formats and usernames', () => {
    expect(extractCodeChefHandle('https://www.codechef.com/users/tourist')).toBe('tourist');
    expect(extractCodeChefHandle('https://codechef.com/users/sathvikganti/')).toBe('sathvikganti');
    expect(extractCodeChefHandle('codechef.com/users/chetu_213')).toBe('chetu_213');
    expect(extractCodeChefHandle('@chef123')).toBe('chef123');
    expect(extractCodeChefHandle('chef123')).toBe('chef123');
    expect(extractCodeChefHandle('https://www.codechef.com/users/p_pavan_1435?tab=ratings#top')).toBe('p_pavan_1435');
    expect(extractCodeChefHandle('')).toBeNull();
    expect(extractCodeChefHandle(null)).toBeNull();
    expect(extractCodeChefHandle('https://codechef.com')).toBeNull();
    expect(extractCodeChefHandle('invalid handle spaces')).toBeNull();
  });

  it('parses connect body and extracts handle from profile URL or bare handle', () => {
    expect(parseConnectBody({ handle: 'tourist' })).toEqual({ handle: 'tourist' });
    expect(parseConnectBody({ handle: 'https://codechef.com/users/tourist' })).toEqual({ handle: 'tourist' });
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
    vi.spyOn(syncService, 'executeSync').mockResolvedValue({ success: true });
    vi.spyOn(repo, 'updateProfileCodeChefUrl').mockResolvedValue({} as any);
  });

  it('returns NOT_CONNECTED when student has no account and no profile link', async () => {
    vi.spyOn(repo, 'findAccountByStudentId').mockResolvedValue(null);
    vi.spyOn(repo, 'findStudentWithProfile').mockResolvedValue(null);
    const status = await service.getStatus('non_existent_student');
    expect(status.connected).toBe(false);
    expect(status.status).toBe('NOT_CONNECTED');
  });

  it('auto-connects student from profile links when no account exists yet', async () => {
    let accountCreated = false;
    vi.spyOn(repo, 'findAccountByStudentId').mockImplementation(async () => {
      if (!accountCreated) return null;
      return {
        id: 'acc_auto',
        studentId: 'stud_123',
        handle: 'auto_chef',
        verified: false,
        status: 'CONNECTED',
        lastSyncedAt: null,
      } as any;
    });

    vi.spyOn(repo, 'findStudentWithProfile').mockResolvedValue({
      id: 'stud_123',
      rollNo: '21A91A0501',
      name: 'Chef Student',
      profile: { id: 'prof_1', codechefUrl: 'https://www.codechef.com/users/auto_chef' },
      githubAccount: null,
    } as any);

    vi.spyOn(repo, 'findAccountByHandle').mockResolvedValue(null);
    const upsertAccountSpy = vi.spyOn(repo, 'upsertAccount').mockImplementation(async () => {
      accountCreated = true;
      return { id: 'acc_auto' } as any;
    });
    const updateProfileSpy = vi.spyOn(repo, 'updateProfileCodeChefUrl').mockResolvedValue({} as any);

    const status = await service.getStatus('stud_123');
    expect(upsertAccountSpy).toHaveBeenCalledWith('stud_123', 'auto_chef', expect.any(Object));
    expect(updateProfileSpy).toHaveBeenCalledWith('stud_123', 'https://www.codechef.com/users/auto_chef');
    expect(status.connected).toBe(true);
    expect(status.handle).toBe('auto_chef');
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

  it('connects and immediately marks account as verified, syncing profile link', async () => {
    vi.spyOn(repo, 'findAccountByHandle').mockResolvedValue(null);
    const upsertSpy = vi.spyOn(repo, 'upsertAccount').mockResolvedValue({ id: 'acc_1' } as any);
    const updateProfileSpy = vi.spyOn(repo, 'updateProfileCodeChefUrl').mockResolvedValue({} as any);
    vi.spyOn(repo, 'findAccountByStudentId').mockResolvedValue({
      id: 'acc_1',
      studentId: 'stud_1',
      handle: 'dev_user',
      verified: true,
      status: 'CONNECTED',
      showPublic: false,
      student: { name: 'Dev', rollNo: '21A91A0501' },
    } as any);

    const result = await service.connect('stud_1', 'dev_user');
    expect(upsertSpy).toHaveBeenCalledWith('stud_1', 'dev_user', expect.objectContaining({
      verified: true,
      verifyCode: null,
    }));
    expect(updateProfileSpy).toHaveBeenCalledWith('stud_1', 'https://www.codechef.com/users/dev_user');
    expect(result.connected).toBe(true);
    expect(result.verified).toBe(true);
  });

  it('clears student profile link on disconnect', async () => {
    vi.spyOn(repo, 'findAccountByStudentId').mockResolvedValue({
      id: 'acc_1',
      studentId: 'stud_1',
    } as any);
    const deleteSpy = vi.spyOn(repo, 'deleteAccountByStudentId').mockResolvedValue({} as any);
    const updateProfileSpy = vi.spyOn(repo, 'updateProfileCodeChefUrl').mockResolvedValue({} as any);

    const res = await service.disconnect('stud_1');
    expect(res.success).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith('stud_1');
    expect(updateProfileSpy).toHaveBeenCalledWith('stud_1', null);
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
