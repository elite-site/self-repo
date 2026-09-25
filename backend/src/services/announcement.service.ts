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
  const studentWhere: any = {};
  if (!announcement.targetAll) {
    if (announcement.targetYear !== null && announcement.targetYear !== undefined) {
      studentWhere.year = announcement.targetYear;
    }
    if (
      announcement.targetSection !== null &&
      announcement.targetSection !== undefined &&
      announcement.targetSection !== ''
    ) {
      studentWhere.section = announcement.targetSection;
    }
  }

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
