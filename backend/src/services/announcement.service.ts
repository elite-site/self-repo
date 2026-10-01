import { prisma } from '../lib/prisma';

export interface AnnouncementNotificationTarget {
  id: string;
  title: string;
  message: string;
  targetAll: boolean;
  targetYear: number | null;
  targetSection: string | null;
}

/** The canonical student-portal route for an announcement notification. */
export function announcementActionUrl(announcementId: string): string {
  return `/announcements/${encodeURIComponent(announcementId)}`;
}

export interface AnnouncementTarget {
  targetAll: boolean;
  targetYear: number | null;
  targetSection: string | null;
}

/**
 * Resolve an announcement's audience from a request body.
 *
 * Accepts either the explicit `targetYear` / `targetSection` / `targetAll` fields
 * or the `audience` token the admin UI actually sends (`ALL`, `YEAR_1`..`YEAR_4`).
 * Both the create route and the audience preview go through here so they can
 * never disagree about who an announcement reaches.
 */
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

/** Prisma filter for the students an announcement target reaches. */
export function announcementStudentWhere(target: AnnouncementTarget): Record<string, unknown> {
  if (target.targetAll) return {};
  const where: Record<string, unknown> = {};
  if (target.targetYear !== null && target.targetYear !== undefined) {
    where.year = target.targetYear;
  }
  if (target.targetSection !== null && target.targetSection !== undefined && target.targetSection !== '') {
    where.section = target.targetSection;
  }
  return where;
}

/** How many students an announcement target would actually reach. */
export async function countAnnouncementAudience(target: AnnouncementTarget): Promise<number> {
  return prisma.student.count({ where: announcementStudentWhere(target) });
}

/**
 * Create one notification per student in the announcement's audience.
 *
 * Keeping the target on the Notification record means every notification
 * surface (inbox, header dropdown, and dashboard) can use the same explicit
 * link instead of reconstructing a link from a notification type.
 */
export async function deliverAnnouncementNotifications(
  announcement: AnnouncementNotificationTarget,
): Promise<void> {
  const studentWhere = announcementStudentWhere({
    targetAll: announcement.targetAll,
    targetYear: announcement.targetYear,
    targetSection: announcement.targetSection,
  });

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true },
  });

  if (students.length === 0) return;

  await prisma.notification.createMany({
    data: students.map((student) => ({
      studentId: student.id,
      title: `Announcement: ${announcement.title}`,
      message: announcement.message,
      type: 'ANNOUNCEMENT',
      actionUrl: announcementActionUrl(announcement.id),
    })),
  });
}
