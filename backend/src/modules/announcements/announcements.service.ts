import type { Prisma } from '@prisma/client';
import type {
  AnnouncementNotificationTarget,
  AnnouncementTarget,
  CreateAnnouncementInput,
} from './announcements.types';
import * as repo from './announcements.repository';
import { announcementActionUrl } from './announcements.schemas';

export function resolveAnnouncementTarget(input: {
  audience?: unknown;
  targetYear?: unknown;
  targetSection?: unknown;
  targetAll?: unknown;
}): AnnouncementTarget {
  const { audience, targetYear, targetSection, targetAll } = input;

  const rawYear =
    targetYear !== undefined && targetYear !== null && targetYear !== ''
      ? targetYear
      : typeof audience === 'string' && /^YEAR_(\d+)$/i.test(audience)
        ? Number(audience.replace(/^YEAR_/i, ''))
        : null;

  const year = rawYear === null ? null : parseInt(String(rawYear), 10);
  const section = targetSection ? String(targetSection) : null;

  const explicitAll =
    targetAll === false ? false : targetAll === true ? true : audience === 'ALL' ? true : null;
  const resolvedAll = explicitAll === null ? !(year !== null || section !== null) : explicitAll;

  return {
    targetAll: resolvedAll,
    targetYear: Number.isNaN(year as number) ? null : year,
    targetSection: section,
  };
}

export function announcementStudentWhere(target: AnnouncementTarget): Prisma.StudentWhereInput {
  if (target.targetAll) return {};
  const where: Prisma.StudentWhereInput = {};
  if (target.targetYear !== null && target.targetYear !== undefined) {
    where.year = target.targetYear;
  }
  if (target.targetSection !== null && target.targetSection !== undefined && target.targetSection !== '') {
    where.section = target.targetSection;
  }
  return where;
}

export async function countAnnouncementAudience(target: AnnouncementTarget): Promise<number> {
  return repo.countStudentsByTarget(announcementStudentWhere(target));
}

export const ANNOUNCEMENT_FANOUT_BATCH_SIZE = 500;

export async function deliverAnnouncementNotifications(
  announcement: AnnouncementNotificationTarget,
  batchSize: number = ANNOUNCEMENT_FANOUT_BATCH_SIZE
): Promise<void> {
  const studentWhere = announcementStudentWhere({
    targetAll: announcement.targetAll,
    targetYear: announcement.targetYear,
    targetSection: announcement.targetSection,
  });

  let cursorId: string | undefined = undefined;

  while (true) {
    const students = await repo.findAudienceStudentsBatch(studentWhere, batchSize, cursorId);
    if (!students || students.length === 0) {
      break;
    }

    const notifications: Prisma.NotificationCreateManyInput[] = students.map((student) => ({
      id: `notif_${announcement.id}_${student.id}`,
      studentId: student.id,
      title: `Announcement: ${announcement.title}`,
      message: announcement.message,
      type: 'ANNOUNCEMENT',
      actionUrl: announcementActionUrl(announcement.id),
    }));

    await repo.createAnnouncementNotifications(notifications);

    if (students.length < batchSize) {
      break;
    }

    cursorId = students[students.length - 1].id;
  }
}

export async function listAnnouncements() {
  return repo.findAllAnnouncements();
}

export async function getAudiencePreview(audienceParam?: string) {
  const raw = String(audienceParam ?? 'ALL').trim().toUpperCase();
  const yearMatch = /^YEAR[_-]?(\d+)$/.exec(raw);
  const targetYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

  const where: Prisma.StudentWhereInput = targetYear === null ? {} : { year: targetYear };
  const count = await repo.countStudentsByTarget(where);

  return { count, audience: raw, targetYear };
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const { title, body, content, message, scheduledAt, priority, targetYear, targetSection, targetAll, createdBy } = input;
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const isFutureScheduled =
    scheduledDate !== null && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();

  const isTargetAll = targetAll === false ? false : targetAll === true ? true : !(targetYear || targetSection);

  const announcement = await repo.createAnnouncementRecord({
    title,
    message: body || content || message || '',
    priority: priority || 'normal',
    targetYear: targetYear !== undefined && targetYear !== null && targetYear !== '' ? parseInt(String(targetYear), 10) : null,
    targetSection: targetSection ? String(targetSection) : null,
    targetAll: isTargetAll,
    createdBy,
    scheduledAt: scheduledDate,
    status: isFutureScheduled ? 'SCHEDULED' : 'PUBLISHED',
    publishedAt: isFutureScheduled ? null : (scheduledDate || new Date()),
  });

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

  return announcement;
}

export async function publishAnnouncement(id: string) {
  const existing = await repo.findAnnouncementById(id);
  if (!existing) {
    return { notFound: true as const };
  }

  if (existing.status === 'PUBLISHED') {
    return { announcement: existing };
  }

  const claimed = await repo.claimAnnouncementForPublish(id);
  const announcement = claimed.count > 0 ? await repo.findAnnouncementById(id) : existing;

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

  return { announcement };
}

export async function deleteAnnouncement(id: string) {
  const announcement = await repo.findAnnouncementById(id);
  if (!announcement) {
    return { notFound: true as const };
  }

  const [, deletedNotifications] = await repo.deleteAnnouncementWithNotifications(id);

  return {
    announcement,
    deletedNotificationsCount: deletedNotifications.count,
  };
}

export async function processDueScheduledAnnouncements(): Promise<void> {
  const due = await repo.findDueScheduledAnnouncements();

  for (const announcement of due) {
    const claimed = await repo.claimScheduledAnnouncement(announcement.id);
    if (claimed.count === 0) continue;

    const published = await repo.findAnnouncementById(announcement.id);
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
}
