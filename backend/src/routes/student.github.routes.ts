import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { requireStudentAuth } from '../middleware/studentAuth';
import { githubAccountService, GithubAccountError } from '../services/github.account.service';
import { githubSyncService, GithubSyncCooldownError, GithubSyncDailyCapError } from '../services/github.sync.service';
import { githubApiService } from '../services/github.api.service';
import { GithubSyncTrigger } from '@prisma/client';

const router = Router();

/**
 * GET /api/student/github/callback
 * Handles OAuth code redirect from GitHub. Unprotected by JWT middleware because
 * it is an external browser navigation callback. Validates state from database.
 */
router.get('/callback', async (req: Request, res: Response) => {
  const frontendGithubUrl = env.STUDENT_APP_LOGIN_URL
    ? env.STUDENT_APP_LOGIN_URL.replace(/\/login\/?$/, '/github')
    : 'http://localhost:5173/github';

  const { code, state, error, error_description } = req.query;

  if (error) {
    const errorMsg = String(error_description || error);
    return res.redirect(`${frontendGithubUrl}?error=${encodeURIComponent(errorMsg)}`);
  }

  if (!code || !state) {
    return res.redirect(`${frontendGithubUrl}?error=${encodeURIComponent('Missing authorization code or state')}`);
  }

  try {
    const stateRecord = await prisma.githubOAuthState.findUnique({
      where: { state: String(state) },
    });

    if (!stateRecord || stateRecord.usedAt || new Date() > stateRecord.expiresAt) {
      return res.redirect(`${frontendGithubUrl}?error=${encodeURIComponent('OAuth session expired or invalid. Please try again.')}`);
    }

    await githubAccountService.handleCallback(stateRecord.studentId, String(code), String(state));
    return res.redirect(`${frontendGithubUrl}?connected=1`);
  } catch (err: any) {
    const message = err?.message || 'Failed to complete GitHub account connection';
    return res.redirect(`${frontendGithubUrl}?error=${encodeURIComponent(message)}`);
  }
});

// All subsequent routes require student authentication
router.use(requireStudentAuth);

/**
 * GET /api/student/github
 * Returns connection status, account info, repos, showcased repos, and computed skills.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const status = await githubAccountService.getStatus(studentId);
    res.json(status);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

/**
 * GET /api/student/github/summary
 * Returns connected, login, lastSyncedAt, syncStatus, reminderSnoozedUntil, repoCount, showcasedCount. No repo rows.
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const summary = await githubAccountService.getSummary(studentId);
    res.json(summary);
  } catch (err: any) {
    console.error("Internal server error in /api/student/github/summary:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

/**
 * GET /api/student/github/repos/:id/readme
 * Returns the readme excerpt for one repo owned by the session student.
 */
router.get('/repos/:id/readme', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const repo = await prisma.githubRepo.findFirst({
      where: {
        id: req.params.id,
        studentId,
      },
      select: {
        id: true,
        fullName: true,
        readmeExcerpt: true,
      },
    });

    if (!repo) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Repository not found' });
    }

    if (repo.readmeExcerpt) {
      return res.json({ id: repo.id, readmeExcerpt: repo.readmeExcerpt });
    }

    // On-demand fetch if readmeExcerpt is not yet cached in DB
    const fetched = await githubApiService.fetchReadmeExcerpt(repo.fullName);
    if (fetched) {
      await prisma.githubRepo.update({
        where: { id: repo.id },
        data: { readmeExcerpt: fetched, readmeFetchedAt: new Date() },
      });
      return res.json({ id: repo.id, readmeExcerpt: fetched });
    }

    res.json({ id: repo.id, readmeExcerpt: null });
  } catch (err: any) {
    console.error("Internal server error in /api/student/github/repos/:id/readme:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

/**
 * POST /api/student/github/connect
 * Initiates GitHub OAuth flow with PKCE and returns authorization URL.
 */
router.post('/connect', async (req: Request, res: Response) => {
  if (!env.FEATURE_GITHUB_PORTFOLIO) {
    return res.status(403).json({
      error: 'FEATURE_DISABLED',
      message: 'GitHub Portfolio integration is currently disabled.',
    });
  }
  try {
    const studentId = (req as any).studentId;
    const url = await githubAccountService.createConnectUrl(studentId);
    res.json({ url });
  } catch (err: any) {
    if (err instanceof GithubAccountError) {
      return res.status(err.statusCode).json({ error: err.code || 'CONNECT_ERROR', message: err.message });
    }
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

/**
 * POST /api/student/github/sync
 * Queues a manual sync job with cooldown and daily cap enforcement.
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    await githubSyncService.queueSync(studentId, GithubSyncTrigger.MANUAL);
    res.status(202).json({ message: 'Sync queued successfully', status: 'QUEUED' });
  } catch (err: any) {
    if (err instanceof GithubSyncCooldownError) {
      return res.status(429).json({
        error: 'SYNC_COOLDOWN',
        message: err.message,
        secondsRemaining: err.secondsRemaining,
      });
    }
    if (err instanceof GithubSyncDailyCapError) {
      return res.status(429).json({
        error: 'SYNC_DAILY_CAP_REACHED',
        message: err.message,
      });
    }
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

/**
 * PUT /api/student/github/showcase
 * Updates the showcased repositories (1..30) with explicit rank ordering.
 */
router.put('/showcase', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const { repoIds } = req.body;

    if (!Array.isArray(repoIds) || repoIds.length < 1 || repoIds.length > 30) {
      return res.status(400).json({
        error: 'INVALID_SHOWCASE_COUNT',
        message: 'You must select between 1 and 30 repositories to showcase.',
      });
    }

    const uniqueIds = Array.from(new Set(repoIds.map(String)));
    if (uniqueIds.length !== repoIds.length) {
      return res.status(400).json({
        error: 'DUPLICATE_REPOSITORIES',
        message: 'Showcased repositories must be unique.',
      });
    }

    const repos = await prisma.githubRepo.findMany({
      where: {
        id: { in: uniqueIds },
        studentId,
        removedFromGithub: false,
      },
    });

    if (repos.length !== uniqueIds.length) {
      return res.status(400).json({
        error: 'INVALID_REPOSITORIES',
        message: 'One or more selected repositories do not exist or belong to another student.',
      });
    }

    await prisma.$transaction([
      prisma.githubRepo.updateMany({
        where: { studentId },
        data: { isShowcased: false, showcaseRank: null },
      }),
      ...uniqueIds.map((id, i) =>
        prisma.githubRepo.update({
          where: { id },
          data: { isShowcased: true, showcaseRank: i + 1 },
        })
      ),
    ]);

    const updated = await prisma.githubRepo.findMany({
      where: { studentId, isShowcased: true },
      orderBy: { showcaseRank: 'asc' },
      select: {
        id: true,
        studentId: true,
        githubRepoId: true,
        fullName: true,
        name: true,
        description: true,
        htmlUrl: true,
        isFork: true,
        primaryLanguage: true,
        topics: true,
        stars: true,
        githubCreatedAt: true,
        pushedAt: true,
        languages: true,
        commitCount: true,
        isShowcased: true,
        showcaseRank: true,
      },
    });

    res.json({
      success: true,
      showcased: updated.map((r) => ({ ...r, githubRepoId: String(r.githubRepoId) })),
    });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

/**
 * DELETE /api/student/github
 * Disconnects GitHub account and deletes all synced GitHub repos and detected skills.
 * Legacy Student, Project, and StudentSkill rows remain intact.
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    await githubAccountService.disconnect(studentId);
    res.json({ success: true, message: 'GitHub account disconnected successfully' });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

/**
 * POST /api/student/github/reminder/snooze
 * Snoozes GitHub connection reminders for 7 days.
 */
router.post('/reminder/snooze', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const result = await githubAccountService.snoozeReminder(studentId);
    res.json({ success: true, snoozedUntil: result.snoozedUntil });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

export default router;
