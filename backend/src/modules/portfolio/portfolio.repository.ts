import { prisma } from '../../infrastructure/prisma';
import type { Prisma } from '@prisma/client';

export async function findProjectsByStudent(studentId: string) {
  return prisma.project.findMany({
    where: { studentId },
    orderBy: { displayOrder: 'asc' },
  });
}

export async function findProjectById(id: string, studentId?: string) {
  return prisma.project.findFirst({
    where: studentId ? { id, studentId } : { id },
  });
}

export async function createProjectRecord(data: Prisma.ProjectUncheckedCreateInput) {
  return prisma.project.create({ data });
}

export async function updateProjectRecord(id: string, data: Prisma.ProjectUpdateInput) {
  return prisma.project.update({
    where: { id },
    data,
  });
}

export async function deleteProjectRecord(id: string) {
  return prisma.project.delete({ where: { id } });
}

export async function reorderProjectsTransaction(studentId: string, ids: string[]) {
  return prisma.$transaction(
    ids.map((id, index) =>
      prisma.project.updateMany({
        where: { id, studentId },
        data: { displayOrder: index },
      })
    )
  );
}

// Achievements
export async function findAchievementsByStudent(studentId: string) {
  return prisma.achievement.findMany({
    where: { studentId },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findAchievementById(id: string, studentId?: string) {
  return prisma.achievement.findFirst({
    where: studentId ? { id, studentId } : { id },
    include: { category: true },
  });
}

export async function createAchievementRecord(data: Prisma.AchievementUncheckedCreateInput) {
  return prisma.achievement.create({ data });
}

export async function updateAchievementRecord(id: string, data: Prisma.AchievementUpdateInput) {
  return prisma.achievement.update({
    where: { id },
    data,
  });
}

export async function deleteAchievementRecord(id: string) {
  return prisma.achievement.delete({ where: { id } });
}

// Certificates
export async function findCertificatesByStudent(studentId: string) {
  return prisma.certificate.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findCertificateById(id: string, studentId?: string) {
  return prisma.certificate.findFirst({
    where: studentId ? { id, studentId } : { id },
  });
}

export async function createCertificateRecord(data: Prisma.CertificateUncheckedCreateInput) {
  return prisma.certificate.create({ data });
}

export async function updateCertificateRecord(id: string, data: Prisma.CertificateUpdateInput) {
  return prisma.certificate.update({
    where: { id },
    data,
  });
}

export async function deleteCertificateRecord(id: string) {
  return prisma.certificate.delete({ where: { id } });
}

// Unified Portfolio
export async function findPortfolioGithubAccount(studentId: string) {
  return prisma.githubAccount.findUnique({ where: { studentId } });
}

export async function findPortfolioShowcasedRepos(studentId: string, select: any) {
  return prisma.githubRepo.findMany({
    where: { studentId, isShowcased: true, removedFromGithub: false },
    orderBy: { showcaseRank: 'asc' },
    select,
  });
}

export async function findPortfolioSkills(studentId: string) {
  return prisma.githubStudentSkill.findMany({
    where: { studentId },
    include: { skill: true },
    orderBy: [{ repoCount: 'desc' }, { totalBytes: 'desc' }],
  });
}

export async function findPortfolioLegacyProjects(studentId: string) {
  return prisma.project.findMany({
    where: { studentId },
    orderBy: { displayOrder: 'asc' },
    take: 100,
  });
}

export async function findPortfolioStudentProfile(studentId: string) {
  return prisma.studentProfile.findUnique({
    where: { studentId },
    include: { skills: { include: { skill: true } } },
  });
}

export async function updatePortfolioItemVisibility(model: string, id: string, isPublic: boolean) {
  const delegate = (prisma as any)[model];
  return delegate.update({
    where: { id },
    data: { isPublic },
    select: { id: true, isPublic: true, status: true },
  });
}

export async function findPortfolioItemByModel(model: string, id: string, studentId: string) {
  const delegate = (prisma as any)[model];
  return delegate.findFirst({ where: { id, studentId } });
}
