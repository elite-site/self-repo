import * as repo from './github.repository';
import { githubSyncService } from './services/github.sync.service';
import { GithubSyncTrigger } from '@prisma/client';
import { AppError } from '../../utils/appError';

export * from './services/student.github.service';
export * from './services/github.account.service';
export * from './services/github.sync.service';
export * from './services/github.api.service';

export async function getAdminGithubOverview(params: { page?: number; limit?: number; search?: string }) {
  const p = Math.max(1, params.page || 1);
  const l = Math.max(1, Math.min(100, params.limit || 25));
  const skip = (p - 1) * l;

  const studentWhere: any = {};
  if (params.search) {
    studentWhere.OR = [
      { name: { contains: String(params.search), mode: 'insensitive' } },
      { rollNo: { contains: String(params.search), mode: 'insensitive' } },
    ];
  }

  const where: any = params.search ? { student: studentWhere } : {};

  const [totalConnected, total, accounts] = await Promise.all([
    repo.countTotalGithubAccounts(),
    repo.countGithubAccounts(where),
    repo.findGithubAccountsWithStudent(where, skip, l),
  ]);

  const studentIds = accounts.map((a) => a.studentId);
  const [repoCounts, showcasedCounts] = await Promise.all([
    repo.getRepoCountsByStudentIds(studentIds),
    repo.getShowcasedCountsByStudentIds(studentIds),
  ]);

  const repoCountMap = new Map(repoCounts.map((rc) => [rc.studentId, rc._count.id]));
  const showcasedMap = new Map(showcasedCounts.map((sc) => [sc.studentId, sc._count.id]));

  return {
    totalConnected,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    accounts: accounts.map((acc) => ({
      id: acc.id,
      studentId: acc.studentId,
      student: acc.student,
      githubUserId: String(acc.githubUserId),
      login: acc.login,
      avatarUrl: acc.avatarUrl,
      connectedAt: acc.connectedAt,
      lastSyncedAt: acc.lastSyncedAt,
      syncStatus: acc.syncStatus,
      syncError: acc.syncError,
      reposCount: repoCountMap.get(acc.studentId) || 0,
      showcasedCount: showcasedMap.get(acc.studentId) || 0,
    })),
  };
}

export async function getAdminGithubLogs(params: { status?: string; filter?: string }) {
  const where: any = {};

  if (params.status) {
    const statuses = String(params.status).split(',').map((s) => s.trim()) as any[];
    where.status = { in: statuses };
  } else if (params.filter === 'errors' || params.filter === 'failed') {
    where.status = { in: ['FAILED', 'SKIPPED_RATE_LIMIT'] };
  }

  return repo.findGithubSyncLogs(where, 20);
}

export async function adminResyncStudent(studentId: string) {
  const account = await repo.findGithubAccount(studentId);
  if (!account) {
    throw new AppError('NOT_FOUND', 'Student does not have a connected GitHub account.', 404);
  }
  return githubSyncService.queueSync(studentId, GithubSyncTrigger.MANUAL);
}

export async function getAdminGithubProjects(params: { search?: string; page?: number; limit?: number }) {
  const p = Math.max(1, params.page || 1);
  const l = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (p - 1) * l;

  const where: any = {
    removedFromGithub: false,
    isShowcased: true,
  };
  if (params.search) {
    where.OR = [
      { name: { contains: String(params.search), mode: 'insensitive' } },
      { description: { contains: String(params.search), mode: 'insensitive' } },
      { student: { name: { contains: String(params.search), mode: 'insensitive' } } },
      { student: { rollNo: { contains: String(params.search), mode: 'insensitive' } } },
    ];
  }

  const [total, repos] = await Promise.all([
    repo.countGithubShowcasedRepos(where),
    repo.findGithubShowcasedRepos(where, skip, l),
  ]);

  return {
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    items: repos.map((r) => ({
      ...r,
      githubRepoId: String(r.githubRepoId),
    })),
  };
}

export async function syncScheduledBatch(take: number = 10): Promise<{ processed: number }> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const accounts = await repo.findAccountsNeedingScheduledSync(cutoff, take);
  for (const account of accounts) {
    try {
      await githubSyncService.queueSync(account.studentId, GithubSyncTrigger.SCHEDULED);
    } catch {
      // Non-fatal per individual account scheduled sync
    }
  }
  return { processed: accounts.length };
}
