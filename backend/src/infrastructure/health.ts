import { Request, Response } from 'express';
import { checkDatabaseHealth } from './prisma';
import { driveService } from '../modules/media/drive';
import { logger } from '../utils/logger';

// Caches probe result for 30s to avoid hammering Google Drive & DB on frequent platform health pings.
let lastReadyProbeTime = 0;
let cachedReadyResult: { statusCode: number; body: Record<string, any> } | null = null;
const READY_CACHE_TTL_MS = 30_000;

export function healthCheckHandler(_req: Request, res: Response): void {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

export async function readyCheckHandler(_req: Request, res: Response): Promise<void> {
  const now = Date.now();
  if (cachedReadyResult && now - lastReadyProbeTime < READY_CACHE_TTL_MS) {
    res.status(cachedReadyResult.statusCode).json(cachedReadyResult.body);
    return;
  }

  const probe: Record<string, 'ok' | 'down'> = { db: 'down', drive: 'down' };

  try {
    const isDbOk = await checkDatabaseHealth();
    if (isDbOk) probe.db = 'ok';
  } catch (err) {
    // Non-fatal probe failure: marks DB component as down without throwing uncaught error (ERR-9, ERR-14)
    logger.warn('[HealthCheck] Database readiness probe reported error', { err });
  }

  try {
    await driveService.assertRootReachable();
    probe.drive = 'ok';
  } catch (err) {
    // Non-fatal probe failure: marks Drive component as down without throwing uncaught error (ERR-9, ERR-14)
    logger.warn('[HealthCheck] Google Drive readiness probe reported error', { err });
  }

  const ready = probe.db === 'ok' && probe.drive === 'ok';
  const body = {
    status: ready ? 'ok' : 'unready',
    ...probe,
    timestamp: new Date().toISOString(),
  };

  cachedReadyResult = {
    statusCode: ready ? 200 : 503,
    body,
  };
  lastReadyProbeTime = now;

  res.status(ready ? 200 : 503).json(body);
}
