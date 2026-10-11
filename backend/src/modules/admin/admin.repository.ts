import { prisma } from '../../infrastructure/prisma';
import type { Prisma } from '@prisma/client';
import { EXCLUDE_INTERNAL_EVENT } from '../../config/constants';

// --- Submissions ---

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

// --- Students ---

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

// --- Voting Campaigns ---

export async function findVotingCampaigns() {
  return prisma.votingCampaign.findMany({
    include: {
      event: true,
      _count: { select: { candidates: true, votes: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createVotingCampaign(data: any) {
  return prisma.votingCampaign.create({ data });
}

export async function findVotingCampaignById(id: string) {
  return prisma.votingCampaign.findUnique({
    where: { id },
    include: {
      event: true,
      candidates: {
        include: {
          _count: { select: { votes: true } },
        },
      },
      _count: { select: { votes: true } },
    },
  });
}

export async function updateVotingCampaign(id: string, data: any) {
  return prisma.votingCampaign.update({ where: { id }, data });
}

export async function deleteVotingCampaign(id: string) {
  return prisma.votingCampaign.delete({ where: { id } });
}

export async function createVotingCandidate(data: any) {
  return prisma.votingCandidate.create({ data });
}

export async function deleteVotingCandidate(id: string) {
  return prisma.votingCandidate.delete({ where: { id } });
}

// --- Settings & Skills ---

export async function findAllPortalSettings() {
  return prisma.portalSettings.findMany();
}

export async function upsertPortalSetting(key: string, value: string, group: string, updatedBy?: string) {
  return prisma.portalSettings.upsert({
    where: { key },
    update: { value, group, ...(updatedBy ? { updatedBy } : {}) },
    create: { key, value, group, ...(updatedBy ? { updatedBy } : {}) },
  });
}

export async function batchUpsertPortalSettings(entries: [string, any][], updatedBy: string) {
  return prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.portalSettings.upsert({
        where: { key },
        update: { value: String(value), updatedBy },
        create: { key, value: String(value), updatedBy },
      })
    )
  );
}

export async function findAllSkills() {
  return prisma.skill.findMany({ orderBy: { name: 'asc' } });
}

export async function createSkill(data: { name: string; category?: string; isActive?: boolean }) {
  return prisma.skill.create({ data: { ...data, category: data.category || 'General', isActive: data.isActive ?? true } });
}

export async function updateSkill(id: string, data: any) {
  return prisma.skill.update({ where: { id }, data });
}

export async function deleteSkill(id: string) {
  return prisma.skill.delete({ where: { id } });
}

export async function upsertSkill(name: string, category: string) {
  return prisma.skill.upsert({
    where: { name },
    update: {},
    create: { name, category, isActive: true },
  });
}

// --- Roles & RBAC ---

export async function findAllRoles() {
  return prisma.role.findMany({
    include: {
      permissions: true,
      assignments: { include: { admin: { select: { id: true, username: true, email: true, role: true } } } },
    },
  });
}

export async function findRoleById(id: string) {
  return prisma.role.findUnique({
    where: { id },
    include: {
      permissions: true,
    },
  });
}

export async function createRole(name: string, description?: string) {
  return prisma.role.create({
    data: {
      name,
      description,
      isSystem: false,
    },
  });
}

export async function updateRole(id: string, description?: string) {
  return prisma.role.update({
    where: { id },
    data: { description },
  });
}

export async function deleteRole(id: string) {
  return prisma.role.delete({ where: { id } });
}

export async function findRolePermissions(roleId: string) {
  return prisma.rolePermission.findMany({
    where: { roleId },
  });
}

export async function findAllAdminUsers() {
  return prisma.adminUser.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function createAdminUser(data: any) {
  return prisma.adminUser.create({ data });
}

export async function updateAdminUser(id: string, data: any) {
  return prisma.adminUser.update({ where: { id }, data });
}

export async function deleteAdminUser(id: string) {
  return prisma.adminUser.delete({ where: { id } });
}

// --- Change Requests & Skill Requests ---

export async function findAllChangeRequests() {
  return prisma.changeRequest.findMany({
    include: { student: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateChangeRequest(id: string, data: any) {
  return prisma.changeRequest.update({ where: { id }, data });
}

export async function findAllSkillRequests() {
  return prisma.skillRequest.findMany({
    include: { student: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateSkillRequest(id: string, data: any) {
  return prisma.skillRequest.update({ where: { id }, data });
}

// --- Announcements ---

export async function findAllAnnouncements() {
  return prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function findAnnouncementById(id: string) {
  return prisma.announcement.findUnique({ where: { id } });
}

export async function createAnnouncement(data: any) {
  return prisma.announcement.create({ data });
}

export async function claimAnnouncementPublish(id: string) {
  return prisma.announcement.updateMany({
    where: { id, status: { not: 'PUBLISHED' } },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
}

// --- Activity Logs ---

export async function findActivityLogs(whereClause: any, skip: number, take: number) {
  return prisma.activityLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

export async function countActivityLogs(whereClause: any) {
  return prisma.activityLog.count({ where: whereClause });
}

export async function findRecentActivityLogs(take: number = 2000) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  });
}

// --- Stats & Storage ---

export async function getAdminStatsCounts(eventId: string) {
  const [
    totalVideos,
    totalRated,
    videoGroups,
    ratingGroups,
    overTimeRows,
  ] = await Promise.all([
    prisma.submission.count({ where: { eventId, videoDriveId: { not: null } } }),
    prisma.submission.count({ where: { eventId, rating: { not: null } } }),
    prisma.submission.groupBy({
      by: ['branch', 'section', 'year'],
      where: { eventId, videoDriveId: { not: null } },
      _count: { _all: true },
    }),
    prisma.submission.groupBy({
      by: ['rating'],
      where: { eventId, rating: { not: null } },
      _count: { _all: true },
    }),
    prisma.submission.findMany({
      where: { eventId, videoDriveId: { not: null } },
      select: { submittedAt: true },
      orderBy: { submittedAt: 'asc' },
    }),
  ]);

  const [
    totalStudents,
    totalProfiles,
    totalProjects,
    totalAchievements,
    totalCertificates,
    totalResumes,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.studentProfile.count(),
    prisma.project.count(),
    prisma.achievement.count(),
    prisma.certificate.count(),
    prisma.resume.count(),
  ]);

  return {
    totalVideos,
    totalRated,
    videoGroups,
    ratingGroups,
    overTimeRows,
    totalStudents,
    totalProfiles,
    totalProjects,
    totalAchievements,
    totalCertificates,
    totalResumes,
  };
}

export async function getStorageInventory() {
  const [
    submissionVideos,
    introVideos,
    resumes,
    certificates,
    achievementProofs,
    profilePhotos,
    cacheCount,
    cacheEntries,
  ] = await Promise.all([
    prisma.submission.count({ where: { videoDriveId: { not: null } } }),
    prisma.introVideo.count({ where: { driveFileId: { not: null } } }),
    prisma.resume.count({ where: { driveFileId: { not: null } } }),
    prisma.certificate.count({ where: { fileDriveId: { not: null } } }),
    prisma.achievement.count({ where: { proofDriveId: { not: null } } }),
    prisma.studentProfile.count({ where: { photoDriveId: { not: null } } }),
    prisma.driveFolderCache.count(),
    prisma.driveFolderCache.findMany({ take: 20 }),
  ]);

  return {
    submissionVideos,
    introVideos,
    resumes,
    certificates,
    achievementProofs,
    profilePhotos,
    cacheCount,
    cacheEntries,
  };
}

export async function clearDriveFolderCache() {
  return prisma.driveFolderCache.deleteMany();
}

export async function getAnalyticsCounts() {
  const [
    totalStudents,
    totalSubmissions,
    totalRated,
    totalProfiles,
    totalProjects,
    totalAchievements,
    totalCertificates,
    totalResumes,
    totalEvents,
    totalRegistrations,
    totalCampaigns,
    totalVotes,
    pendingModerationVideos,
    pendingModerationResumes,
    pendingModerationAchievements,
    pendingModerationCerts,
    byYearSubmissions,
    byRatingGood,
    byRatingAverage,
    byRatingPoor,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.submission.count(),
    prisma.submission.count({ where: { rating: { not: null } } }),
    prisma.studentProfile.count(),
    prisma.project.count(),
    prisma.achievement.count(),
    prisma.certificate.count(),
    prisma.resume.count(),
    prisma.event.count({ where: EXCLUDE_INTERNAL_EVENT }),
    prisma.eventRegistration.count(),
    prisma.votingCampaign.count(),
    prisma.vote.count(),
    prisma.introVideo.count({ where: { status: 'PENDING' } }),
    prisma.resume.count({ where: { status: 'PENDING' } }),
    prisma.achievement.count({ where: { status: 'PENDING' } }),
    prisma.certificate.count({ where: { status: 'PENDING' } }),
    prisma.submission.groupBy({ by: ['year'], _count: { id: true } }),
    prisma.submission.count({ where: { rating: 'GOOD' } }),
    prisma.submission.count({ where: { rating: 'AVERAGE' } }),
    prisma.submission.count({ where: { rating: 'POOR' } }),
  ]);

  return {
    summary: {
      totalStudents,
      totalSubmissions,
      totalRated,
      totalProfiles,
      totalProjects,
      totalAchievements,
      totalCertificates,
      totalResumes,
      totalEvents,
      totalRegistrations,
      totalCampaigns,
      totalVotes,
      pendingModeration:
        pendingModerationVideos +
        pendingModerationResumes +
        pendingModerationAchievements +
        pendingModerationCerts,
    },
    ratings: {
      good: byRatingGood,
      average: byRatingAverage,
      poor: byRatingPoor,
    },
    yearDistribution: byYearSubmissions.map((y) => ({
      year: y.year,
      count: y._count.id,
    })),
    timestamp: new Date().toISOString(),
  };
}
