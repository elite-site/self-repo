import { prisma } from '../../infrastructure/prisma';
import type { CodeChefStatus, CodeChefSyncTrigger, CodeChefSyncLogStatus, Prisma } from '@prisma/client';
import type { AdminCodeChefFilterParams } from './codechef.types';

export async function findAccountByStudentId(studentId: string) {
  return prisma.codeChefAccount.findUnique({
    where: { studentId },
    select: {
      id: true,
      studentId: true,
      handle: true,
      verified: true,
      verifiedAt: true,
      verifyCode: true,
      verifyCodeExpiresAt: true,
      status: true,
      lastSyncedAt: true,
      lastError: true,
      showPublic: true,
      displayName: true,
      avatarUrl: true,
      country: true,
      institution: true,
      currentRating: true,
      maxRating: true,
      stars: true,
      globalRank: true,
      topPercentage: true,
      totalSolved: true,
      totalContests: true,
      totalActiveDays: true,
      currentStreak: true,
      longestStreak: true,
      badgesCount: true,
      createdAt: true,
      updatedAt: true,
      student: {
        select: {
          rollNo: true,
          name: true,
          githubAccount: { select: { login: true } },
        },
      },
    },
  });
}

export async function findAccountByHandle(handle: string) {
  return prisma.codeChefAccount.findUnique({
    where: { handle },
    select: { id: true, studentId: true, handle: true, verified: true },
  });
}

export async function upsertAccount(studentId: string, handle: string, data: Prisma.CodeChefAccountCreateInput) {
  return prisma.codeChefAccount.upsert({
    where: { studentId },
    create: data,
    update: {
      handle,
      status: data.status,
      verified: data.verified,
      verifyCode: data.verifyCode,
      verifyCodeExpiresAt: data.verifyCodeExpiresAt,
      lastSyncedAt: data.lastSyncedAt,
      lastError: data.lastError,
    },
  });
}

export async function updateAccount(id: string, data: Prisma.CodeChefAccountUpdateInput) {
  return prisma.codeChefAccount.update({ where: { id }, data });
}

export async function deleteAccountByStudentId(studentId: string) {
  return prisma.codeChefAccount.delete({ where: { studentId } });
}

export async function findProfileDataByAccountId(accountId: string) {
  return prisma.codeChefProfileData.findUnique({ where: { accountId } });
}

export async function upsertProfileData(accountId: string, data: Prisma.CodeChefProfileDataCreateInput) {
  return prisma.codeChefProfileData.upsert({
    where: { accountId },
    create: data,
    update: {
      profile: data.profile,
      contests: data.contests,
      heatmap: data.heatmap,
      topics: data.topics,
      difficulty: data.difficulty,
      badges: data.badges,
      syncedAt: new Date(),
    },
  });
}

export async function createSyncLog(data: {
  accountId: string;
  trigger: CodeChefSyncTrigger;
  status: CodeChefSyncLogStatus;
  durationMs: number;
  apiCalls: number;
  error?: string | null;
}) {
  return prisma.codeChefSyncLog.create({ data });
}

export async function findStudentsWithCodeChef(params: AdminCodeChefFilterParams) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.StudentWhereInput = {};
  if (params.year) where.year = params.year;
  if (params.section) where.section = { equals: params.section, mode: 'insensitive' };
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { rollNo: { contains: params.search, mode: 'insensitive' } },
      { codechefAccount: { handle: { contains: params.search, mode: 'insensitive' } } },
    ];
  }
  if (params.connected === true) where.codechefAccount = { isNot: null };
  if (params.connected === false) where.codechefAccount = { is: null };

  const accountWhere: Prisma.CodeChefAccountWhereInput = {};
  if (params.minRating !== undefined) accountWhere.currentRating = { gte: params.minRating };
  if (params.stars !== undefined) accountWhere.stars = params.stars;
  if (params.status) {
    if (params.status === 'UNVERIFIED') {
      accountWhere.verified = false;
    } else {
      accountWhere.status = params.status as CodeChefStatus;
    }
  }
  if (Object.keys(accountWhere).length > 0) {
    where.codechefAccount = where.codechefAccount ? { ...where.codechefAccount, ...accountWhere } : accountWhere;
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { rollNo: 'asc' },
      select: {
        id: true,
        name: true,
        rollNo: true,
        year: true,
        section: true,
        codechefAccount: {
          select: {
            id: true,
            handle: true,
            verified: true,
            status: true,
            currentRating: true,
            stars: true,
            totalSolved: true,
            totalContests: true,
            lastSyncedAt: true,
          },
        },
      },
    }),
  ]);

  return { total, students, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

export async function findLeaderboard(year?: number, limit = 10) {
  const where: Prisma.CodeChefAccountWhereInput = {
    verified: true,
    currentRating: { not: null, gt: 0 },
  };
  if (year) where.student = { year };

  return prisma.codeChefAccount.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { currentRating: 'desc' },
    select: {
      id: true,
      studentId: true,
      handle: true,
      currentRating: true,
      stars: true,
      totalSolved: true,
      totalContests: true,
      student: { select: { name: true, rollNo: true, year: true } },
    },
  });
}

export async function findStatsAggregate() {
  const [totalStudents, connectedCount, verifiedCount, activeAccounts, staleCount, errorCount, starGroups] =
    await Promise.all([
      prisma.student.count(),
      prisma.codeChefAccount.count(),
      prisma.codeChefAccount.count({ where: { verified: true } }),
      prisma.codeChefAccount.count({
        where: { lastSyncedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.codeChefAccount.count({ where: { status: 'STALE' } }),
      prisma.codeChefAccount.count({ where: { status: 'ERROR' } }),
      prisma.codeChefAccount.groupBy({
        by: ['stars'],
        _count: { stars: true },
        where: { stars: { not: null } },
      }),
    ]);

  const starsDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const group of starGroups) {
    if (group.stars && group.stars >= 1 && group.stars <= 7) {
      starsDistribution[group.stars] = group._count.stars;
    }
  }

  return {
    totalStudents,
    connectedCount,
    connectedPercentage: totalStudents > 0 ? parseFloat(((connectedCount / totalStudents) * 100).toFixed(1)) : 0,
    verifiedCount,
    activeThisMonthCount: activeAccounts,
    staleCount,
    errorCount,
    starsDistribution,
  };
}

export async function findStaleAccounts(limit = 10) {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.codeChefAccount.findMany({
    where: {
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: threshold } }],
    },
    take: limit,
    orderBy: { lastSyncedAt: 'asc' },
    select: { id: true, studentId: true, handle: true, lastSyncedAt: true },
  });
}
