import { Request, Response } from 'express';
import * as service from './github.service';

export * from '../../controllers/student/github.controller';

export async function getAdminOverview(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '25', search } = req.query;
    const result = await service.getAdminGithubOverview({
      page: parseInt(String(page), 10),
      limit: parseInt(String(limit), 10),
      search: search ? String(search) : undefined,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getAdminLogs(req: Request, res: Response): Promise<void> {
  try {
    const { status, filter } = req.query;
    const logs = await service.getAdminGithubLogs({
      status: status ? String(status) : undefined,
      filter: filter ? String(filter) : undefined,
    });
    res.json(logs);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function adminResyncStudent(req: Request, res: Response): Promise<void> {
  try {
    const result = await service.adminResyncStudent(req.params.studentId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      res.status(404).json({ error: 'NOT_FOUND', message: err.message });
      return;
    }
    if (err.name === 'GithubSyncCooldownError') {
      res.status(429).json({ error: 'SYNC_COOLDOWN', message: err.message, secondsRemaining: err.secondsRemaining });
      return;
    }
    if (err.name === 'GithubSyncDailyCapError') {
      res.status(429).json({ error: 'SYNC_DAILY_CAP', message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getAdminProjects(req: Request, res: Response): Promise<void> {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const result = await service.getAdminGithubProjects({
      search: search ? String(search) : undefined,
      page: parseInt(String(page), 10),
      limit: parseInt(String(limit), 10),
    });
    res.json(result);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}
