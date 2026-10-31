import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import type { PortfolioModel } from './portfolio.types';

// Projections carried over unchanged from the services that used to own these
// queries. They intentionally omit heavy columns (thumbnail Bytes) and fields
// the caller never read (DB-1, API-5).
const showcasedRepoSelect = {
  id: true, studentId: true, githubRepoId: true, fullName: true, name: true,
  description: true, htmlUrl: true, isFork: true, primaryLanguage: true,
  topics: true, stars: true, githubCreatedAt: true, pushedAt: true,
  languages: true, commitCount: true, isShowcased: true, showcaseRank: true,
} satisfies Prisma.GithubRepoSelect;

const certificateSelect = {
  id: true, studentId: true, title: true, issuer: true, issuedAt: true,
  fileDriveId: true, status: true, reviewNote: true, reviewedBy: true,
  reviewedAt: true, isPublic: true, createdAt: true, updatedAt: true,
} satisfies Prisma.CertificateSelect;

const achievementSelect = {
  id: true, studentId: true, categoryId: true, title: true,
  description: true, organization: true, achievedAt: true,
  proofDriveId: true, proofUrl: true, status: true, reviewNote: true,
  reviewedBy: true, reviewedAt: true, isPublic: true,
  createdAt: true, updatedAt: true, category: true,
} satisfies Prisma.AchievementSelect;

// GitHub portfolio
export async function findGithubAccountByStudent(studentId: string) {
  return prisma.githubAccount.findUnique({ where: { studentId } });
}

export async function findShowcasedRepos(studentId: string) {
  return prisma.githubRepo.findMany({
    where: { studentId, isShowcased: true, removedFromGithub: false },
    orderBy: { showcaseRank: 'asc' },
    select: showcasedRepoSelect,
  });
}

export async function findGithubStudentSkills(studentId: string) {
  return prisma.githubStudentSkill.findMany({
    where: { studentId },
    include: { skill: true },
    orderBy: [{ repoCount: 'desc' }, { totalBytes: 'desc' }],
  });
}

export async function findShowcaseCandidateRepos(studentId: string) {
  return prisma.githubRepo.findMany({
    where: { studentId, removedFromGithub: false },
    orderBy: [{ stars: 'desc' }, { pushedAt: 'desc' }],
    take: 30,
  });
}

export async function promoteReposToShowcase(orderedRepoIds: string[]) {
  return prisma.$transaction(
    orderedRepoIds.map((id, index) =>
      prisma.githubRepo.update({
        where: { id },
        data: { isShowcased: true, showcaseRank: index + 1 },
      })
    )
  );
}

// Student portfolio shell (used when GitHub is not connected)
export async function findProjectsByStudent(studentId: string) {
  return prisma.project.findMany({
    where: { studentId },
    orderBy: { displayOrder: 'asc' },
    take: 100,
  });
}

export async function findStudentProfileWithSkills(studentId: string) {
  return prisma.studentProfile.findUnique({
    where: { studentId },
    include: { skills: { include: { skill: true } } },
  });
}

export async function findStudentIdentity(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: { rollNo: true, name: true, year: true, section: true },
  });
}

// Projects
export async function countProjectsByStudent(studentId: string) {
  return prisma.project.count({ where: { studentId } });
}

export async function findHighestDisplayOrderProject(studentId: string) {
  return prisma.project.findFirst({
    where: { studentId },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });
}

export async function createProjectRecord(data: Prisma.ProjectUncheckedCreateInput) {
  return prisma.project.create({ data });
}

export async function reorderStudentProjects(studentId: string, orderedIds: string[]) {
  return prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.project.updateMany({
        where: { id, studentId },
        data: { displayOrder: index },
      })
    )
  );
}

export async function updateStudentProject(
  studentId: string,
  id: string,
  data: Prisma.ProjectUpdateManyMutationInput
) {
  return prisma.project.updateMany({ where: { id, studentId }, data });
}

export async function deleteStudentProject(studentId: string, id: string) {
  return prisma.project.deleteMany({ where: { id, studentId } });
}

// Achievements
export async function findAchievementsByStudent(studentId: string) {
  return prisma.achievement.findMany({
    where: { studentId },
    orderBy: { achievedAt: 'desc' },
    take: 100,
    select: achievementSelect,
  });
}

export async function createAchievementRecord(data: Prisma.AchievementUncheckedCreateInput) {
  return prisma.achievement.create({ data });
}

export async function updateStudentAchievement(
  studentId: string,
  id: string,
  data: Prisma.AchievementUpdateManyMutationInput
) {
  return prisma.achievement.updateMany({ where: { id, studentId }, data });
}

export async function findAchievementForDeletion(studentId: string, id: string) {
  return prisma.achievement.findFirst({
    where: { id, studentId },
    include: { student: { select: { rollNo: true } } },
  });
}

export async function deleteAchievementRecord(id: string) {
  return prisma.achievement.delete({ where: { id } });
}

// Certificates
export async function findCertificatesByStudent(studentId: string) {
  return prisma.certificate.findMany({
    where: { studentId },
    orderBy: { issuedAt: 'desc' },
    take: 100,
    select: certificateSelect,
  });
}

export async function createCertificateRecord(data: Prisma.CertificateUncheckedCreateInput) {
  return prisma.certificate.create({ data });
}

export async function findCertificateByStudent(studentId: string, id: string) {
  return prisma.certificate.findFirst({ where: { id, studentId } });
}

export async function updateCertificateVisibility(id: string, isPublic: boolean) {
  return prisma.certificate.update({
    where: { id },
    data: { isPublic },
    select: { id: true, isPublic: true, status: true },
  });
}

export async function findCertificateForDeletion(studentId: string, id: string) {
  return prisma.certificate.findFirst({
    where: { id, studentId },
    include: { student: { select: { rollNo: true } } },
  });
}

export async function deleteCertificateRecord(id: string) {
  return prisma.certificate.delete({ where: { id } });
}

// Universal visibility toggle across the three portfolio models
export async function findPortfolioItem(model: PortfolioModel, id: string, studentId: string) {
  const where = { id, studentId };
  switch (model) {
    case 'achievement':
      return prisma.achievement.findFirst({ where });
    case 'project':
      return prisma.project.findFirst({ where });
    case 'certificate':
      return prisma.certificate.findFirst({ where });
  }
}

export async function updatePortfolioItemVisibility(
  model: PortfolioModel,
  id: string,
  isPublic: boolean
) {
  const args = {
    where: { id },
    data: { isPublic },
    select: { id: true, isPublic: true, status: true } as const,
  };
  switch (model) {
    case 'achievement':
      return prisma.achievement.update(args);
    case 'project':
      return prisma.project.update(args);
    case 'certificate':
      return prisma.certificate.update(args);
  }
}
