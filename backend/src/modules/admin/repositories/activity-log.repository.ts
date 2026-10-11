import { prisma } from '../../../infrastructure/prisma';

export async function findActivityLogs(whereClause: any, skip: number, take: number) {
  return prisma.activityLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

export async function countActivityLogs(whereClause: any) {
  return prisma.activityLog.count({ where: whereClause });
}

export async function findRecentActivityLogs(take: number = 2000) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  });
}
