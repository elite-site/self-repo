import cron from 'node-cron';
import { syncScheduledBatch } from '../modules/github/github.service';

let isRunning = false;
let started = false;

export async function tick(): Promise<{ processed: number }> {
  if (isRunning) return { processed: 0 };
  isRunning = true;

  try {
    return await syncScheduledBatch(10);
  } catch (err) {
    console.error('[GitHubSyncScheduler] Periodic tick failed:', err);
    return { processed: 0 };
  } finally {
    isRunning = false;
  }
}

export function startGithubSyncScheduler(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (started) return;
  started = true;

  // Run every 30 minutes to check for stale accounts and sync them staggered
  cron.schedule('*/30 * * * *', () => {
    void tick();
  });
}
