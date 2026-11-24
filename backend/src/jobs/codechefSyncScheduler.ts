import cron from 'node-cron';
import { env, isTestEnv } from '../config/env';
import { syncScheduledBatch, backfillUnlinkedProfileAccounts } from '../modules/codechef';

let isRunning = false;
let started = false;

export async function tick(): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (!env.FEATURE_CODECHEF) return { processed: 0, succeeded: 0, failed: 0 };
  if (isRunning) return { processed: 0, succeeded: 0, failed: 0 };
  isRunning = true;

  try {
    // Auto-link any profile links that haven't been connected yet
    await backfillUnlinkedProfileAccounts().catch((err) => {
      console.error('[CodeChefSyncScheduler] Backfill unlinked profiles failed:', err);
    });
    return await syncScheduledBatch(10);
  } catch (err) {
    console.error('[CodeChefSyncScheduler] Periodic tick failed:', err);
    return { processed: 0, succeeded: 0, failed: 0 };
  } finally {
    isRunning = false;
  }
}

export function startCodeChefSyncScheduler(): void {
  if (isTestEnv()) return;
  if (!env.FEATURE_CODECHEF) return;
  if (started) return;
  started = true;

  // Initial backfill on startup
  void backfillUnlinkedProfileAccounts().catch((err) => {
    console.error('[CodeChefSyncScheduler] Initial startup backfill failed:', err);
  });

  cron.schedule('*/30 * * * *', () => {
    void tick();
  });
}
