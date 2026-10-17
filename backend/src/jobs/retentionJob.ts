import cron from 'node-cron';
import { runRetentionCleanup } from '../modules/admin/services/retention.service';
import { logger } from '../utils/logger';

let isRunning = false;
let started = false;

async function tick(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    const result = await runRetentionCleanup();
    logger.info('[RetentionJob] Daily retention cleanup finished', { ...result });
  } catch (err) {
    logger.error('[RetentionJob] Retention cleanup tick failed', { err });
  } finally {
    isRunning = false;
  }
}

export function startRetentionScheduler(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (started) return;
  started = true;

  // Run daily at 03:30 AM Asia/Kolkata (quiet hour)
  cron.schedule(
    '30 3 * * *',
    () => {
      void tick();
    },
    { timezone: 'Asia/Kolkata' }
  );
}
