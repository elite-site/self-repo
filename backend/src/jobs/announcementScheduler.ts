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
      const published = await prisma.announcement.update({
        where: { id: announcement.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
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