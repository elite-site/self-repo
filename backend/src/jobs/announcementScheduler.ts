import cron from 'node-cron';
import { processDueScheduledAnnouncements } from '../modules/announcements';

let isRunning = false;
let started = false;

async function tick(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    await processDueScheduledAnnouncements();
  } catch (err) {
    console.error('Announcement scheduler tick failed:', err);
  } finally {
    isRunning = false;
  }
}

export function startAnnouncementScheduler(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (started) return;
  started = true;
  cron.schedule('* * * * *', () => {
    void tick();
  });
}
