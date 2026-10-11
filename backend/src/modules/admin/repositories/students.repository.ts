import { prisma } from '../../../infrastructure/prisma';

export async function countSubmissions(whereClause: any) {
  return prisma.submission.count({ where: whereClause });
}

export async function findSubmissions(whereClause: any, skip: number, take: number, sortBy: string, sortOrder: 'asc' | 'desc') {
  return prisma.submission.findMany({
    where: whereClause,
    skip,
    take,
    orderBy: { [sortBy]: sortOrder },
  });
}

export async function findSubmissionById(id: string) {
  return prisma.submission.findUnique({ where: { id } });
}

export async function findSubmissionByDriveOrRoll(id: string) {
  return prisma.submission.findFirst({
    where: { OR: [{ id }, { rollNo: id }] },
    select: { videoDriveId: true, driveFolderPath: true },
  });
}

export async function findIntroVideoByDriveOrRoll(id: string) {
  return prisma.introVideo.findFirst({
    where: {
      OR: [
        { id },
        { studentId: id },
        { driveFileId: id },
        { student: { rollNo: id } },
      ],
    },
    select: { driveFileId: true },
  });
}

export async function updateSubmission(id: string, data: any) {
  return prisma.submission.update({ where: { id }, data });
}

export async function deleteSubmission(id: string) {
  return prisma.submission.delete({ where: { id } });
}

export async function findSubmissionsForExport(eventId: string) {
  return prisma.submission.findMany({
    where: { eventId },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findIntroVideoByStudentRoll(rollNo: string) {
  return prisma.introVideo.findFirst({
    where: { student: { rollNo } },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function updateIntroVideo(id: string, data: any) {
  return prisma.introVideo.update({ where: { id }, data });
}

export async function updateIntroVideosByStudent(rollNo: string, data: any) {
  return prisma.introVideo.updateMany({
    where: { student: { rollNo } },
    data,
  });
}

export async function updateManyIntroVideos(where: any, data: any) {
  return prisma.introVideo.updateMany({ where, data });
}

export async function findEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}

export async function countStudents(whereClause: any) {
  return prisma.student.count({ where: whereClause });
}

export async function findStudents(whereClause: any, skip: number, take: number, orderBy: any) {
  return prisma.student.findMany({
    where: whereClause,
    skip,
    take,
    orderBy,
  });
}

export async function findStudentsWithProfile(whereClause: any, skip: number, take: number) {
  return prisma.student.findMany({
    where: whereClause,
    skip,
    take,
    orderBy: { rollNo: 'asc' },
    include: { profile: true },
  });
}

export async function findStudentsForRoster(whereClause: any, skip: number, take: number) {
  return prisma.student.findMany({
    where: whereClause,
    orderBy: [{ year: 'asc' }, { section: 'asc' }, { rollNo: 'asc' }],
    skip,
    take,
    select: {
      id: true,
      rollNo: true,
      name: true,
      year: true,
      section: true,
      branch: true,
      status: true,
      graduatedAt: true,
    },
  });
}

export async function findSubmissionsByRollNos(eventId: string | undefined, rollNos: string[]) {
  if (rollNos.length === 0) return [];
  const where: any = { rollNo: { in: rollNos } };
  if (eventId) where.eventId = eventId;
  return prisma.submission.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findIntroVideosByStudentIds(studentIds: string[]) {
  if (studentIds.length === 0) return [];
  return prisma.introVideo.findMany({
    where: { studentId: { in: studentIds } },
    orderBy: { submittedAt: 'desc' },
    select: {
      studentId: true,
      status: true,
      isPublic: true,
    },
  });
}

export async function findAllStudentsForExport() {
  return prisma.student.findMany({
    orderBy: [{ year: 'asc' }, { section: 'asc' }, { rollNo: 'asc' }],
  });
}

export async function findStudentWithFullProfile(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: {
      profile: { include: { skills: { include: { skill: true } } } },
      projects: true,
      achievements: { include: { category: true } },
      certificates: true,
      introVideos: true,
      resumes: true,
      registrations: { include: { event: true, team: true } },
      githubAccount: true,
      githubRepos: {
        orderBy: [
          { isShowcased: 'desc' },
          { showcaseRank: 'asc' },
          { stars: 'desc' },
        ],
      },
      githubSkills: {
        include: { skill: true },
        orderBy: { repoCount: 'desc' },
      },
    },
  });
}

export async function findStudentByIdOrRoll(studentId: string) {
  return prisma.student.findFirst({
    where: { OR: [{ id: studentId }, { rollNo: studentId }] },
  });
}

export async function findIntroVideoById(id: string) {
  return prisma.introVideo.findUnique({ where: { id } });
}

export async function findFallbackIntroVideo(itemId: string, studentId: string, rollNo: string) {
  return prisma.introVideo.findFirst({
    where: {
      OR: [
        { id: itemId, studentId },
        { id: itemId, student: { rollNo } },
        { studentId },
        { student: { rollNo } },
      ],
    },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findSubmissionsByStudentOrItem(rollNo: string, studentId: string, itemId: string) {
  return prisma.submission.findMany({
    where: {
      OR: [
        { rollNo },
        { id: studentId },
        { rollNo: studentId },
        { id: itemId },
      ],
    },
  });
}

export async function findResumeById(id: string) {
  return prisma.resume.findUnique({ where: { id } });
}

export async function updateResume(id: string, data: any) {
  return prisma.resume.update({ where: { id }, data });
}

export async function deleteResume(id: string) {
  return prisma.resume.delete({ where: { id } });
}

export async function findAchievementById(id: string) {
  return prisma.achievement.findUnique({ where: { id } });
}

export async function updateAchievement(id: string, data: any) {
  return prisma.achievement.update({ where: { id }, data });
}

export async function deleteAchievement(id: string) {
  return prisma.achievement.delete({ where: { id } });
}

export async function findCertificateById(id: string) {
  return prisma.certificate.findUnique({ where: { id } });
}

export async function updateCertificate(id: string, data: any) {
  return prisma.certificate.update({ where: { id }, data });
}

export async function deleteCertificate(id: string) {
  return prisma.certificate.delete({ where: { id } });
}

export async function findProjectById(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

export async function updateProject(id: string, data: any) {
  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } });
}

export async function upsertStudentProfileStatus(studentId: string, isPublic: boolean) {
  return prisma.studentProfile.upsert({
    where: { studentId },
    update: { isPublic },
    create: { studentId, isPublic },
  });
}
