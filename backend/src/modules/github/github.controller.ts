import { Request, Response } from 'express';
import { env } from '../../config/env';
import { AppError, ForbiddenError, RateLimitError } from '../../utils/appError';
import {
  parseCallbackQuery,
  validateRepoId,
  validateShowcaseRepoIds,
  validateStudentId,
} from './github.schemas';
import * as service from './github.service';
import { GithubAccountError } from './services/github.account.service';
import { GithubSyncCooldownError, GithubSyncDailyCapError } from './services/github.sync.service';

// --- Student Endpoints ---

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
    await service.handleOAuthCallback(code, state);
    res.redirect(`${frontendGithubUrl}?connected=1`);
  } catch (err: any) {
    const message = err?.message || 'Failed to complete GitHub account connection';
    res.redirect(`${frontendGithubUrl}?error=${encodeURIComponent(message)}`);
  }
}

export async function getStatus(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const status = await service.getGithubStatus(studentId);
  res.json(status);
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const summary = await service.getGithubSummary(studentId);
  res.json(summary);
}

export async function getReadme(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const repoId = validateRepoId(req.params.id);
  const readme = await service.getRepoReadmeExcerpt(studentId, repoId);
  res.json(readme);
}

export async function connect(req: Request, res: Response): Promise<void> {
  if (!env.FEATURE_GITHUB_PORTFOLIO) {
    throw new ForbiddenError('GitHub Portfolio integration is currently disabled.', 'FEATURE_DISABLED');
  }
  const studentId = validateStudentId(req);
  try {
    const url = await service.initiateGithubConnect(studentId);
    res.json({ url });
  } catch (err: any) {
    if (err instanceof GithubAccountError) {
      throw new AppError(err.code || 'CONNECT_ERROR', err.message, err.statusCode);
    }
    throw err;
  }
}

export async function sync(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  try {
    const result = await service.triggerGithubSync(studentId);
    res.status(202).json(result);
  } catch (err: any) {
    if (err instanceof GithubSyncCooldownError) {
      throw new RateLimitError(err.message, 'SYNC_COOLDOWN');
    }
    if (err instanceof GithubSyncDailyCapError) {
      throw new RateLimitError(err.message, 'SYNC_DAILY_CAP_REACHED');
    }
    throw err;
  }
}

export async function updateShowcase(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const uniqueIds = validateShowcaseRepoIds(req.body?.repoIds);
  const showcased = await service.updateShowcasedRepos(studentId, uniqueIds);
  res.json({
    success: true,
    showcased,
  });
}

export async function disconnect(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  await service.disconnectGithub(studentId);
  res.json({ success: true, message: 'GitHub account disconnected successfully' });
}

export async function snoozeReminder(req: Request, res: Response): Promise<void> {
  const studentId = validateStudentId(req);
  const result = await service.snoozeGithubReminder(studentId);
  res.json({ success: true, snoozedUntil: result.snoozedUntil });
}

// --- Admin Endpoints ---

export async function getAdminOverview(req: Request, res: Response): Promise<void> {
  const { page = '1', limit = '25', search } = req.query;
  const result = await service.getAdminGithubOverview({
    page: parseInt(String(page), 10),
    limit: parseInt(String(limit), 10),
    search: search ? String(search) : undefined,
  });
  res.json(result);
}

export async function getAdminLogs(req: Request, res: Response): Promise<void> {
  const { status, filter } = req.query;
  const logs = await service.getAdminGithubLogs({
    status: status ? String(status) : undefined,
    filter: filter ? String(filter) : undefined,
  });
  res.json(logs);
}

export async function adminResyncStudent(req: Request, res: Response): Promise<void> {
  try {
    const result = await service.adminResyncStudent(req.params.studentId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    if (err.name === 'GithubSyncCooldownError') {
      throw new RateLimitError(err.message, 'SYNC_COOLDOWN');
    }
    if (err.name === 'GithubSyncDailyCapError') {
      throw new RateLimitError(err.message, 'SYNC_DAILY_CAP');
    }
    throw err;
  }
}

export async function getAdminProjects(req: Request, res: Response): Promise<void> {
  const { search, page = '1', limit = '20' } = req.query;
  const result = await service.getAdminGithubProjects({
    search: search ? String(search) : undefined,
    page: parseInt(String(page), 10),
    limit: parseInt(String(limit), 10),
  });
  res.json(result);
}

export async function handleInternalSyncTick(req: Request, res: Response): Promise<void> {
  const secretHeader =
    (req.headers['x-internal-secret'] as string | undefined) ||
    ((req.headers['authorization'] as string | undefined) || '').replace(/^Bearer\s+/i, '');
  if (!env.INTERNAL_SYNC_SECRET || secretHeader !== env.INTERNAL_SYNC_SECRET) {
    throw new AppError('UNAUTHORIZED', 'Invalid or missing internal sync secret', 401);
  }

  const result = await service.syncScheduledBatch(10);
  res.json({ success: true, ...result, timestamp: new Date().toISOString() });
}

