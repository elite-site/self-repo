import cron from 'node-cron';
import { env } from '../config/env';
import { syncScheduledBatch } from '../modules/codechef';

let isRunning = false;
let started = false;

export async function tick(): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (!env.FEATURE_CODECHEF) return { processed: 0, succeeded: 0, failed: 0 };
  if (isRunning) return { processed: 0, succeeded: 0, failed: 0 };
  isRunning = true;

  try {
    return await syncScheduledBatch(10);
  } catch (err) {
    console.error('[CodeChefSyncScheduler] Periodic tick failed:', err);
    return { processed: 0, succeeded: 0, failed: 0 };
  } finally {
    isRunning = false;
  }
}

export function startCodeChefSyncScheduler(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (!env.FEATURE_CODECHEF) return;
  if (started) return;
  started = true;

  cron.schedule('*/30 * * * *', () => {
    void tick();
  });
}
