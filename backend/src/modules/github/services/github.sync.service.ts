import { GithubSyncStatus, GithubSyncTrigger, GithubSyncLogStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import * as repo from '../github.repository';
import { env } from '../../../config/env';
import { githubApiService, GithubRateLimitError } from './github.api.service';
import { logger } from '../../../utils/logger';

export class GithubSyncCooldownError extends Error {
  secondsRemaining: number;
  constructor(message: string, secondsRemaining: number) {
    super(message);
    this.name = 'GithubSyncCooldownError';
    this.secondsRemaining = secondsRemaining;
  }
}

export class GithubSyncDailyCapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GithubSyncDailyCapError';
  }
}

interface QueuedSync {
  studentId: string;
  trigger: GithubSyncTrigger;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export class GithubSyncService {
  private activeJobs = 0;
  private readonly maxConcurrency = 2;
  private queue: QueuedSync[] = [];

  /**
   * Enqueue a sync job for a student
   */
  async queueSync(studentId: string, trigger: GithubSyncTrigger): Promise<{ status: string }> {
    // If manual trigger, enforce cooldown and daily limits before queuing
    if (trigger === GithubSyncTrigger.MANUAL) {
      await this.enforceManualLimits(studentId);
    }

    await repo.updateGithubAccountSyncState(studentId, {
      syncStatus: GithubSyncStatus.QUEUED,
    });

    return new Promise((resolve, reject) => {
      this.queue.push({ studentId, trigger, resolve, reject });
      void this.processNext();
    });
  }

  private async enforceManualLimits(studentId: string): Promise<void> {
    const account = await repo.findGithubAccount(studentId);
    if (!account) {
      throw new Error('No connected GitHub account found for student');
    }

    const now = new Date();

    // 1. Cooldown check
    if (account.nextSyncAllowedAt && account.nextSyncAllowedAt > now) {
      const remainingSeconds = Math.ceil((account.nextSyncAllowedAt.getTime() - now.getTime()) / 1000);
      throw new GithubSyncCooldownError(
        `Sync cooldown is active. Please wait ${remainingSeconds} seconds before syncing again.`,
        remainingSeconds
      );
    }

    // 2. Daily cap check
    const todayStr = now.toISOString().slice(0, 10);
    const lastDayStr = account.manualSyncDay ? account.manualSyncDay.toISOString().slice(0, 10) : '';
    let countToday = account.manualSyncCountToday;

    if (lastDayStr !== todayStr) {
      countToday = 0;
    }

    if (countToday >= env.GITHUB_SYNC_DAILY_CAP) {
      throw new GithubSyncDailyCapError(
        `Daily sync limit reached (${env.GITHUB_SYNC_DAILY_CAP} syncs per day). Please try again tomorrow.`
      );
    }

    // Set next allowed sync timestamp and increment daily counter
    await repo.updateGithubAccountSyncState(studentId, {
      manualSyncCountToday: countToday + 1,
      manualSyncDay: now,
      nextSyncAllowedAt: new Date(Date.now() + env.GITHUB_SYNC_COOLDOWN_MIN * 60 * 1000),
    });
  }

  private async processNext(): Promise<void> {
    if (this.activeJobs >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeJobs++;

    try {
      const result = await this.executeSync(job.studentId, job.trigger);
      job.resolve(result);
    } catch (err) {
      job.reject(err);
    } finally {
      this.activeJobs--;
      void this.processNext();
    }
  }

  /**
   * Execute full sync for a student
   */
  async executeSync(studentId: string, trigger: GithubSyncTrigger) {
    const account = await repo.findGithubAccount(studentId);
    if (!account) {
      throw new Error(`Cannot sync: GitHub account for student ${studentId} not found`);
    }

    await repo.updateGithubAccountSyncState(studentId, {
      syncStatus: GithubSyncStatus.RUNNING,
      syncError: null,
    });

    const startTime = new Date();
    let reposSeen = 0;
    let apiCalls = 0;
    let logStatus: GithubSyncLogStatus = GithubSyncLogStatus.SUCCESS;
    let syncError: string | null = null;
    let writesCount = 0;

    try {
      // 1. Fetch public repositories (prefer GraphQL with 1 API call per 100 repos, fallback to REST)
      let githubRepos: any[] = [];
      let usedGraphQL = false;

      if (env.GITHUB_API_TOKEN) {
        try {
          apiCalls++;
          githubRepos = await githubApiService.fetchUserReposGraphQL(account.login);
          usedGraphQL = true;
        } catch (gqlErr) {
          logger.warn('[GitHubSync] GraphQL query failed, falling back to REST', {
            login: account.login,
            err: gqlErr,
          });
        }
      }

      if (!usedGraphQL) {
        apiCalls++;
        githubRepos = await githubApiService.fetchUserPublicRepos(account.login);
      }

      reposSeen = githubRepos.length;
      const fetchedRepoIds = new Set<string>();

      // Existing repos in DB for this student
      const existingRepos = await repo.findStudentReposForSync(studentId);
      const existingRepoMap = new Map(existingRepos.map((r) => [String(r.githubRepoId), r]));

      const writes: Prisma.PrismaPromise<unknown>[] = [];

      // 2. Process each repo
      for (const repoData of githubRepos) {
        const strId = String(repoData.id);
        fetchedRepoIds.add(strId);
        const existing = existingRepoMap.get(strId);

        // Date comparison via getTime()
        const existingPushedTime = existing?.pushedAt ? new Date(existing.pushedAt).getTime() : 0;
        const newPushedTime = repoData.pushed_at ? new Date(repoData.pushed_at).getTime() : 0;
        const isUnchanged = existing && existingPushedTime === newPushedTime && existing.stars === repoData.stargazers_count;

        if (isUnchanged) {
          continue; // Skip DB write for unchanged repos
        }

        let languages = repoData.languages || (existing?.languages as Record<string, number>) || {};
        const dependencies = repoData.dependencies || (existing?.dependencies as any[]) || [];
        const commitCount = repoData.commitCount ?? existing?.commitCount ?? 0;
        const lastCommitAt = repoData.lastCommitAt || existing?.lastCommitAt || null;
        let etag = repoData.etag || existing?.etag || null;

        // If not using GraphQL, fetch details sequentially as legacy fallback
        if (!usedGraphQL) {
          try {
            apiCalls++;
            const langResult = await githubApiService.fetchRepoLanguages(account.login, repoData.name, etag);
            if (!langResult.notModified && langResult.languages) {
              languages = langResult.languages;
              etag = langResult.etag || null;
            }
          } catch (err: any) {
            if (err instanceof GithubRateLimitError) throw err;
          }
        }

        writes.push(
          repo.upsertSyncedGithubRepo({
            where: {
              studentId_githubRepoId: {
                studentId,
                githubRepoId: BigInt(repoData.id),
              },
            },
            update: {
              fullName: repoData.full_name,
              name: repoData.name,
              description: repoData.description,
              htmlUrl: repoData.html_url,
              isFork: repoData.fork,
              primaryLanguage: repoData.language,
              topics: repoData.topics,
              stars: repoData.stargazers_count,
              githubCreatedAt: repoData.created_at ? new Date(repoData.created_at) : null,
              pushedAt: repoData.pushed_at ? new Date(repoData.pushed_at) : null,
              languages,
              dependencies,
              commitCount,
              lastCommitAt,
              readmeExcerpt: repoData.readmeExcerpt !== undefined ? repoData.readmeExcerpt : (existing?.readmeExcerpt || null),
              readmeFetchedAt: repoData.readmeFetchedAt || existing?.readmeFetchedAt || null,
              etag,
              syncedAt: new Date(),
              removedFromGithub: false,
            },
            create: {
              studentId,
              githubRepoId: BigInt(repoData.id),
              fullName: repoData.full_name,
              name: repoData.name,
              description: repoData.description,
              htmlUrl: repoData.html_url,
              isFork: repoData.fork,
              primaryLanguage: repoData.language,
              topics: repoData.topics,
              stars: repoData.stargazers_count,
              githubCreatedAt: repoData.created_at ? new Date(repoData.created_at) : null,
              pushedAt: repoData.pushed_at ? new Date(repoData.pushed_at) : null,
              languages,
              dependencies,
              commitCount,
              lastCommitAt,
              readmeExcerpt: repoData.readmeExcerpt || null,
              readmeFetchedAt: repoData.readmeFetchedAt || null,
              etag,
              syncedAt: new Date(),
              removedFromGithub: false,
            },
          })
        );
      }

      // 3. Mark repos no longer returned by GitHub as removedFromGithub = true
      for (const existing of existingRepos) {
        if (!fetchedRepoIds.has(String(existing.githubRepoId)) && !existing.removedFromGithub) {
          writes.push(
            repo.updateSyncedGithubRepo({
              where: { id: existing.id },
              data: {
                removedFromGithub: true,
                isShowcased: false,
                showcaseRank: null,
              },
            })
          );
        }
      }

      writesCount = writes.length;

      // Execute all pending writes in one batch transaction
      if (writes.length > 0) {
        await repo.commitGithubRepoWrites(writes);
      }

      // Auto-showcase on first sync if no showcased repos exist (prefer non-fork with >= 1 commit, up to 30)
      const hasExistingShowcase = existingRepos.some((r) => r.isShowcased && !r.removedFromGithub);
      if (!hasExistingShowcase) {
        const activeRepos = await repo.findActiveReposForShowcase(studentId);

        if (activeRepos.length > 0) {
          const sortedCandidates = [...activeRepos].sort((a, b) => {
            const qA = (!a.isFork && (a.commitCount || 0) >= 1) ? 1 : 0;
            const qB = (!b.isFork && (b.commitCount || 0) >= 1) ? 1 : 0;
            if (qA !== qB) return qB - qA;
            if (b.stars !== a.stars) return b.stars - a.stars;
            const tA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
            const tB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
            return tB - tA;
          });

          const topToPick = sortedCandidates.slice(0, 30);
          if (topToPick.length > 0) {
            await repo.setShowcasedRepoRanks(
              topToPick.map((r, idx) => ({ id: r.id, showcaseRank: idx + 1 }))
            );
          }
        }
      }

      // 4. Recompute student skills from active non-fork repositories
      await this.recomputeStudentSkills(studentId);

      // 5. Update GithubAccount status
      await repo.updateGithubAccountSyncState(studentId, {
        lastSyncedAt: new Date(),
        syncStatus: GithubSyncStatus.IDLE,
        syncError: null,
      });

      logStatus = GithubSyncLogStatus.SUCCESS;
    } catch (err: any) {
      if (err instanceof GithubRateLimitError) {
        logStatus = GithubSyncLogStatus.SKIPPED_RATE_LIMIT;
        syncError = err.message;
      } else {
        logStatus = GithubSyncLogStatus.FAILED;
        syncError = err?.message || String(err);
      }

      await repo.updateGithubAccountSyncState(studentId, {
        syncStatus: GithubSyncStatus.FAILED,
        syncError,
      });
    } finally {
      // 6. Record log
      const rateStatus = githubApiService.getRateLimitStatus();
      await repo.createGithubSyncLog({
        studentId,
        trigger,
        status: logStatus,
        reposSeen,
        apiCalls,
        rateRemaining: rateStatus.remaining,
        startedAt: startTime,
        finishedAt: new Date(),
        error: syncError,
      });
    }

    return {
      status: logStatus,
      reposSeen,
      apiCalls,
      writesCount,
      message: writesCount === 0 ? 'No changes' : undefined,
      error: syncError,
    };
  }

  /**
   * Recompute skills for a student from their active non-fork GitHub repositories
   */
  async recomputeStudentSkills(studentId: string): Promise<void> {
    let repos = await repo.findNonForkActiveRepos(studentId);
    if (repos.length === 0) {
      repos = await repo.findActiveReposForShowcase(studentId);
    }

    const langMap = new Map<string, { displayName: string; bytes: number; repoIds: Set<string>; lastDate: Date | null }>();
    const depMap = new Map<string, { repoIds: Set<string>; lastDate: Date | null }>();
    const topicMap = new Map<string, { displayName: string; repoIds: Set<string>; lastDate: Date | null }>();

    for (const repo of repos) {
      const pDate = repo.pushedAt || repo.githubCreatedAt || null;

      // Languages
      const langs = (repo.languages as Record<string, number>) || {};
      for (const [langName, bytes] of Object.entries(langs)) {
        const trimmed = langName.trim();
        const key = trimmed.toLowerCase();
        if (!key) continue;
        const current = langMap.get(key) || { displayName: trimmed, bytes: 0, repoIds: new Set<string>(), lastDate: null };
        current.bytes += typeof bytes === 'number' ? bytes : 0;
        current.repoIds.add(repo.id);
        if (pDate && (!current.lastDate || pDate > current.lastDate)) {
          current.lastDate = pDate;
        }
        langMap.set(key, current);
      }

      // Primary language fallback if not in languages map
      if (repo.primaryLanguage) {
        const primName = repo.primaryLanguage.trim();
        const primKey = primName.toLowerCase();
        if (primKey && !langMap.has(primKey)) {
          langMap.set(primKey, { displayName: primName, bytes: 1000, repoIds: new Set([repo.id]), lastDate: pDate });
        }
      }

      // Dependencies
      const deps = (repo.dependencies as Array<{ ecosystem: string; name: string }>) || [];
      if (Array.isArray(deps)) {
        for (const dep of deps) {
          if (!dep?.name) continue;
          const nameKey = dep.name.trim().toLowerCase();
          const ecoKey = dep.ecosystem ? `${dep.ecosystem.trim().toLowerCase()}:${nameKey}` : nameKey;

          for (const k of [nameKey, ecoKey]) {
            const current = depMap.get(k) || { repoIds: new Set<string>(), lastDate: null };
            current.repoIds.add(repo.id);
            if (pDate && (!current.lastDate || pDate > current.lastDate)) {
              current.lastDate = pDate;
            }
            depMap.set(k, current);
          }
        }
      }

      // Topics
      if (Array.isArray(repo.topics)) {
        for (const topic of repo.topics) {
          if (!topic || typeof topic !== 'string') continue;
          const tName = topic.trim();
          const tKey = tName.toLowerCase();
          if (!tKey) continue;
          const current = topicMap.get(tKey) || { displayName: tName, repoIds: new Set<string>(), lastDate: null };
          current.repoIds.add(repo.id);
          if (pDate && (!current.lastDate || pDate > current.lastDate)) {
            current.lastDate = pDate;
          }
          topicMap.set(tKey, current);
        }
      }
    }

    // Match against SkillSourceMap
    const allLangKeys = Array.from(langMap.keys());
    const allDepKeys = Array.from(depMap.keys());
    const allTopicKeys = Array.from(topicMap.keys());

    const matchedMaps: Array<{
      skillId: string;
      sourceType: 'LANGUAGE' | 'DEPENDENCY' | 'TOPIC';
      ecosystem: string | null;
      sourceKey: string;
    }> = await repo.findMatchingSkillSourceMaps({
      languageKeys: allLangKeys,
      dependencyKeys: allDepKeys,
      topicKeys: allTopicKeys,
    });

    // Check for unmapped languages and link or auto-create Skill and SkillSourceMap
    const mappedLangKeys = new Set(
      matchedMaps.filter((m) => m.sourceType === 'LANGUAGE').map((m) => m.sourceKey.toLowerCase())
    );
    const unmappedLangKeys = allLangKeys.filter((k) => !mappedLangKeys.has(k));

    if (unmappedLangKeys.length > 0) {
      try {
        const allSkills = await repo.findSkillsForLanguageMatching();
        const skillByNameLower = new Map<string, { id: string; name: string }>();
        for (const sk of allSkills) {
          skillByNameLower.set(sk.name.trim().toLowerCase(), sk);
        }

        for (const langKey of unmappedLangKeys) {
          const langInfo = langMap.get(langKey);
          if (!langInfo) continue;
          let skill = skillByNameLower.get(langKey);

          if (!skill) {
            try {
              const created = await repo.createSkill({
                name: langInfo.displayName,
                category: 'Languages',
                isActive: true,
              });
              skill = created;
              skillByNameLower.set(langKey, created);
            } catch {
              const found = await repo.findSkillByName(langInfo.displayName);
              if (found) {
                skill = found;
                skillByNameLower.set(langKey, found);
              }
            }
          }

          if (skill) {
            try {
              await repo.createSkillSourceMap({
                skillId: skill.id,
                sourceType: 'LANGUAGE',
                sourceKey: langKey,
              });
            } catch {
              // Ignore if mapping already exists
            }
            matchedMaps.push({
              skillId: skill.id,
              sourceType: 'LANGUAGE',
              ecosystem: null,
              sourceKey: langKey,
            });
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    // Check for unmapped topics that match existing skills
    const mappedTopicKeys = new Set(
      matchedMaps.filter((m) => m.sourceType === 'TOPIC').map((m) => m.sourceKey.toLowerCase())
    );
    const unmappedTopicKeys = allTopicKeys.filter((k) => !mappedTopicKeys.has(k));

    if (unmappedTopicKeys.length > 0) {
      try {
        const allSkills = await repo.findActiveSkillsForTopicMatching();
        const skillByNameLower = new Map<string, { id: string; name: string }>();
        for (const sk of allSkills) {
          skillByNameLower.set(sk.name.trim().toLowerCase(), sk);
        }

        for (const tKey of unmappedTopicKeys) {
          const skill = skillByNameLower.get(tKey);
          if (skill) {
            try {
              await repo.createSkillSourceMap({
                skillId: skill.id,
                sourceType: 'TOPIC',
                sourceKey: tKey,
              });
            } catch {
              // Ignore if duplicate
            }
            matchedMaps.push({
              skillId: skill.id,
              sourceType: 'TOPIC',
              ecosystem: null,
              sourceKey: tKey,
            });
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    interface SkillAggregate {
      repoIds: Set<string>;
      totalBytes: bigint;
      lastEvidenceAt: Date | null;
    }

    const skillAggregates = new Map<string, SkillAggregate>();

    for (const m of matchedMaps) {
      const agg = skillAggregates.get(m.skillId) || {
        repoIds: new Set<string>(),
        totalBytes: BigInt(0),
        lastEvidenceAt: null,
      };

      if (m.sourceType === 'LANGUAGE') {
        const evidence = langMap.get(m.sourceKey.toLowerCase());
        if (evidence) {
          evidence.repoIds.forEach((id) => agg.repoIds.add(id));
          agg.totalBytes += BigInt(evidence.bytes);
          if (evidence.lastDate && (!agg.lastEvidenceAt || evidence.lastDate > agg.lastEvidenceAt)) {
            agg.lastEvidenceAt = evidence.lastDate;
          }
        }
      } else if (m.sourceType === 'DEPENDENCY') {
        const lookupKey = m.ecosystem ? `${m.ecosystem.toLowerCase()}:${m.sourceKey.toLowerCase()}` : m.sourceKey.toLowerCase();
        const evidence = depMap.get(lookupKey) || depMap.get(m.sourceKey.toLowerCase());
        if (evidence) {
          evidence.repoIds.forEach((id) => agg.repoIds.add(id));
          if (evidence.lastDate && (!agg.lastEvidenceAt || evidence.lastDate > agg.lastEvidenceAt)) {
            agg.lastEvidenceAt = evidence.lastDate;
          }
        }
      } else if (m.sourceType === 'TOPIC') {
        const evidence = topicMap.get(m.sourceKey.toLowerCase());
        if (evidence) {
          evidence.repoIds.forEach((id) => agg.repoIds.add(id));
          if (evidence.lastDate && (!agg.lastEvidenceAt || evidence.lastDate > agg.lastEvidenceAt)) {
            agg.lastEvidenceAt = evidence.lastDate;
          }
        }
      }

      skillAggregates.set(m.skillId, agg);
    }

    const activeSkillIds: string[] = [];

    for (const [skillId, agg] of skillAggregates.entries()) {
      if (agg.repoIds.size === 0) continue;
      activeSkillIds.push(skillId);

      await repo.upsertGithubStudentSkill({
        studentId,
        skillId,
        repoCount: agg.repoIds.size,
        totalBytes: agg.totalBytes,
        lastEvidenceAt: agg.lastEvidenceAt,
      });
    }

    // Delete any skills for this student that no longer have evidence
    await repo.deleteStaleGithubStudentSkills(studentId, activeSkillIds);

    // Initialize profile skills if empty so showcased skills are visible by default
    try {
      const profile = await repo.ensureStudentProfileWithSkills(studentId);

      if (profile && profile.skills.length === 0 && activeSkillIds.length > 0) {
        const topSkillIds = Array.from(skillAggregates.entries())
          .sort((a, b) => b[1].repoIds.size - a[1].repoIds.size || Number(b[1].totalBytes - a[1].totalBytes))
          .slice(0, 10)
          .map(([skillId]) => skillId);

        if (topSkillIds.length > 0) {
          await repo.createStudentSkills(profile.id, topSkillIds);
        }
      }
    } catch {
      // Non-fatal
    }
  }
}

export const githubSyncService = new GithubSyncService();
