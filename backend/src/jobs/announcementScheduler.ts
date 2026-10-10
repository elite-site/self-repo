import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { deliverAnnouncementNotifications } from '../services/announcement.service';

let isRunning = false;
let started = false;

async function tick(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    const due = await prisma.announcement.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    });

    for (const announcement of due) {
      // Claim the row atomically (see the publish route for the full rationale).
      // If an admin published this announcement manually while this tick was
      // reading, the claim is lost and we must not deliver a second time.
      const claimed = await prisma.announcement.updateMany({
        where: { id: announcement.id, status: 'SCHEDULED' },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });

      if (claimed.count === 0) continue;

      const published = await prisma.announcement.findUnique({ where: { id: announcement.id } });
      if (!published) continue;

      await deliverAnnouncementNotifications({
        id: published.id,
        title: published.title,
        message: published.message,
        targetAll: published.targetAll,
        targetYear: published.targetYear,
        targetSection: published.targetSection,
      });
    }
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
