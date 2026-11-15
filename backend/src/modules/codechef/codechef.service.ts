import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';
import * as repo from './codechef.repository';
import { executeSync } from './services/codechef.sync.service';
import { CODECHEF_LIMITS, extractCodeChefHandle } from './codechef.constants';
import type { CodeChefStatusDto, CodeChefDetailsDto, AdminCodeChefFilterParams } from './codechef.types';

export async function getStatus(studentId: string, skipProfileAutoConnect = false): Promise<CodeChefStatusDto> {
  let account = await repo.findAccountByStudentId(studentId);

  // Auto-connect from student profile links if no account exists yet
  if (!account && !skipProfileAutoConnect) {
    const student = await repo.findStudentWithProfile(studentId);
    const profileUrl = student?.profile?.codechefUrl;
    const handle = extractCodeChefHandle(profileUrl);
    if (handle) {
      try {
        await connect(studentId, handle);
        account = await repo.findAccountByStudentId(studentId);
      } catch (err: any) {
        logger.warn(`[CodeChefService] Auto-connect from profile failed for studentId=${studentId}:`, { err });
      }
    }
  } else if (account) {
    // Legacy unverified accounts auto-heal to verified
    if (!account.verified) {
      try {
        await repo.updateAccount(account.id, {
          verified: true,
          verifiedAt: new Date(),
          verifyCode: null,
          verifyCodeExpiresAt: null,
        });
      } catch (err: any) {
        logger.warn(`[CodeChefService] Legacy account auto-heal failed for account.id=${account.id}:`, { err });
      }
      account.verified = true;
      account.verifiedAt = new Date();
      account.verifyCode = null;
      account.verifyCodeExpiresAt = null;
    }

    // If account exists, keep profile.codechefUrl in sync
    const student = await repo.findStudentWithProfile(studentId);
    if (!student?.profile?.codechefUrl && account.handle) {
      await repo.updateProfileCodeChefUrl(studentId, `https://www.codechef.com/users/${account.handle}`);
    } else if (student?.profile?.codechefUrl && !skipProfileAutoConnect) {
      const profileHandle = extractCodeChefHandle(student.profile.codechefUrl);
      if (profileHandle && profileHandle.toLowerCase() !== account.handle.toLowerCase()) {
        try {
          await connect(studentId, profileHandle);
          account = await repo.findAccountByStudentId(studentId);
        } catch (err: any) {
          logger.warn(`[CodeChefService] Re-sync from updated profile handle failed for studentId=${studentId}:`, { err });
        }
      }
    }
  }

  if (!account) {
    return {
      connected: false,
      status: 'NOT_CONNECTED',
      handle: null,
      displayName: null,
      avatarUrl: null,
      verified: false,
      verifiedAt: null,
      verifyCode: null,
      verifyCodeExpiresAt: null,
      showPublic: false,
      currentRating: null,
      maxRating: null,
      stars: null,
      globalRank: null,
      totalSolved: null,
      totalContests: null,
      lastSyncedAt: null,
      lastError: null,
      syncCooldown: { canSync: false, nextSyncAllowedAt: null, cooldownMinutes: 15, manualSyncCountToday: 0, dailyCap: 10 },
    };
  }

  const now = Date.now();
  const lastSyncTime = account.lastSyncedAt ? new Date(account.lastSyncedAt).getTime() : 0;
  const cooldownMs = CODECHEF_LIMITS.DEFAULT_COOLDOWN_MIN * 60 * 1000;
  const nextSyncAllowedAt = lastSyncTime ? new Date(lastSyncTime + cooldownMs).toISOString() : null;
  const canSync = !lastSyncTime || now - lastSyncTime >= cooldownMs;

  const displayStatus = !account.verified ? 'UNVERIFIED' : account.status;

  return {
    connected: true,
    status: displayStatus as any,
    handle: account.handle,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    verified: account.verified,
    verifiedAt: account.verifiedAt ? account.verifiedAt.toISOString() : null,
    verifyCode: account.verified ? null : account.verifyCode,
    verifyCodeExpiresAt: account.verified ? null : account.verifyCodeExpiresAt?.toISOString() || null,
    showPublic: account.showPublic,
    currentRating: account.currentRating,
    maxRating: account.maxRating,
    stars: account.stars,
    globalRank: account.globalRank,
    totalSolved: account.totalSolved,
    totalContests: account.totalContests,
    lastSyncedAt: account.lastSyncedAt ? account.lastSyncedAt.toISOString() : null,
    lastError: account.lastError,
    syncCooldown: {
      canSync,
      nextSyncAllowedAt: canSync ? null : nextSyncAllowedAt,
      cooldownMinutes: CODECHEF_LIMITS.DEFAULT_COOLDOWN_MIN,
      manualSyncCountToday: 0,
      dailyCap: CODECHEF_LIMITS.DEFAULT_DAILY_CAP,
    },
  };
}

export async function getDetails(studentId: string): Promise<CodeChefDetailsDto> {
  let account = await repo.findAccountByStudentId(studentId);
  if (!account) {
    const student = await repo.findStudentWithProfile(studentId);
    const profileUrl = student?.profile?.codechefUrl;
    const handle = extractCodeChefHandle(profileUrl);
    if (handle) {
      try {
        await connect(studentId, handle);
        account = await repo.findAccountByStudentId(studentId);
      } catch (err: any) {
        logger.warn(`[CodeChefService] Auto-connect in getDetails failed for studentId=${studentId}:`, { err });
      }
    }
  }

  if (!account) throw new AppError('NOT_FOUND', 'No CodeChef account connected for this student', 404);

  const profileData = await repo.findProfileDataByAccountId(account.id);
  const data = (profileData as any) || {};

  return {
    handle: account.handle,
    verified: account.verified,
    status: account.status as any,
    lastSyncedAt: account.lastSyncedAt?.toISOString() || null,
    profile: data.profile || { displayName: account.displayName, username: account.handle, avatar: account.avatarUrl, country: account.country, countryFlag: null, institution: account.institution, company: null, bio: null, websites: [], social: { github: null, twitter: null, linkedin: null }, verified: account.verified },
    summary: {
      totalSolved: account.totalSolved || 0,
      totalActiveDays: account.totalActiveDays || 0,
      totalContests: account.totalContests || 0,
      currentRating: account.currentRating,
      maxRating: account.maxRating,
      stars: account.stars,
      rank: account.stars ? `${account.stars}★` : null,
      globalRanking: account.globalRank,
      topPercentage: account.topPercentage,
      longestStreak: account.longestStreak || 0,
      currentStreak: account.currentStreak || 0,
      badgesCount: account.badgesCount || 0,
    },
    contests: data.contests || [],
    heatmap: data.heatmap || { totalSubmissions: 0, currentStreak: 0, longestStreak: 0, dailyContributions: [] },
    topics: data.topics || [],
    difficulty: data.difficulty || {},
    badges: data.badges || [],
  };
}

export async function connect(studentId: string, rawHandle: string): Promise<CodeChefStatusDto> {
  const handle = extractCodeChefHandle(rawHandle) || rawHandle.trim();
  const existing = await repo.findAccountByHandle(handle);
  if (existing && existing.studentId !== studentId) {
    throw new AppError('CONFLICT', 'This CodeChef handle is already linked to another student account', 409);
  }

  const account = await repo.upsertAccount(studentId, handle, {
    student: { connect: { id: studentId } },
    handle,
    verified: true,
    verifiedAt: new Date(),
    verifyCode: null,
    verifyCodeExpiresAt: null,
    status: 'CONNECTED',
  });

  // Always keep StudentProfile.codechefUrl in sync
  const canonicalUrl = `https://www.codechef.com/users/${handle}`;
  await repo.updateProfileCodeChefUrl(studentId, canonicalUrl);

  // Trigger non-blocking initial sync
  void executeSync(account.id, handle, 'CONNECT');

  return getStatus(studentId, true);
}

export async function sync(studentId: string): Promise<CodeChefStatusDto> {
  const account = await repo.findAccountByStudentId(studentId);
  if (!account) throw new AppError('NOT_FOUND', 'No CodeChef account connected', 404);

  const now = Date.now();
  const lastSyncTime = account.lastSyncedAt ? new Date(account.lastSyncedAt).getTime() : 0;
  const cooldownMs = CODECHEF_LIMITS.DEFAULT_COOLDOWN_MIN * 60 * 1000;
  if (lastSyncTime && now - lastSyncTime < cooldownMs) {
    const waitMins = Math.ceil((cooldownMs - (now - lastSyncTime)) / 60000);
    throw new AppError('RATE_LIMITED', `Please wait ${waitMins} minute(s) before syncing again.`, 429);
  }

  await executeSync(account.id, account.handle, 'MANUAL');
  return getStatus(studentId);
}

export async function setVisibility(studentId: string, showPublic: boolean): Promise<{ success: boolean; showPublic: boolean }> {
  const account = await repo.findAccountByStudentId(studentId);
  if (!account) throw new AppError('NOT_FOUND', 'No CodeChef account connected', 404);
  await repo.updateAccount(account.id, { showPublic });
  return { success: true, showPublic };
}

export async function disconnect(studentId: string): Promise<{ success: boolean }> {
  const account = await repo.findAccountByStudentId(studentId);
  if (!account) throw new AppError('NOT_FOUND', 'No CodeChef account connected', 404);
  await repo.deleteAccountByStudentId(studentId);
  // Clear profile link as well so it doesn't immediately re-link on getStatus
  await repo.updateProfileCodeChefUrl(studentId, null);
  return { success: true };
}

export async function syncAccountFromProfile(studentId: string, handleOrUrl: string): Promise<void> {
  const cleanHandle = extractCodeChefHandle(handleOrUrl) || handleOrUrl.trim();
  if (!cleanHandle) return;
  const existing = await repo.findAccountByStudentId(studentId);
  if (!existing || existing.handle.toLowerCase() !== cleanHandle.toLowerCase() || !existing.verified) {
    await connect(studentId, cleanHandle);
  }
}

export async function backfillUnlinkedProfileAccounts(): Promise<number> {
  await repo.verifyAllUnverifiedAccounts().catch((err: any) => {
    logger.warn('[CodeChefService] Bulk verify auto-heal failed:', { err });
  });

  const unlinkedProfiles = await repo.findUnlinkedProfilesWithCodeChef();
  let count = 0;
  for (const p of unlinkedProfiles) {
    const handle = extractCodeChefHandle(p.codechefUrl);
    if (!handle) continue;
    try {
      const existing = await repo.findAccountByHandle(handle);
      if (existing && existing.studentId !== p.studentId) continue;

      const account = await repo.upsertAccount(p.studentId, handle, {
        student: { connect: { id: p.studentId } },
        handle,
        verified: true,
        verifiedAt: new Date(),
        verifyCode: null,
        verifyCodeExpiresAt: null,
        status: 'CONNECTED',
      });

      // Non-blocking initial sync
      void executeSync(account.id, handle, 'CONNECT');
      count++;
    } catch (err: any) {
      logger.warn(`[CodeChefService] Backfill failed for studentId=${p.studentId}:`, { err });
    }
  }
  return count;
}

export async function getAdminStudents(params: AdminCodeChefFilterParams) {
  const result = await repo.findStudentsWithCodeChef(params);
  return {
    students: result.students.map((s: any) => {
      const profileHandle = extractCodeChefHandle(s.profile?.codechefUrl);
      const effectiveHandle = s.codechefAccount?.handle || profileHandle || null;
      const isConnected = Boolean(s.codechefAccount || effectiveHandle);

      return {
        id: s.codechefAccount?.id || s.id,
        studentId: s.id,
        name: s.name,
        rollNo: s.rollNo,
        year: s.year,
        section: s.section,
        handle: effectiveHandle,
        verified: Boolean(s.codechefAccount?.verified ?? isConnected),
        status: (!isConnected ? 'NOT_CONNECTED' : (s.codechefAccount?.status && s.codechefAccount.status !== 'UNVERIFIED' ? s.codechefAccount.status : 'CONNECTED')) as any,
        currentRating: s.codechefAccount?.currentRating || null,
        stars: s.codechefAccount?.stars || null,
        totalSolved: s.codechefAccount?.totalSolved || null,
        totalContests: s.codechefAccount?.totalContests || null,
        lastSyncedAt: s.codechefAccount?.lastSyncedAt?.toISOString() || null,
      };
    }),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}

export async function getAdminLeaderboard(year?: number, limit = 10) {
  const entries = await repo.findLeaderboard(year, limit);
  return {
    leaderboard: entries.map((e, index) => ({
      rank: index + 1,
      studentId: e.studentId,
      name: e.student.name,
      rollNo: e.student.rollNo,
      year: e.student.year,
      handle: e.handle,
      currentRating: Math.round(e.currentRating || 0),
      stars: e.stars || 1,
      totalSolved: e.totalSolved || 0,
      totalContests: e.totalContests || 0,
    })),
  };
}

export async function getAdminStats() {
  return repo.findStatsAggregate();
}

export async function adminResync(studentId: string) {
  const account = await repo.findAccountByStudentId(studentId);
  if (!account) throw new AppError('NOT_FOUND', 'Student has no CodeChef account connected', 404);
  return executeSync(account.id, account.handle, 'ADMIN');
}

export async function adminVerify(studentId: string) {
  const account = await repo.findAccountByStudentId(studentId);
  if (!account) throw new AppError('NOT_FOUND', 'Student has no CodeChef account connected', 404);
  await repo.updateAccount(account.id, { verified: true, verifiedAt: new Date(), verifyCode: null, verifyCodeExpiresAt: null });
  return { success: true, verified: true };
}

export async function adminUnlink(studentId: string) {
  const account = await repo.findAccountByStudentId(studentId);
  if (!account) throw new AppError('NOT_FOUND', 'Student has no CodeChef account connected', 404);
  await repo.deleteAccountByStudentId(studentId);
  return { success: true, message: 'Account unlinked by administrator' };
}

export async function syncScheduledBatch(limit = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
  const staleAccounts = await repo.findStaleAccounts(limit);
  let succeeded = 0;
  let failed = 0;

  for (const acc of staleAccounts) {
    const res = await executeSync(acc.id, acc.handle, 'SCHEDULED');
    if (res.success) succeeded++;
    else failed++;
  }

  return { processed: staleAccounts.length, succeeded, failed };
}
