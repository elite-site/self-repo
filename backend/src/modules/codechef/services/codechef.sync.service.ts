import crypto from 'crypto';
import { codeChefClient } from '../../../infrastructure/codechef.client';
import * as repo from '../codechef.repository';
import { computeCodeChefStars, CODECHEF_LIMITS } from '../codechef.constants';
import { logger } from '../../../utils/logger';
import type { CodeChefSyncTrigger } from '@prisma/client';

export async function executeSync(
  accountId: string,
  handle: string,
  trigger: CodeChefSyncTrigger,
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  let apiCalls = 0;

  try {
    const summary = await codeChefClient.fetchSummary(handle);
    apiCalls++;

    const profile = await codeChefClient.fetchProfile(handle);
    apiCalls++;

    const contests = await codeChefClient.fetchContests(handle);
    apiCalls++;

    const stats = await codeChefClient.fetchStats(handle);
    apiCalls++;

    const heatmap = await codeChefClient.fetchHeatmap(handle);
    apiCalls++;

    let badges = null;
    if (summary && summary.badgesCount > 0) {
      badges = await codeChefClient.fetchBadges(handle);
      apiCalls++;
    }

    const allFailed = !summary && !profile && !contests && !stats && !heatmap;
    if (allFailed) {
      const durationMs = Date.now() - startTime;
      await repo.createSyncLog({
        accountId,
        trigger,
        status: 'FAILED',
        durationMs,
        apiCalls,
        error: 'Upstream stats service was unavailable',
      });
      await repo.updateAccount(accountId, {
        status: 'ERROR',
        lastError: 'CodeChef stats service was temporarily unreachable',
      });
      return { success: false, error: 'Upstream service unavailable' };
    }

    const existingProfile = await repo.findProfileDataByAccountId(accountId);
    const existingData = (existingProfile as any) || {};

    const finalProfile = profile || existingData.profile || {};
    const finalContests = contests?.history ? contests.history.slice(-CODECHEF_LIMITS.MAX_CONTESTS_KEPT) : (existingData.contests || []);
    const finalHeatmap = heatmap || existingData.heatmap || {};
    const finalTopics = stats?.topicAnalysis || existingData.topics || [];
    const finalDifficulty = stats?.byDifficulty || existingData.difficulty || {};
    const finalBadges = badges?.list || existingData.badges || [];

    const payloadString = JSON.stringify({
      finalProfile,
      finalContests,
      finalHeatmap,
      finalTopics,
      finalDifficulty,
      finalBadges,
    });
    const currentHash = crypto.createHash('sha256').update(payloadString).digest('hex');
    const previousHash = existingData.profile?._hash;

    if (!previousHash || previousHash !== currentHash) {
      await repo.upsertProfileData(accountId, {
        account: { connect: { id: accountId } },
        profile: { ...finalProfile, _hash: currentHash },
        contests: finalContests,
        heatmap: finalHeatmap,
        topics: finalTopics,
        difficulty: finalDifficulty,
        badges: finalBadges,
      });
    }

    const rating = summary?.currentRating ?? contests?.rating ?? null;
    const stars = computeCodeChefStars(rating);

    await repo.updateAccount(accountId, {
      status: 'CONNECTED',
      lastSyncedAt: new Date(),
      lastError: null,
      displayName: profile?.displayName || null,
      avatarUrl: profile?.avatar || null,
      country: profile?.country || null,
      institution: profile?.institution || null,
      currentRating: rating,
      maxRating: summary?.maxRating ?? contests?.maxRating ?? null,
      stars,
      globalRank: contests?.globalRanking ?? null,
      topPercentage: contests?.topPercentage ?? null,
      totalSolved: stats?.totalSolved ?? summary?.totalSolved ?? null,
      totalContests: contests?.count ?? summary?.totalContests ?? null,
      totalActiveDays: heatmap?.totalActiveDays ?? summary?.totalActiveDays ?? null,
      currentStreak: heatmap?.currentStreak ?? null,
      longestStreak: heatmap?.longestStreak ?? null,
      badgesCount: summary?.badgesCount ?? badges?.count ?? null,
    });

    const durationMs = Date.now() - startTime;
    await repo.createSyncLog({
      accountId,
      trigger,
      status: 'SUCCESS',
      durationMs,
      apiCalls,
    });

    return { success: true };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    logger.error(`[CodeChefSyncService] Sync failed for account ${accountId}:`, { err });
    await repo.createSyncLog({
      accountId,
      trigger,
      status: 'FAILED',
      durationMs,
      apiCalls,
      error: err.message || 'Unknown sync error',
    });
    await repo.updateAccount(accountId, {
      status: 'ERROR',
      lastError: 'Sync error occurred while contacting CodeChef',
    });
    return { success: false, error: err.message };
  }
}
