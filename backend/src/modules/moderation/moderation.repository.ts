import { prisma } from '../../infrastructure/prisma';

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

export async function findAchievementsQueue() {
  return prisma.achievement.findMany({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    include: { student: true, category: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function findCertificatesQueue() {
  return prisma.certificate.findMany({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    include: { student: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function findVideoById(id: string) {
  return prisma.introVideo.findUnique({
    where: { id },
    include: { student: { select: { id: true, name: true, rollNo: true } } },
  });
}

export async function updateVideo(id: string, data: any) {
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

export async function updateResume(id: string, data: any) {
  return prisma.resume.update({
    where: { id },
    data,
  });
}

export async function updateAchievement(id: string, data: any) {
  return prisma.achievement.update({
    where: { id },
    data,
  });
}

export async function updateCertificate(id: string, data: any) {
  return prisma.certificate.update({
    where: { id },
    data,
  });
}

// Portal pending items
export async function findPortalPendingVideos() {
  return prisma.introVideo.findMany({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    include: { student: true },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findPortalPendingResumes() {
  return prisma.resume.findMany({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    include: { student: true },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findPortalPendingAchievements() {
  return prisma.achievement.findMany({
    where: { status: 'PENDING' },
    include: { student: true, category: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findPortalPendingCertificates() {
  return prisma.certificate.findMany({
    where: { status: 'PENDING' },
    include: { student: true },
    orderBy: { createdAt: 'desc' },
  });
}
