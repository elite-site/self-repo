import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { githubSyncService } from './github.sync.service';
import { GithubSyncTrigger } from '@prisma/client';

export class GithubAccountError extends Error {
  statusCode: number;
  code?: string;
  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = 'GithubAccountError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class GithubAccountService {
  /**
   * Generates a GitHub OAuth authorization URL with state and PKCE verifier.
   * State and verifier are persisted in GithubOAuthState for 10 minutes.
   */
  async createConnectUrl(studentId: string): Promise<string> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new GithubAccountError(404, 'Student not found', 'STUDENT_NOT_FOUND');
    }

    // Generate high-entropy state and PKCE verifier/challenge
    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await prisma.githubOAuthState.create({
      data: {
        studentId,
        state,
        codeVerifier,
        expiresAt,
      },
    });

    const params = new URLSearchParams({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      // No repo scope, public profile only
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Validates OAuth state, exchanges code for user token using PKCE verifier,
   * queries GitHub user info, ensures single user link, upserts account,
   * immediately discards user token, and enqueues initial sync.
   */
  async handleCallback(studentId: string, code: string, state: string) {
    const stateRecord = await prisma.githubOAuthState.findUnique({
      where: { state },
    });

    if (!stateRecord) {
      throw new GithubAccountError(400, 'Invalid OAuth state parameter', 'INVALID_STATE');
    }

    if (stateRecord.usedAt) {
      throw new GithubAccountError(400, 'OAuth state has already been used', 'STATE_ALREADY_USED');
    }

    if (new Date() > stateRecord.expiresAt) {
      throw new GithubAccountError(400, 'OAuth session expired. Please connect again.', 'STATE_EXPIRED');
    }

    if (stateRecord.studentId !== studentId) {
      throw new GithubAccountError(403, 'OAuth state does not match the active student session', 'STATE_STUDENT_MISMATCH');
    }

    // Mark state as consumed (single-use)
    await prisma.githubOAuthState.update({
      where: { id: stateRecord.id },
      data: { usedAt: new Date() },
    });

    // Exchange authorization code for user access token with PKCE code_verifier
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Self-Introduction-Portal/1.0',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_OAUTH_REDIRECT_URI,
        code_verifier: stateRecord.codeVerifier,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      throw new GithubAccountError(
        400,
        tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with GitHub',
        'GITHUB_OAUTH_EXCHANGE_FAILED'
      );
    }

    const userToken = tokenData.access_token;

    // Fetch user public profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${userToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Self-Introduction-Portal/1.0',
        'X-GitHub-Api-Version': env.GITHUB_API_VERSION,
      },
    });

    if (!userRes.ok) {
      throw new GithubAccountError(502, 'Failed to fetch user profile from GitHub API', 'GITHUB_USER_FETCH_FAILED');
    }

    const githubUser = await userRes.json();
    // User token is never persisted in database or logs — discarded immediately here.

    const githubUserId = BigInt(githubUser.id);

    // Ensure this GitHub account is not already linked to another student
    const existingOther = await prisma.githubAccount.findUnique({
      where: { githubUserId },
    });

    if (existingOther && existingOther.studentId !== studentId) {
      throw new GithubAccountError(
        409,
        'This GitHub account is already linked to another student portfolio.',
        'GITHUB_ACCOUNT_ALREADY_LINKED'
      );
    }

    // Upsert GithubAccount for this student
    const account = await prisma.githubAccount.upsert({
      where: { studentId },
      update: {
        githubUserId,
        login: githubUser.login,
        avatarUrl: githubUser.avatar_url || null,
        syncStatus: 'QUEUED',
        syncError: null,
      },
      create: {
        studentId,
        githubUserId,
        login: githubUser.login,
        avatarUrl: githubUser.avatar_url || null,
        syncStatus: 'QUEUED',
      },
    });

    // Enqueue initial sync in background
    githubSyncService.queueSync(studentId, GithubSyncTrigger.CONNECT).catch((err) => {
      console.error(`[GitHubSync] Initial connect sync failed for student ${studentId}:`, err);
    });

    return {
      id: account.id,
      login: account.login,
      avatarUrl: account.avatarUrl,
      githubUserId: String(account.githubUserId),
    };
  }

  /**
   * Disconnect GitHub: deletes GithubAccount, GithubRepo, and GithubStudentSkill.
   * All legacy manual data (Student, Project, StudentSkill) remains intact.
   */
  async disconnect(studentId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Unlink any Project relations to GithubRepo to preserve projects
      await tx.project.updateMany({
        where: { studentId, githubRepoId: { not: null } },
        data: { githubRepoId: null },
      });

      await tx.githubStudentSkill.deleteMany({ where: { studentId } });
      await tx.githubRepo.deleteMany({ where: { studentId } });
      await tx.githubAccount.deleteMany({ where: { studentId } });
      await tx.githubOAuthState.deleteMany({ where: { studentId } });
    });
  }

  /**
   * Sets githubReminderSnoozedUntil to now + 7 days
   */
  async snoozeReminder(studentId: string): Promise<{ snoozedUntil: Date }> {
    const snoozedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.student.update({
      where: { id: studentId },
      data: { githubReminderSnoozedUntil: snoozedUntil },
    });
    return { snoozedUntil };
  }

  /**
   * Returns current GitHub integration status, account details, cooldown,
   * repos, showcased repos, and computed skills with BigInt values serialized to string.
   */
  async getStatus(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        githubReminderSnoozedUntil: true,
        githubAccount: true,
      },
    });

    if (!student || !student.githubAccount) {
      return {
        connected: false,
        account: null,
        cooldownRemainingSeconds: 0,
        dailySyncsRemaining: env.GITHUB_SYNC_DAILY_CAP,
        repos: [],
        showcasedRepos: [],
        skills: [],
        reminderSnoozedUntil: student?.githubReminderSnoozedUntil || null,
      };
    }

    const account = student.githubAccount;
    const now = new Date();

    let cooldownRemainingSeconds = 0;
    if (account.nextSyncAllowedAt && account.nextSyncAllowedAt > now) {
      cooldownRemainingSeconds = Math.max(0, Math.ceil((account.nextSyncAllowedAt.getTime() - now.getTime()) / 1000));
    }

    let dailyCount = account.manualSyncCountToday;
    if (account.manualSyncDay) {
      const isToday = account.manualSyncDay.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
      if (!isToday) {
        dailyCount = 0;
      }
    }
    const dailySyncsRemaining = Math.max(0, env.GITHUB_SYNC_DAILY_CAP - dailyCount);

    const [repos, skills] = await Promise.all([
      prisma.githubRepo.findMany({
        where: { studentId, removedFromGithub: false, isFork: false },
        orderBy: [{ isShowcased: 'desc' }, { showcaseRank: 'asc' }, { stars: 'desc' }, { pushedAt: 'desc' }],
      }),
      prisma.githubStudentSkill.findMany({
        where: { studentId },
        include: { skill: true },
        orderBy: [{ repoCount: 'desc' }, { totalBytes: 'desc' }],
      }),
    ]);

    const serializedAccount = {
      id: account.id,
      studentId: account.studentId,
      githubUserId: String(account.githubUserId),
      login: account.login,
      avatarUrl: account.avatarUrl,
      connectedAt: account.connectedAt,
      lastSyncedAt: account.lastSyncedAt,
      nextSyncAllowedAt: account.nextSyncAllowedAt,
      syncStatus: account.syncStatus,
      syncError: account.syncError,
      manualSyncCountToday: dailyCount,
    };

    const serializedRepos = repos.map((r) => ({
      ...r,
      githubRepoId: String(r.githubRepoId),
    }));

    const showcasedRepos = serializedRepos
      .filter((r) => r.isShowcased)
      .sort((a, b) => (a.showcaseRank || 999) - (b.showcaseRank || 999));

    const serializedSkills = skills.map((s) => ({
      ...s,
      name: s.skill.name,
      category: s.skill.category,
      totalBytes: String(s.totalBytes),
    }));

    return {
      connected: true,
      account: serializedAccount,
      cooldownRemainingSeconds,
      dailySyncsRemaining,
      repos: serializedRepos,
      showcasedRepos,
      skills: serializedSkills,
      reminderSnoozedUntil: student.githubReminderSnoozedUntil,
    };
  }
}

export const githubAccountService = new GithubAccountService();
