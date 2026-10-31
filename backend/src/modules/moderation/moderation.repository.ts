import { prisma } from '../../infrastructure/prisma';
import type { ModerationUpdate } from './moderation.types';

const studentSelect = {
  name: true,
  rollNo: true,
  year: true,
  section: true,
  branch: true,
};

export async function findVideos(whereClause: any, take: number = 200) {
  return prisma.introVideo.findMany({
    where: whereClause,
    select: {
      id: true,
      studentId: true,
      driveFileId: true,
      status: true,
      submittedAt: true,
      isPublic: true,
      reviewNote: true,
      student: { select: studentSelect },
    },
    take,
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findResumes(whereClause: any, take: number = 200) {
  return prisma.resume.findMany({
    where: whereClause,
    select: {
      id: true,
      studentId: true,
      driveFileId: true,
      filename: true,
      status: true,
      submittedAt: true,
      isPublic: true,
      reviewNote: true,
      student: { select: studentSelect },
    },
    take,
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findAchievements(whereClause: any, take: number = 200) {
  return prisma.achievement.findMany({
    where: whereClause,
    include: {
      student: { select: studentSelect },
      category: true,
    },
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findCertificates(whereClause: any, take: number = 200) {
  return prisma.certificate.findMany({
    where: whereClause,
    select: {
      id: true,
      studentId: true,
      title: true,
      issuer: true,
      fileDriveId: true,
      status: true,
      createdAt: true,
      isPublic: true,
      reviewNote: true,
      student: { select: studentSelect },
    },
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findProjects(whereClause: any, take: number = 200) {
  return prisma.project.findMany({
    where: whereClause,
    include: {
      student: { select: studentSelect },
    },
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findVideosQueue(take: number = 200) {
  return prisma.introVideo.findMany({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] } },
    select: {
      id: true,
      studentId: true,
      driveFileId: true,
      status: true,
      submittedAt: true,
      isPublic: true,
      reviewNote: true,
      student: {
        select: studentSelect,
      },
    },
    take,
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findResumesQueue(take: number = 200) {
  return prisma.resume.findMany({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    select: {
      id: true,
      studentId: true,
      driveFileId: true,
      filename: true,
      status: true,
      submittedAt: true,
      student: {
        select: studentSelect,
      },
    },
    take,
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findAchievementsQueue(take: number = 200) {
  return prisma.achievement.findMany({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    include: {
      student: { select: studentSelect },
      category: true,
    },
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findCertificatesQueue(take: number = 200) {
  return prisma.certificate.findMany({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    include: {
      student: { select: studentSelect },
    },
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findVideoById(id: string) {
  return prisma.introVideo.findUnique({
    where: { id },
    include: { student: { select: { id: true, name: true, rollNo: true } } },
  });
}

export async function findResumeById(id: string) {
  return prisma.resume.findUnique({
    where: { id },
    select: { id: true, status: true, isPublic: true, driveFileId: true },
  });
}

export async function findAchievementById(id: string) {
  return prisma.achievement.findUnique({
    where: { id },
    select: { id: true, status: true, isPublic: true, proofDriveId: true },
  });
}

export async function findCertificateById(id: string) {
  return prisma.certificate.findUnique({
    where: { id },
    select: { id: true, status: true, isPublic: true, fileDriveId: true },
  });
}

export async function findProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    select: { id: true, status: true, isPublic: true },
  });
}

export async function updateVideo(id: string, data: ModerationUpdate) {
  return prisma.introVideo.update({
    where: { id },
    data,
  });
}

export async function updateSubmissionStatusByRollNo(rollNo: string, status: any) {
  return prisma.submission.updateMany({
    where: { rollNo },
    data: { status },
  }).catch(() => {});
}

export async function updateResume(id: string, data: ModerationUpdate) {
  return prisma.resume.update({
    where: { id },
    data,
  });
}

export async function updateAchievement(id: string, data: ModerationUpdate) {
  return prisma.achievement.update({
    where: { id },
    data,
  });
}

export async function updateCertificate(id: string, data: ModerationUpdate) {
  return prisma.certificate.update({
    where: { id },
    data,
  });
}

export async function updateProject(id: string, data: ModerationUpdate) {
  return prisma.project.update({
    where: { id },
    data,
  });
}

export async function deleteVideo(id: string) {
  return prisma.introVideo.delete({ where: { id }, select: { id: true } });
}

export async function deleteResume(id: string) {
  return prisma.resume.delete({ where: { id }, select: { id: true } });
}

export async function deleteAchievement(id: string) {
  return prisma.achievement.delete({ where: { id }, select: { id: true } });
}

export async function deleteCertificate(id: string) {
  return prisma.certificate.delete({ where: { id }, select: { id: true } });
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id }, select: { id: true } });
}
