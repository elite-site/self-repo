import { prisma } from '../../../infrastructure/prisma';
import { NotificationStatus } from '@prisma/client';

export class RetentionRepository {
  async findNotificationIds(
    where: { createdAt: { lt: Date }; status?: NotificationStatus },
    take: number
  ): Promise<string[]> {
    const rows = await prisma.notification.findMany({
      where,
      select: { id: true },
      take,
    });
    return rows.map((r) => r.id);
  }

  async deleteNotificationsByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await prisma.notification.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  async findActivityLogIds(beforeDate: Date, take: number): Promise<string[]> {
    const rows = await prisma.activityLog.findMany({
      where: { createdAt: { lt: beforeDate } },
      select: { id: true },
      take,
    });
    return rows.map((r) => r.id);
  }

  async deleteActivityLogsByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await prisma.activityLog.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  async findGithubSyncLogIds(beforeDate: Date, take: number): Promise<string[]> {
    const rows = await prisma.githubSyncLog.findMany({
      where: { startedAt: { lt: beforeDate } },
      select: { id: true },
      take,
    });
    return rows.map((r) => r.id);
  }

  async deleteGithubSyncLogsByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await prisma.githubSyncLog.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  async findEmailLogIds(beforeDate: Date, take: number): Promise<string[]> {
    const rows = await prisma.emailLog.findMany({
      where: { sentAt: { lt: beforeDate } },
      select: { id: true },
      take,
    });
    return rows.map((r) => r.id);
  }

  async deleteEmailLogsByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await prisma.emailLog.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  async findPortalSettings(keys: string[]): Promise<Record<string, string>> {
    const rows = await prisma.portalSettings.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }
}

export const retentionRepository = new RetentionRepository();
