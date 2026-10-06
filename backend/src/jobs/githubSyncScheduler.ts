import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { githubSyncService } from '../services/github.sync.service';
import { GithubSyncTrigger } from '@prisma/client';

let isRunning = false;
let started = false;

async function tick(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Find accounts needing scheduled sync (connected, not currently running, last synced > 24h ago or never)
    const accounts = await prisma.githubAccount.findMany({
      where: {
        syncStatus: { notIn: ['RUNNING', 'QUEUED'] },
        OR: [
          { lastSyncedAt: null },
          { lastSyncedAt: { lte: cutoff } },
        ],
      },
      take: 10, // Stagger batches across hourly runs
      orderBy: { lastSyncedAt: 'asc' },
    });

    for (const account of accounts) {
      try {
        await githubSyncService.queueSync(account.studentId, GithubSyncTrigger.SCHEDULED);
      } catch (syncErr) {
        console.warn(`[GitHubSyncScheduler] Failed to queue sync for student ${account.studentId}:`, syncErr);
      }
    }
  } catch (err) {
    console.error('[GitHubSyncScheduler] Periodic tick failed:', err);
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
