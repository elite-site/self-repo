import { prisma } from '../../lib/prisma';
import { githubAccountService } from '../github.account.service';
import { githubSyncService } from '../github.sync.service';
import { githubApiService } from '../github.api.service';
import { GithubSyncTrigger } from '@prisma/client';
import { AppError } from '../../utils/appError';

const SHOWCASED_REPO_SELECT = {
  id: true,
  studentId: true,
  githubRepoId: true,
  fullName: true,
  name: true,
  description: true,
  htmlUrl: true,
  isFork: true,
  primaryLanguage: true,
  topics: true,
  stars: true,
  githubCreatedAt: true,
  pushedAt: true,
  languages: true,
  commitCount: true,
  isShowcased: true,
  showcaseRank: true,
} as const;

export async function handleOAuthCallback(code: string, state: string): Promise<void> {
  let studentId = 'unknown';
  try {
    const stateRecord = await prisma.githubOAuthState.findUnique({ where: { state } });
    if (!stateRecord || stateRecord.usedAt || new Date() > stateRecord.expiresAt) {
      throw new AppError('INVALID_STATE', 'OAuth session expired or invalid. Please try again.', 400, 'github.service:handleOAuthCallback');
    }
    studentId = stateRecord.studentId;
    await githubAccountService.handleCallback(studentId, code, state);
  } catch (err: any) {
    console.error(`[github.service:handleOAuthCallback] Failed to complete callback for studentId=${studentId}:`, err?.message || err);
    throw err;
  }
}

export async function getGithubStatus(studentId: string) {
  try {
    return await githubAccountService.getStatus(studentId);
  } catch (err: any) {
    console.error(`[github.service:getGithubStatus] Failed to get status for studentId=${studentId}:`, err?.message || err);
    throw err;
  }
}

export async function getGithubSummary(studentId: string) {
  try {
    return await githubAccountService.getSummary(studentId);
  } catch (err: any) {
    console.error(`[github.service:getGithubSummary] Failed to get summary for studentId=${studentId}:`, err?.message || err);
    throw err;
  }
}

export async function getRepoReadmeExcerpt(studentId: string, repoId: string) {
  try {
    const repo = await prisma.githubRepo.findFirst({
      where: { id: repoId, studentId },
      select: { id: true, fullName: true, readmeExcerpt: true },
    });

    if (!repo) {
      throw new AppError('NOT_FOUND', 'Repository not found', 404, 'github.service:getRepoReadmeExcerpt');
    }
    if (repo.readmeExcerpt) {
      return { id: repo.id, readmeExcerpt: repo.readmeExcerpt };
    }

    const fetched = await githubApiService.fetchReadmeExcerpt(repo.fullName);
    if (fetched) {
      await prisma.githubRepo.update({
        where: { id: repo.id },
        data: { readmeExcerpt: fetched, readmeFetchedAt: new Date() },
      });
      return { id: repo.id, readmeExcerpt: fetched };
    }

    return { id: repo.id, readmeExcerpt: null };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[github.service:getRepoReadmeExcerpt] Failed to get readme for repoId=${repoId}, studentId=${studentId}:`, err?.message || err);
    throw err;
  }
}

export async function initiateGithubConnect(studentId: string): Promise<string> {
  try {
    return await githubAccountService.createConnectUrl(studentId);
  } catch (err: any) {
    console.error(`[github.service:initiateGithubConnect] Failed to create connect URL for studentId=${studentId}:`, err?.message || err);
    throw err;
  }
}

export async function triggerGithubSync(studentId: string) {
  try {
    await githubSyncService.queueSync(studentId, GithubSyncTrigger.MANUAL);
    return { message: 'Sync queued successfully', status: 'QUEUED' };
  } catch (err: any) {
    console.error(`[github.service:triggerGithubSync] Failed to queue sync for studentId=${studentId}:`, err?.message || err);
    throw err;
  }
}

export async function updateShowcasedRepos(studentId: string, uniqueIds: string[]) {
  try {
    const repos = await prisma.githubRepo.findMany({
      where: { id: { in: uniqueIds }, studentId, removedFromGithub: false },
    });

    if (repos.length !== uniqueIds.length) {
      throw new AppError('INVALID_REPOSITORIES', 'One or more selected repositories do not exist or belong to another student.', 400, 'github.service:updateShowcasedRepos');
    }

    await prisma.$transaction([
      prisma.githubRepo.updateMany({
        where: { studentId },
        data: { isShowcased: false, showcaseRank: null },
      }),
      ...uniqueIds.map((id, i) =>
        prisma.githubRepo.update({
          where: { id },
          data: { isShowcased: true, showcaseRank: i + 1 },
        })
      ),
    ]);

    const updated = await prisma.githubRepo.findMany({
      where: { studentId, isShowcased: true },
      orderBy: { showcaseRank: 'asc' },
      select: SHOWCASED_REPO_SELECT,
    });

    return updated.map((r) => ({ ...r, githubRepoId: String(r.githubRepoId) }));
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[github.service:updateShowcasedRepos] Failed to update showcase for studentId=${studentId}:`, err?.message || err);
    throw err;
  }
}

export async function disconnectGithub(studentId: string): Promise<void> {
  try {
    await githubAccountService.disconnect(studentId);
  } catch (err: any) {
    console.error(`[github.service:disconnectGithub] Failed to disconnect GitHub for studentId=${studentId}:`, err?.message || err);
    throw err;
  }
}

export async function snoozeGithubReminder(studentId: string) {
  try {
    return await githubAccountService.snoozeReminder(studentId);
  } catch (err: any) {
    console.error(`[github.service:snoozeGithubReminder] Failed to snooze reminder for studentId=${studentId}:`, err?.message || err);
    throw err;
  }
}
