import { Router, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { httpError } from '../middleware/apiError';
import { requireAdminAuth } from '../middleware/auth';
import { ActivityService } from '../services/activity.service';
import { announcementActionUrl, deliverAnnouncementNotifications } from '../services/announcement.service';

const router = Router();
router.use(requireAdminAuth);

router.get('/announcements', async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(announcements);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

/**
 * Live recipient count for the compose dialog's audience picker.
 *
 * The admin client previously requested this route, it did not exist, and the
 * client silently substituted a hardcoded 120 — so the "this will reach N
 * students" figure was fiction. Targeting mirrors
 * deliverAnnouncementNotifications so the preview matches what is delivered.
 */
router.get('/announcements/preview', async (req, res) => {
  try {
    const raw = String((req.query as any).audience ?? 'ALL').trim().toUpperCase();
    const yearMatch = /^YEAR[_-]?(\d+)$/.exec(raw);
    const targetYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

    // Typed explicitly so a malformed filter is caught here rather than at
    // runtime. Mirrors the audience logic in deliverAnnouncementNotifications.
    const where: Prisma.StudentWhereInput =
      targetYear === null ? {} : { year: targetYear };

    const count = await prisma.student.count({ where });

    res.json({ count, audience: raw, targetYear });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/announcements', async (req, res) => {
  try {
    const { title, body, content, message, scheduledAt, priority, targetYear, targetSection, targetAll } = req.body;
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isFutureScheduled = scheduledDate !== null && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();

    const isTargetAll = targetAll === false ? false : (targetAll === true ? true : !(targetYear || targetSection));

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message: body || content || message || '',
        priority: priority || 'normal',
        targetYear: targetYear !== undefined && targetYear !== null && targetYear !== '' ? parseInt(String(targetYear), 10) : null,
        targetSection: targetSection ? String(targetSection) : null,
        targetAll: isTargetAll,
        createdBy: (req as any).adminUser?.username || (req as any).user?.username || 'admin',
        scheduledAt: scheduledDate,
        status: isFutureScheduled ? 'SCHEDULED' : 'PUBLISHED',
        publishedAt: isFutureScheduled ? null : (scheduledDate || new Date())
      }
    });

    // Hold back notifications if scheduled in the future. The publish route
    // below uses the same delivery function, so scheduled announcements get
    // the same canonical target as immediate announcements.
    if (!isFutureScheduled) {
      await deliverAnnouncementNotifications({
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        targetAll: announcement.targetAll,
        targetYear: announcement.targetYear,
        targetSection: announcement.targetSection,
      });
    }

    res.status(201).json(announcement);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/announcements/:id/publish', async (req, res) => {
  try {
    const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found' });
    }

    if (existing.status === 'PUBLISHED') {
      return res.json(existing);
    }

    // Claim the transition atomically instead of read-then-write.
    //
    // The scheduler (jobs/announcementScheduler.ts) claims the same rows, so a
    // manual publish landing in the same tick used to let both callers flip the
    // status and both fan out a full set of notifications. `updateMany` applies
    // its WHERE clause as part of the write, so only the caller that actually
    // moves the row out of a non-PUBLISHED state gets count === 1, and only that
    // caller delivers. Losers return the already-published row untouched.
    const claimed = await prisma.announcement.updateMany({
      where: { id: req.params.id, status: { not: 'PUBLISHED' } },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    const announcement =
      claimed.count > 0
        ? await prisma.announcement.findUnique({ where: { id: req.params.id } })
        : existing;

    if (claimed.count > 0 && announcement) {
      await deliverAnnouncementNotifications({
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        targetAll: announcement.targetAll,
        targetYear: announcement.targetYear,
        targetSection: announcement.targetSection,
      });
    }

    res.json(announcement);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await prisma.announcement.findUnique({ where: { id } });

    if (!announcement) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found' });
    }

    // Announcements reach students as materialised Notification rows that hold
    // only the canonical URL (see announcement.service.ts) — there is no
    // foreign key to cascade. Deleting the Announcement alone would leave one
    // orphaned notification per recipient, still listed by
    // GET /api/student/notifications. Purge them in the same transaction so the
    // announcement and its notifications disappear together or not at all.
    //
    // Scoped by BOTH the notification type and an exact match on this one
    // announcement's URL. Moderation notices are written with
    // type: 'MODERATION' and an actionUrl of '/intro-video' (or null) by
    // notification.service.ts, so they cannot match this filter.
    const [, deletedNotifications] = await prisma.$transaction([
      prisma.announcement.delete({ where: { id } }),
      prisma.notification.deleteMany({
        where: { type: 'ANNOUNCEMENT', actionUrl: announcementActionUrl(id) },
      }),
    ]);

    await ActivityService.log({
      category: 'ADMIN',
      action: 'Admin deleted announcement',
      details: `Removed announcement "${announcement.title}" and ${deletedNotifications.count} student notification(s)`,
      status: 'WARNING',
    });

    res.json({
      success: true,
      message: 'Announcement and its student notifications were deleted.',
      deletedNotifications: deletedNotifications.count,
    });
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
});


export default router;
