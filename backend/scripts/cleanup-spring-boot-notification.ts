import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  console.log('[cleanup-spring-boot] Starting search for Spring Boot notifications/events...');
  try {
    // 1. Find notifications matching Spring Boot or any EVENT notification
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { type: 'EVENT' },
          { id: { startsWith: 'notif_event_' } },
          { actionUrl: { contains: '/events/' } },
          { title: { contains: 'Spring Boot', mode: 'insensitive' } },
          { message: { contains: 'Spring Boot', mode: 'insensitive' } },
        ],
      },
    });

    console.log(`[cleanup-spring-boot] Found ${notifications.length} notification(s) matching "Spring Boot":`);
    for (const n of notifications) {
      console.log(`  - [${n.id}] Student: ${n.studentId} | Title: "${n.title}" | Status: ${n.status}`);
    }

    // 2. Find events matching Spring Boot
    const events = await prisma.event.findMany({
      where: {
        name: { contains: 'Spring Boot', mode: 'insensitive' },
      },
    });

    console.log(`[cleanup-spring-boot] Found ${events.length} event(s) matching "Spring Boot":`);
    for (const ev of events) {
      console.log(`  - [${ev.id}] Name: "${ev.name}" | Status: ${ev.status}`);
    }

    if (!APPLY) {
      console.log('\n[cleanup-spring-boot] DRY RUN ONLY. Run with --apply to execute deletion.');
      return;
    }

    if (notifications.length > 0) {
      const deleteResult = await prisma.notification.deleteMany({
        where: {
          id: { in: notifications.map((n) => n.id) },
        },
      });
      console.log(`[cleanup-spring-boot] Deleted ${deleteResult.count} notification(s).`);
    } else {
      console.log('[cleanup-spring-boot] No matching notifications to delete.');
    }

    if (events.length > 0 && process.argv.includes('--delete-event')) {
      for (const ev of events) {
        // Also remove any remaining event-linked notifications
        await prisma.notification.deleteMany({
          where: {
            OR: [
              { id: { startsWith: `notif_event_${ev.id}_` } },
              { actionUrl: { contains: `/events/${ev.id}` } },
            ],
          },
        });
        await prisma.event.delete({ where: { id: ev.id } });
        console.log(`[cleanup-spring-boot] Deleted event ${ev.id} ("${ev.name}") and its notifications.`);
      }
    }
  } catch (err: any) {
    console.error('[cleanup-spring-boot] Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
