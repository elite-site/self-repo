import cron from 'node-cron';
import { isTestEnv } from '../config/env';
import { logger } from '../utils/logger';
import { processDueScheduledAnnouncements } from '../modules/announcements';

let isRunning = false;
let started = false;

async function tick(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    await processDueScheduledAnnouncements();
  } catch (err) {
    logger.error('[AnnouncementScheduler] Tick failed', { err });
  } finally {
    isRunning = false;
  }
}

export function startAnnouncementScheduler(): void {
  if (isTestEnv()) return;
  if (started) return;
  started = true;
  cron.schedule('* * * * *', () => {
    void tick();
  });
}
