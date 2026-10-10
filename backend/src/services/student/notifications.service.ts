import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

export async function getNotifications(studentId: string, pagination: { limit: number; offset: number }) {
  try {
    const { limit, offset } = pagination;
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where: { studentId } }),
      prisma.notification.count({ where: { studentId, status: 'UNREAD' } }),
    ]);

    const items = notifications.map((n) => ({
      ...n,
      isRead: n.status === 'READ',
    }));

    return {
      items,
      total,
      unreadCount,
      hasMore: offset + items.length < total,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[notifications.service:getNotifications] studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function markAllNotificationsRead(studentId: string) {
  try {
    await prisma.notification.updateMany({
      where: { studentId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() },
    });
    return { message: 'All marked as read' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[notifications.service:markAllNotificationsRead] studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function markNotificationRead(id: string, studentId: string) {
  try {
    const updated = await prisma.notification.updateMany({
      where: { id, studentId },
      data: { status: 'READ', readAt: new Date() },
    });
    if (updated.count === 0) {
      throw new AppError('NOT_FOUND', 'Not found', 404);
    }
    return { message: 'Marked as read' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[notifications.service:markNotificationRead] id=${id} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function getAnnouncementById(id: string, studentId: string) {
  try {
    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
      },
    });

    if (!announcement) {
      throw new AppError('NOT_FOUND', 'Announcement not found', 404);
    }

    if (!announcement.targetAll && (announcement.targetYear !== null || announcement.targetSection !== null)) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { year: true, section: true },
      });

      const yearMatches = announcement.targetYear === null || student?.year === announcement.targetYear;
      const sectionMatches = announcement.targetSection === null || student?.section === announcement.targetSection;

      if (!student || !yearMatches || !sectionMatches) {
        throw new AppError('NOT_FOUND', 'Announcement not found', 404);
      }
    }

    return {
      ...announcement,
      body: announcement.message,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[notifications.service:getAnnouncementById] id=${id} studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}
