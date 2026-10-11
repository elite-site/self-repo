import { prisma } from '../../infrastructure/prisma';
import type { Prisma } from '@prisma/client';

export async function findOAuthState(state: string) {
  return prisma.githubOAuthState.findUnique({ where: { state } });
}

export async function findGithubAccount(studentId: string) {
  return prisma.githubAccount.findUnique({ where: { studentId } });
}

export async function countTotalGithubAccounts() {
  return prisma.githubAccount.count();
}

export async function countGithubAccounts(where: Prisma.GithubAccountWhereInput) {
  return prisma.githubAccount.count({ where });
}

export async function findGithubAccountsWithStudent(where: Prisma.GithubAccountWhereInput, skip: number, take: number) {
  return prisma.githubAccount.findMany({
    where,
    skip,
    take,
    orderBy: { connectedAt: 'desc' },
    include: {
      student: {
        select: { id: true, name: true, rollNo: true, year: true, section: true },
      },
    },
  });
}

export async function getRepoCountsByStudentIds(studentIds: string[]) {
  return prisma.githubRepo.groupBy({
    by: ['studentId'],
    where: {
      studentId: { in: studentIds },
      removedFromGithub: false,
    },
    _count: { id: true },
  });
}

export async function getShowcasedCountsByStudentIds(studentIds: string[]) {
  return prisma.githubRepo.groupBy({
    by: ['studentId'],
    where: {
      studentId: { in: studentIds },
      isShowcased: true,
      removedFromGithub: false,
    },
    _count: { id: true },
  });
}

export async function findGithubSyncLogs(where: any, take: number = 20) {
  return prisma.githubSyncLog.findMany({
    where,
    take,
    orderBy: { startedAt: 'desc' },
    include: {
      student: {
        select: { id: true, name: true, rollNo: true },
      },
    },
  });
}

export async function countGithubShowcasedRepos(where: any) {
  return prisma.githubRepo.count({ where });
}

export async function findGithubShowcasedRepos(where: any, skip: number, take: number) {
  return prisma.githubRepo.findMany({
    where,
    skip,
    take,
    orderBy: [{ stars: 'desc' }, { pushedAt: 'desc' }],
    include: {
      student: {
        select: { id: true, name: true, rollNo: true, year: true, section: true },
      },
    },
  });
}
