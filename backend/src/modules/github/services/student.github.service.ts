import { clearPublicStudentCaches } from '../../public';
import * as repo from '../github.repository';
import { githubAccountService } from './github.account.service';
import { githubSyncService } from './github.sync.service';
import { githubApiService } from './github.api.service';
import { GithubSyncTrigger } from '@prisma/client';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

export async function handleOAuthCallback(code: string, state: string): Promise<void> {
  let studentId = 'unknown';
  try {
    const stateRecord = await repo.findGithubOAuthStateByState(state);
    if (!stateRecord || stateRecord.usedAt || new Date() > stateRecord.expiresAt) {
      throw new AppError('INVALID_STATE', 'OAuth session expired or invalid. Please try again.', 400, 'github.service:handleOAuthCallback');
    }
    studentId = stateRecord.studentId;
    await githubAccountService.handleCallback(studentId, code, state);
  } catch (err: any) {
    logger.error('[github.service:handleOAuthCallback] Failed to complete callback', {
      studentId,
      err,
    });
    throw err;
  }
}

export async function getGithubStatus(studentId: string) {
  try {
    return await githubAccountService.getStatus(studentId);
  } catch (err: any) {
    logger.error('[github.service:getGithubStatus] Failed to get status', { studentId, err });
    throw err;
  }
}

export async function getGithubSummary(studentId: string) {
  try {
    return await githubAccountService.getSummary(studentId);
  } catch (err: any) {
    logger.error('[github.service:getGithubSummary] Failed to get summary', { studentId, err });
    throw err;
  }
}

export async function getRepoReadmeExcerpt(studentId: string, repoId: string) {
  try {
    const repoRecord = await repo.findRepoReadmeRecord(studentId, repoId);

    if (!repoRecord) {
      throw new AppError('NOT_FOUND', 'Repository not found', 404, 'github.service:getRepoReadmeExcerpt');
    }
    if (repoRecord.readmeExcerpt) {
      return { id: repoRecord.id, readmeExcerpt: repoRecord.readmeExcerpt };
    }

    const fetched = await githubApiService.fetchReadmeExcerpt(repoRecord.fullName);
    if (fetched) {
      await repo.updateRepoReadmeExcerpt(repoRecord.id, fetched, new Date());
      return { id: repoRecord.id, readmeExcerpt: fetched };
    }

    return { id: repoRecord.id, readmeExcerpt: null };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error('[github.service:getRepoReadmeExcerpt] Failed to get readme', {
      repoId,
      studentId,
      err,
    });
    throw err;
  }
}

export async function initiateGithubConnect(studentId: string): Promise<string> {
  try {
    return await githubAccountService.createConnectUrl(studentId);
  } catch (err: any) {
    logger.error('[github.service:initiateGithubConnect] Failed to create connect URL', { studentId, err });
    throw err;
  }
}

export async function triggerGithubSync(studentId: string) {
  try {
    await githubSyncService.queueSync(studentId, GithubSyncTrigger.MANUAL);
    return { message: 'Sync queued successfully', status: 'QUEUED' };
  } catch (err: any) {
    logger.error('[github.service:triggerGithubSync] Failed to queue sync', { studentId, err });
    throw err;
  }
}

export async function updateShowcasedRepos(studentId: string, uniqueIds: string[]) {
  try {
    const repos = await repo.findShowcaseCandidateRepos(studentId, uniqueIds);

    if (repos.length !== uniqueIds.length) {
      throw new AppError('INVALID_REPOSITORIES', 'One or more selected repositories do not exist or belong to another student.', 400, 'github.service:updateShowcasedRepos');
    }

    await repo.setShowcasedRepos(studentId, uniqueIds);

    const updated = await repo.findShowcasedReposForStudent(studentId);

    return updated.map((r) => ({ ...r, githubRepoId: String(r.githubRepoId) }));
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error('[github.service:updateShowcasedRepos] Failed to update showcase', { studentId, err });
    throw err;
  }
}

export async function disconnectGithub(studentId: string): Promise<void> {
  try {
    await githubAccountService.disconnect(studentId);
  } catch (err: any) {
    logger.error('[github.service:disconnectGithub] Failed to disconnect GitHub', { studentId, err });
    throw err;
  }
}

export async function snoozeGithubReminder(studentId: string) {
  try {
    return await githubAccountService.snoozeReminder(studentId);
  } catch (err: any) {
    logger.error('[github.service:snoozeGithubReminder] Failed to snooze reminder', { studentId, err });
    throw err;
  }
}

export async function updateShowcasedSkills(studentId: string, skillIds: string[]) {
  try {
    const profile = await repo.ensureStudentProfile(studentId);

    if (skillIds.length > 0) {
      const existingSkills = await repo.findExistingSkillIds(skillIds);
      const existingSkillIdSet = new Set(existingSkills.map((s) => s.id));
      const invalid = skillIds.filter((id) => !existingSkillIdSet.has(id));
      if (invalid.length > 0) {
        throw new AppError(
          'INVALID_SKILLS',
          'One or more selected skills do not exist.',
          400,
          'github.service:updateShowcasedSkills'
        );
      }
    }

    await repo.replaceProfileSkills(profile.id, skillIds);

    clearPublicStudentCaches();

    return {
      success: true,
      showcasedSkillIds: skillIds,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error('[github.service:updateShowcasedSkills] Failed to update skills showcase', { studentId, err });
    throw err;
  }
}
