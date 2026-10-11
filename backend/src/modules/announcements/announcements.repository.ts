import { prisma } from '../../infrastructure/prisma';
import type { Prisma } from '@prisma/client';
import { announcementActionUrl } from './announcements.schemas';

export async function findAllAnnouncements() {
  return prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function countStudentsByTarget(where: Prisma.StudentWhereInput) {
  return prisma.student.count({ where });
}

export async function createAnnouncementRecord(data: Prisma.AnnouncementCreateInput) {
  return prisma.announcement.create({ data });
}

export async function findAnnouncementById(id: string) {
  return prisma.announcement.findUnique({ where: { id } });
}

export async function claimAnnouncementForPublish(id: string) {
  return prisma.announcement.updateMany({
    where: { id, status: { not: 'PUBLISHED' } },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
}

export async function deleteAnnouncementWithNotifications(id: string) {
  return prisma.$transaction([
    prisma.announcement.delete({ where: { id } }),
    prisma.notification.deleteMany({
      where: { type: 'ANNOUNCEMENT', actionUrl: announcementActionUrl(id) },
    }),
  ]);
}

export async function findAudienceStudents(where: Prisma.StudentWhereInput) {
  return prisma.student.findMany({
    where,
    select: { id: true },
  });
}

export async function createAnnouncementNotifications(
  notifications: Prisma.NotificationCreateManyInput[]
) {
  return prisma.notification.createMany({
    data: notifications,
  });
}

export async function findDueScheduledAnnouncements() {
  return prisma.announcement.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
  });
}

export async function claimScheduledAnnouncement(id: string) {
  return prisma.announcement.updateMany({
    where: { id, status: 'SCHEDULED' },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
}
