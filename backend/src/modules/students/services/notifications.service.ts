import * as repo from '../students.repository';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

export async function getNotifications(studentId: string, pagination: { limit: number; offset: number }) {
  try {
    const { limit, offset } = pagination;
    const { items: notifications, total, unreadCount } = await repo.findNotificationsPaginated(studentId, limit, offset);

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
    logger.error(`[notifications.service:getNotifications] studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function markAllNotificationsRead(studentId: string) {
  try {
    await repo.markAllNotificationsAsRead(studentId);
    return { message: 'All marked as read' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[notifications.service:markAllNotificationsRead] studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function markNotificationRead(id: string, studentId: string) {
  try {
    const updated = await repo.markNotificationAsRead(id, studentId);
    if (updated.count === 0) {
      throw new AppError('NOT_FOUND', 'Not found', 404);
    }
    return { message: 'Marked as read' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[notifications.service:markNotificationRead] id=${id} studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}

export async function getAnnouncementById(id: string, studentId: string) {
  try {
    const announcement = await repo.findPublishedAnnouncement(id);

    if (!announcement) {
      throw new AppError('NOT_FOUND', 'Announcement not found', 404);
    }

    if (!announcement.targetAll && (announcement.targetYear !== null || announcement.targetSection !== null)) {
      const student = await repo.findStudentYearAndSection(studentId);

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
    logger.error(`[notifications.service:getAnnouncementById] id=${id} studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500);
  }
}
