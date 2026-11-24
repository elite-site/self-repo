import { prisma } from '../../infrastructure/prisma';
import type { Prisma } from '@prisma/client';

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

const STATUS_REPO_SELECT = {
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
  firstCommitAt: true,
  lastCommitAt: true,
  isShowcased: true,
  showcaseRank: true,
  removedFromGithub: true,
} as const;

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
    include: {
      student: {
        select: { id: true, name: true, rollNo: true, year: true, section: true },
      },
    },
  });
}

export async function findAccountsNeedingScheduledSync(cutoff: Date, take: number = 10) {
  return prisma.githubAccount.findMany({
    where: {
      syncStatus: { notIn: ['RUNNING', 'QUEUED'] },
      OR: [
        { lastSyncedAt: null },
        { lastSyncedAt: { lte: cutoff } },
      ],
    },
    take,
  });
}

export function findGithubOAuthStateByState(state: string) {
  return prisma.githubOAuthState.findUnique({ where: { state } });
}

export function createGithubOAuthState(data: Prisma.GithubOAuthStateUncheckedCreateInput) {
  return prisma.githubOAuthState.create({ data });
}

export function markGithubOAuthStateUsed(id: string, usedAt: Date) {
  return prisma.githubOAuthState.update({ where: { id }, data: { usedAt } });
}

export function findStudentById(studentId: string) {
  return prisma.student.findUnique({ where: { id: studentId } });
}

export function findGithubAccountByUserId(githubUserId: bigint) {
  return prisma.githubAccount.findUnique({ where: { githubUserId } });
}

export function upsertConnectedGithubAccount(params: {
  studentId: string;
  githubUserId: bigint;
  login: string;
  avatarUrl: string | null;
}) {
  const { studentId, githubUserId, login, avatarUrl } = params;
  return prisma.githubAccount.upsert({
    where: { studentId },
    update: {
      githubUserId,
      login,
      avatarUrl,
      syncStatus: 'QUEUED',
      syncError: null,
    },
    create: {
      studentId,
      githubUserId,
      login,
      avatarUrl,
      syncStatus: 'QUEUED',
    },
  });
}

export function updateGithubAccountSyncState(
  studentId: string,
  data: Prisma.GithubAccountUncheckedUpdateInput,
) {
  return prisma.githubAccount.update({ where: { studentId }, data });
}

export async function deleteGithubConnection(studentId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.project.updateMany({
      where: { studentId, githubRepoId: { not: null } },
      data: { githubRepoId: null },
    });

    await tx.githubStudentSkill.deleteMany({ where: { studentId } });
    await tx.githubRepo.deleteMany({ where: { studentId } });
    await tx.githubAccount.deleteMany({ where: { studentId } });
    await tx.githubOAuthState.deleteMany({ where: { studentId } });
  }, { maxWait: 2000, timeout: 5000 });
}

export function updateStudentGithubReminder(studentId: string, snoozedUntil: Date) {
  return prisma.student.update({
    where: { id: studentId },
    data: { githubReminderSnoozedUntil: snoozedUntil },
  });
}

export function findStudentGithubSummary(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: {
      githubReminderSnoozedUntil: true,
      githubAccount: {
        select: {
          login: true,
          lastSyncedAt: true,
          syncStatus: true,
        },
      },
    },
  });
}

export function countActiveGithubRepos(studentId: string) {
  return prisma.githubRepo.count({ where: { studentId, removedFromGithub: false } });
}

export function countShowcasedActiveGithubRepos(studentId: string) {
  return prisma.githubRepo.count({
    where: { studentId, isShowcased: true, removedFromGithub: false },
  });
}

export function findStudentForGithubStatus(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      githubReminderSnoozedUntil: true,
      githubAccount: true,
    },
  });
}

export function findStatusRepos(studentId: string) {
  return prisma.githubRepo.findMany({
    where: { studentId, removedFromGithub: false },
    orderBy: [{ isShowcased: 'desc' }, { showcaseRank: 'asc' }, { stars: 'desc' }, { pushedAt: 'desc' }],
    select: STATUS_REPO_SELECT,
  });
}

export function findGithubStudentSkills(studentId: string) {
  return prisma.githubStudentSkill.findMany({
    where: { studentId },
    include: { skill: true },
    orderBy: [{ repoCount: 'desc' }, { totalBytes: 'desc' }],
  });
}

export function findStudentProfileWithSkills(studentId: string) {
  return prisma.studentProfile.findUnique({
    where: { studentId },
    include: { skills: true },
  });
}

export function findRepoReadmeRecord(studentId: string, repoId: string) {
  return prisma.githubRepo.findFirst({
    where: { id: repoId, studentId },
    select: { id: true, fullName: true, readmeExcerpt: true },
  });
}

export function updateRepoReadmeExcerpt(repoId: string, readmeExcerpt: string, readmeFetchedAt: Date) {
  return prisma.githubRepo.update({
    where: { id: repoId },
    data: { readmeExcerpt, readmeFetchedAt },
  });
}

export function findShowcaseCandidateRepos(studentId: string, repoIds: string[]) {
  return prisma.githubRepo.findMany({
    where: { id: { in: repoIds }, studentId, removedFromGithub: false },
  });
}

export async function setShowcasedRepos(studentId: string, repoIds: string[]): Promise<void> {
  await prisma.$transaction([
    prisma.githubRepo.updateMany({
      where: { studentId },
      data: { isShowcased: false, showcaseRank: null },
    }),
    ...repoIds.map((id, i) =>
      prisma.githubRepo.update({
        where: { id },
        data: { isShowcased: true, showcaseRank: i + 1 },
      })
    ),
  ]);
}

export function findShowcasedReposForStudent(studentId: string) {
  return prisma.githubRepo.findMany({
    where: { studentId, isShowcased: true },
    orderBy: { showcaseRank: 'asc' },
    select: SHOWCASED_REPO_SELECT,
  });
}

export function ensureStudentProfile(studentId: string) {
  return prisma.studentProfile.upsert({
    where: { studentId },
    update: {},
    create: { studentId },
  });
}

export function findExistingSkillIds(skillIds: string[]) {
  return prisma.skill.findMany({
    where: { id: { in: skillIds } },
    select: { id: true },
  });
}

export async function replaceProfileSkills(profileId: string, skillIds: string[]): Promise<void> {
  await prisma.$transaction([
    prisma.studentSkill.deleteMany({ where: { profileId } }),
    ...(skillIds.length > 0
      ? [
          prisma.studentSkill.createMany({
            data: skillIds.map((skillId) => ({
              profileId,
              skillId,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
}

export function findStudentReposForSync(studentId: string) {
  return prisma.githubRepo.findMany({ where: { studentId } });
}

export function upsertSyncedGithubRepo(args: Prisma.GithubRepoUpsertArgs) {
  return prisma.githubRepo.upsert(args);
}

export function updateSyncedGithubRepo(args: Prisma.GithubRepoUpdateArgs) {
  return prisma.githubRepo.update(args);
}

export function commitGithubRepoWrites(writes: Prisma.PrismaPromise<unknown>[]) {
  return prisma.$transaction(writes);
}

export function findActiveReposForShowcase(studentId: string) {
  return prisma.githubRepo.findMany({
    where: { studentId, removedFromGithub: false },
  });
}

export async function setShowcasedRepoRanks(
  rankedRepos: Array<{ id: string; showcaseRank: number }>,
): Promise<void> {
  await prisma.$transaction(
    rankedRepos.map((r) =>
      prisma.githubRepo.update({
        where: { id: r.id },
        data: { isShowcased: true, showcaseRank: r.showcaseRank },
      })
    )
  );
}

export function createGithubSyncLog(data: Prisma.GithubSyncLogUncheckedCreateInput) {
  return prisma.githubSyncLog.create({ data });
}

export function findNonForkActiveRepos(studentId: string) {
  return prisma.githubRepo.findMany({
    where: { studentId, removedFromGithub: false, isFork: false },
  });
}

export function findMatchingSkillSourceMaps(params: {
  languageKeys: string[];
  dependencyKeys: string[];
  topicKeys: string[];
}) {
  return prisma.skillSourceMap.findMany({
    where: {
      OR: [
        { sourceType: 'LANGUAGE', sourceKey: { in: params.languageKeys } },
        { sourceType: 'DEPENDENCY', sourceKey: { in: params.dependencyKeys } },
        { sourceType: 'TOPIC', sourceKey: { in: params.topicKeys } },
      ],
    },
    select: {
      skillId: true,
      sourceType: true,
      ecosystem: true,
      sourceKey: true,
    },
  });
}

export function findSkillsForLanguageMatching() {
  return prisma.skill.findMany({ select: { id: true, name: true } });
}

export function findActiveSkillsForTopicMatching() {
  return prisma.skill.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
}

export function createSkill(data: { name: string; category: string; isActive: boolean }) {
  return prisma.skill.create({
    data,
    select: { id: true, name: true },
  });
}

export function findSkillByName(name: string) {
  return prisma.skill.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true, name: true },
  });
}

export function createSkillSourceMap(data: Prisma.SkillSourceMapUncheckedCreateInput) {
  return prisma.skillSourceMap.create({ data });
}

export function upsertGithubStudentSkill(params: {
  studentId: string;
  skillId: string;
  repoCount: number;
  totalBytes: bigint;
  lastEvidenceAt: Date | null;
}) {
  const { studentId, skillId, repoCount, totalBytes, lastEvidenceAt } = params;
  return prisma.githubStudentSkill.upsert({
    where: {
      studentId_skillId: {
        studentId,
        skillId,
      },
    },
    update: {
      repoCount,
      totalBytes,
      lastEvidenceAt,
    },
    create: {
      studentId,
      skillId,
      repoCount,
      totalBytes,
      lastEvidenceAt,
    },
  });
}

export function deleteStaleGithubStudentSkills(studentId: string, activeSkillIds: string[]) {
  return prisma.githubStudentSkill.deleteMany({
    where: {
      studentId,
      skillId: { notIn: activeSkillIds },
    },
  });
}

export function ensureStudentProfileWithSkills(studentId: string) {
  return prisma.studentProfile.upsert({
    where: { studentId },
    update: {},
    create: { studentId },
    include: { skills: true },
  });
}

export function createStudentSkills(profileId: string, skillIds: string[]) {
  return prisma.studentSkill.createMany({
    data: skillIds.map((skillId) => ({ profileId, skillId })),
    skipDuplicates: true,
  });
}
