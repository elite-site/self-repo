import { Request, Response } from 'express';
import { env } from '../../config/env';
import { GithubAccountError } from '../../services/github.account.service';
import { GithubSyncCooldownError, GithubSyncDailyCapError } from '../../services/github.sync.service';
import {
  parseCallbackQuery,
  validateRepoId,
  validateShowcaseRepoIds,
  validateStudentId,
} from '../../validators/student/github.schema';
import {
  handleOAuthCallback,
  getGithubStatus,
  getGithubSummary,
  getRepoReadmeExcerpt,
  initiateGithubConnect,
  triggerGithubSync,
  updateShowcasedRepos,
  disconnectGithub,
  snoozeGithubReminder,
} from '../../services/student/github.service';

export async function handleCallback(req: Request, res: Response): Promise<void> {
  const frontendGithubUrl = env.STUDENT_APP_LOGIN_URL
    ? env.STUDENT_APP_LOGIN_URL.replace(/\/login\/?$/, '/github')
    : 'http://localhost:5173/github';

  const { code, state, error, errorDescription } = parseCallbackQuery(req.query as Record<string, unknown>);

  if (error) {
    const errorMsg = errorDescription || error;
    res.redirect(`${frontendGithubUrl}?error=${encodeURIComponent(errorMsg)}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${frontendGithubUrl}?error=${encodeURIComponent('Missing authorization code or state')}`);
    return;
  }

  try {
    await handleOAuthCallback(code, state);
    res.redirect(`${frontendGithubUrl}?connected=1`);
  } catch (err: any) {
    const message = err?.message || 'Failed to complete GitHub account connection';
    res.redirect(`${frontendGithubUrl}?error=${encodeURIComponent(message)}`);
  }
}

export async function getStatus(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const status = await getGithubStatus(studentId);
  res.json(status);
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const summary = await getGithubSummary(studentId);
  res.json(summary);
}

export async function getReadme(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const repoId = validateRepoId(req.params.id);
  const readme = await getRepoReadmeExcerpt(studentId, repoId);
  res.json(readme);
}

export async function connect(req: Request, res: Response): Promise<void> {
  if (!env.FEATURE_GITHUB_PORTFOLIO) {
    res.status(403).json({
      error: 'FEATURE_DISABLED',
      message: 'GitHub Portfolio integration is currently disabled.',
    });
    return;
  }
  const studentId = validateStudentId(req);
  try {
    const url = await initiateGithubConnect(studentId);
    res.json({ url });
  } catch (err: any) {
    if (err instanceof GithubAccountError) {
      res.status(err.statusCode).json({
        error: err.code || 'CONNECT_ERROR',
        message: err.message,
      });
      return;
    }
    throw err;
  }
}

export async function sync(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  try {
    const result = await triggerGithubSync(studentId);
    res.status(202).json(result);
  } catch (err: any) {
    if (err instanceof GithubSyncCooldownError) {
      res.status(429).json({
        error: 'SYNC_COOLDOWN',
        message: err.message,
        secondsRemaining: err.secondsRemaining,
      });
      return;
    }
    if (err instanceof GithubSyncDailyCapError) {
      res.status(429).json({
        error: 'SYNC_DAILY_CAP_REACHED',
        message: err.message,
      });
      return;
    }
    throw err;
  }
}

export async function updateShowcase(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const uniqueIds = validateShowcaseRepoIds(req.body?.repoIds);
  const showcased = await updateShowcasedRepos(studentId, uniqueIds);
  res.json({
    success: true,
    showcased,
  });
}

export async function disconnect(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  await disconnectGithub(studentId);
  res.json({ success: true, message: 'GitHub account disconnected successfully' });
}

export async function snoozeReminder(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const result = await snoozeGithubReminder(studentId);
  res.json({ success: true, snoozedUntil: result.snoozedUntil });
}
