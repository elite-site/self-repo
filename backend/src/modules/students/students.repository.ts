import { prisma } from '../../infrastructure/prisma';
import { TtlCache } from '../../utils/ttlCache';
import type { Prisma } from '@prisma/client';

export async function findStudentById(id: string, includeProfile: boolean = false) {
  return prisma.student.findUnique({
    where: { id },
    include: includeProfile ? { profile: true } : undefined,
  });
}

export async function upsertStudentProfile(studentId: string, data: Prisma.StudentProfileUpdateInput | Prisma.StudentProfileUncheckedUpdateInput, createData: Prisma.StudentProfileCreateInput | Prisma.StudentProfileUncheckedCreateInput) {
  return prisma.studentProfile.upsert({
    where: { studentId },
    update: data,
    create: createData,
  });
}

// Notifications
export async function countUnreadNotifications(studentId: string) {
  return prisma.notification.count({
    where: { studentId, status: 'UNREAD' },
  });
}

export async function markAllNotificationsAsRead(studentId: string) {
  return prisma.notification.updateMany({
    where: { studentId, status: 'UNREAD' },
    data: { status: 'READ', readAt: new Date() },
  });
}

export async function markNotificationAsRead(id: string, studentId: string) {
  return prisma.notification.updateMany({
    where: { id, studentId },
    data: { status: 'READ', readAt: new Date() },
  });
}

// Videos
export async function findStudentResume(studentId: string) {
  return prisma.resume.findFirst({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
  });
}

// --- Video Operations ---
export async function findStudentRollNoAndName(id: string) {
  return prisma.student.findUnique({
    where: { id },
    select: { rollNo: true, name: true },
  });
}

export async function findSubmissionsForRollNo(rollNo: string) {
  return prisma.submission.findMany({
    where: { rollNo },
    select: { id: true, videoDriveId: true, driveFolderPath: true },
  });
}

export async function findIntroVideosForStudent(studentId: string) {
  return prisma.introVideo.findMany({
    where: { studentId },
    select: { id: true, driveFileId: true },
  });
}

export async function deleteStudentVideoRecordsTransaction(submissionIds: string[], introVideoIds: string[]) {
  return prisma.$transaction([
    prisma.submission.deleteMany({ where: { id: { in: submissionIds } } }),
    prisma.introVideo.deleteMany({ where: { id: { in: introVideoIds } } }),
  ]);
}

export async function findLatestIntroVideo(studentId: string) {
  return prisma.introVideo.findFirst({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function updateIntroVideoVisibility(id: string, isPublic: boolean) {
  return prisma.introVideo.update({
    where: { id },
    data: {
      isPublic,
      publishedAt: isPublic ? new Date() : null,
    },
    select: { id: true, isPublic: true, publishedAt: true, status: true },
  });
}

export async function findStudentForSession(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true },
  });
}

export async function findSupersededIntroVideos(studentId: string, keepId: string) {
  return prisma.introVideo.findMany({
    where: { studentId, id: { not: keepId } },
    select: { id: true, driveFileId: true },
  });
}

export async function deleteSupersededIntroVideos(ids: string[]) {
  return prisma.introVideo.deleteMany({ where: { id: { in: ids } } });
}

export async function findLatestSubmissionByRollNo(rollNo: string) {
  return prisma.submission.findFirst({
    where: { rollNo },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function ensureDefaultEventExists(eventId: string, eventName: string, eventYear: number) {
  const dbEvent = await prisma.event.findUnique({ where: { id: eventId } });
  if (!dbEvent) {
    await prisma.event.create({
      data: {
        id: eventId,
        name: eventName,
        slug: 'self-introduction',
        year: eventYear,
        status: 'OPEN',
      },
    });
  }
}

export async function upsertSubmission(existingId: string | undefined, data: any, createEventId?: string) {
  return existingId
    ? prisma.submission.update({ where: { id: existingId }, data })
    : prisma.submission.create({ data: { eventId: createEventId!, ...data } });
}

export async function upsertIntroVideo(existingId: string | undefined, studentId: string, data: any) {
  return existingId
    ? prisma.introVideo.update({ where: { id: existingId }, data })
    : prisma.introVideo.create({ data: { studentId, ...data } });
}

export async function updateIntroVideoThumbnail(id: string, thumbnail: Buffer) {
  return prisma.introVideo.update({ where: { id }, data: { thumbnail } });
}

export async function findSubmissionStreamData(rollNo: string) {
  return prisma.submission.findFirst({
    where: { rollNo },
    orderBy: { submittedAt: 'desc' },
    select: { videoDriveId: true, driveFolderPath: true },
  });
}

export async function findStudentRollNoOnly(id: string) {
  return prisma.student.findUnique({
    where: { id },
    select: { rollNo: true },
  });
}

export async function findIntroVideoStreamData(studentId: string) {
  return prisma.introVideo.findFirst({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
    select: { driveFileId: true },
  });
}

// --- Profile & Photo Operations ---
export async function findStudentProfileWithDetails(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    include: {
      profile: {
        include: {
          skills: { include: { skill: true } },
        },
      },
      changeRequests: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function findSubmissionReview(rollNo: string) {
  return prisma.submission.findFirst({
    where: { rollNo },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      videoDriveId: true,
      reviewText: true,
      reviewPros: true,
      reviewCons: true,
      reviewedAt: true,
    },
  });
}

export async function findIntroVideoReview(studentId: string) {
  return prisma.introVideo.findFirst({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      status: true,
      reviewNote: true,
      isPublic: true,
      submittedAt: true,
      driveFileId: true,
    },
  });
}

export async function upsertStudentProfileFromInput(studentId: string, updateData: any, createData: any) {
  return prisma.studentProfile.upsert({
    where: { studentId },
    update: updateData,
    create: { studentId, ...createData },
  });
}

export async function findStudentPhotoProfile(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: { rollNo: true, name: true, profile: { select: { id: true, photoDriveId: true } } },
  });
}

export async function upsertStudentPhoto(studentId: string, updateData: any) {
  return prisma.studentProfile.upsert({
    where: { studentId },
    update: updateData,
    create: { studentId, isPublic: true, ...updateData },
  });
}

export async function clearStudentPhoto(studentId: string) {
  return prisma.studentProfile.updateMany({
    where: { studentId },
    data: { photoDriveId: null, photoUrl: null },
  });
}

// --- Skills & Change Requests ---
export async function findActiveSkillsList() {
  return prisma.skill.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
}

export async function findSkillsByNames(names: string[]) {
  return prisma.skill.findMany({ where: { name: { in: names } } });
}

export async function createSkillsBulk(names: string[]) {
  return prisma.skill.createMany({
    data: names.map((name) => ({ name, isActive: true })),
    skipDuplicates: true,
  });
}

export async function updateStudentSkillsInTransaction(profileId: string, resolvedSkillIds: string[]) {
  await prisma.studentSkill.deleteMany({ where: { profileId } });
  if (resolvedSkillIds.length > 0) {
    await prisma.studentSkill.createMany({
      data: resolvedSkillIds.map((skillId) => ({ profileId, skillId })),
      skipDuplicates: true,
    });
  }
  return prisma.studentSkill.findMany({
    where: { profileId },
    include: { skill: true },
  });
}

export async function createSkillRequestRecord(data: { studentId: string; skillName: string; reason?: string; category: string }) {
  return prisma.skillRequest.create({ data });
}

export async function createAcademicChangeRequestRecord(data: { studentId: string; fieldName: string; currentValue: string; requestedValue: string; reason?: string }) {
  return prisma.changeRequest.create({ data });
}

export async function findStudentAcademicAndSkillChangeRequests(studentId: string) {
  const [academic, skills] = await Promise.all([
    prisma.changeRequest.findMany({ where: { studentId } }),
    prisma.skillRequest.findMany({ where: { studentId } }),
  ]);
  return { changeRequests: academic, skillRequests: skills };
}

// --- Dashboard & Me Operations ---
export async function findStudentLearningStats(studentId: string) {
  const [activeCount, completedCount] = await Promise.all([
    prisma.enrollment.count({
      where: { studentId, status: 'ACTIVE' },
    }),
    prisma.enrollment.count({
      where: { studentId, status: 'COMPLETED' },
    }),
  ]);
  return {
    activeCount,
    completedCount,
    totalCount: activeCount + completedCount,
  };
}

export async function findStudentGithubStats(studentId: string) {
  const repos = await prisma.githubRepo.findMany({
    where: { studentId, removedFromGithub: false },
    select: {
      lastCommitAt: true,
      pushedAt: true,
      commitCount: true,
    },
    orderBy: { pushedAt: 'desc' },
    take: 10,
  });

  const totalCommits = repos.reduce((sum, r) => sum + (r.commitCount || 0), 0);
  const latestActivity = repos[0]?.lastCommitAt || repos[0]?.pushedAt || null;

  let streakDays = 0;
  if (latestActivity) {
    const diffMs = Date.now() - new Date(latestActivity).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) {
      streakDays = Math.min(Math.max(1, Math.ceil(totalCommits / 2)), 30);
    }
  }

  return {
    totalCommits,
    streakDays,
    lastCommitAt: latestActivity ? latestActivity.toISOString() : null,
  };
}

export async function findStudentDashboardDetails(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      rollNo: true,
      name: true,
      year: true,
      githubReminderSnoozedUntil: true,
      githubAccount: { select: { id: true } },
      introVideos: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          reviewNote: true,
          isPublic: true,
          submittedAt: true,
          driveFileId: true,
        },
      },
      resumes: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          driveFileId: true,
        },
      },
      _count: {
        select: {
          projects: true,
          achievements: true,
          certificates: true,
        },
      },
      profile: {
        select: {
          id: true,
          biography: true,
          photoDriveId: true,
          photoUrl: true,
          skills: {
            take: 30,
            select: {
              skill: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

const dashboardEventsCache = new TtlCache<any[]>(30_000, 5);
const votingCampaignsCache = new TtlCache<any[]>(30_000, 5);

export async function findOpenEventsForDashboard(excludeInternalClause: any) {
  const fetcher = () =>
    prisma.event.findMany({
      where: { status: 'OPEN', ...excludeInternalClause },
      orderBy: [{ eventDate: 'asc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        name: true,
        type: true,
        eventDate: true,
        createdAt: true,
        year: true,
      },
    });

  if (process.env.NODE_ENV === 'test') return fetcher();
  return dashboardEventsCache.wrap('open_events', fetcher);
}

export async function findStudentRegistrations(studentId: string) {
  return prisma.eventRegistration.findMany({
    where: {
      studentId,
      status: { notIn: ['CANCELLED', 'REJECTED'] },
      event: { status: { notIn: ['CLOSED', 'ARCHIVED'] } },
    },
    select: { id: true, eventId: true, status: true },
  });
}

export async function findActiveVotingCampaigns() {
  const fetcher = () =>
    prisma.votingCampaign.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, description: true },
    });

  if (process.env.NODE_ENV === 'test') return fetcher();
  return votingCampaignsCache.wrap('active_campaigns', fetcher);
}

export async function findDashboardNotifications(studentId: string) {
  return prisma.notification.findMany({
    where: { studentId, status: 'UNREAD' },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true,
      title: true,
      message: true,
      status: true,
      type: true,
      actionUrl: true,
      createdAt: true,
    },
  });
}

export async function findStudentForMe(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    include: {
      profile: {
        select: {
          id: true,
          photoDriveId: true,
          photoUrl: true,
          photoOffsetX: true,
          photoOffsetY: true,
          photoZoom: true,
          biography: true,
        },
      },
    },
  });
}

export async function findIntroVideoForMe(studentId: string) {
  return prisma.introVideo.findFirst({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      status: true,
      reviewNote: true,
      isPublic: true,
      publishedAt: true,
      changeRequestedAt: true,
      changeRequestNote: true,
      submittedAt: true,
      filename: true,
      mimeType: true,
      sizeMb: true,
      driveFileId: true,
    },
  });
}

// --- Notifications ---
export async function findNotificationsPaginated(studentId: string, limit: number, offset: number) {
  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where: { studentId } }),
    prisma.notification.count({ where: { studentId, status: 'UNREAD' } }),
  ]);
  return { items, total, unreadCount };
}

export async function findPublishedAnnouncement(id: string) {
  return prisma.announcement.findFirst({
    where: { id, status: 'PUBLISHED' },
  });
}

export async function findStudentYearAndSection(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: { year: true, section: true },
  });
}

// --- Team Invitations ---
export async function findTeamById(id: string) {
  return prisma.team.findUnique({ where: { id } });
}

export async function findStudentByRollNoOnly(rollNo: string) {
  return prisma.student.findUnique({ where: { rollNo } });
}

export async function findTeamInvitation(teamId: string, studentId: string) {
  return prisma.teamInvitation.findUnique({
    where: { teamId_studentId: { teamId, studentId } },
  });
}

export async function upsertTeamInvitationRecord(teamId: string, studentId: string) {
  return prisma.teamInvitation.upsert({
    where: { teamId_studentId: { teamId, studentId } },
    update: { status: 'PENDING', declineNote: null, respondedAt: null, invitedAt: new Date() },
    create: { teamId, studentId, status: 'PENDING' },
  });
}

export async function findStudentPendingInvitations(studentId: string) {
  return prisma.teamInvitation.findMany({
    where: { studentId, status: 'PENDING' },
    include: { team: true },
  });
}

export async function findStudentStatus(studentId: string) {
  return prisma.student.findUnique({ where: { id: studentId }, select: { status: true } });
}

export async function findTeamInvitationById(id: string, studentId: string) {
  return prisma.teamInvitation.findFirst({ where: { id, studentId } });
}

export async function acceptTeamInvitationTransaction(inviteId: string, teamId: string, studentId: string) {
  return prisma.$transaction([
    prisma.teamInvitation.update({
      where: { id: inviteId },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    }),
    prisma.teamMember.upsert({
      where: { teamId_studentId: { teamId, studentId } },
      update: {},
      create: { teamId, studentId },
    }),
  ]);
}

export async function declineTeamInvitationRecord(inviteId: string, studentId: string) {
  return prisma.teamInvitation.updateMany({
    where: { id: inviteId, studentId },
    data: { status: 'DECLINED' },
  });
}

// --- Resume Operations ---
export async function findStudentResumes(studentId: string) {
  return prisma.resume.findMany({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      studentId: true,
      driveFileId: true,
      filename: true,
      sizeMb: true,
      status: true,
      reviewNote: true,
      reviewedBy: true,
      reviewedAt: true,
      isActive: true,
      isPublic: true,
      submittedAt: true,
      updatedAt: true,
    },
  });
}

export async function upsertResume(existingId: string | undefined, studentId: string, data: any) {
  return existingId
    ? prisma.resume.update({ where: { id: existingId }, data })
    : prisma.resume.create({ data: { studentId, ...data } });
}

export async function deleteResume(id: string) {
  return prisma.resume.delete({ where: { id } });
}

// --- Registration Operations ---
export async function findStudentEventRegistrations(studentId: string, internalEventId: string) {
  return prisma.eventRegistration.findMany({
    where: {
      studentId,
      eventId: { not: internalEventId },
      status: { notIn: ['CANCELLED', 'REJECTED'] },
      event: { status: { notIn: ['CLOSED', 'ARCHIVED'] } },
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          type: true,
          eventDate: true,
          registrationEnd: true,
          status: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: { registeredAt: 'desc' },
  });
}

export async function findRegistrationById(id: string) {
  return prisma.eventRegistration.findUnique({
    where: { id },
    include: {
      event: true,
      student: true,
      team: true,
      answers: { include: { field: true } },
    },
  });
}

export async function findRegistrationForCancel(id: string, studentId: string) {
  return prisma.eventRegistration.findFirst({
    where: { id, studentId },
    include: { event: true, student: true },
  });
}

export async function updateRegistrationStatus(id: string, status: any) {
  return prisma.eventRegistration.update({
    where: { id },
    data: { status },
  });
}

// --- Notification Dispatch Operations ---
export async function createNotification(data: any) {
  return prisma.notification.create({ data });
}

export async function findStudentsForEventNotification(where: any) {
  return prisma.student.findMany({
    where,
    select: { id: true },
  });
}

export async function createManyNotifications(data: any[]) {
  return prisma.notification.createMany({ data, skipDuplicates: true });
}

// --- Teams Operations ---
export async function findTeamsForStudent(studentId: string, internalEventId: string) {
  return prisma.team.findMany({
    where: {
      eventId: { not: internalEventId },
      OR: [{ leaderId: studentId }, { members: { some: { studentId } } }],
    },
    include: { members: { include: { student: true } }, event: true },
  });
}

export async function findActiveEventForTeam(internalEventId: string) {
  return prisma.event.findFirst({
    where: {
      status: 'OPEN',
      id: { not: internalEventId },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}

export async function createTeamWithMember(data: { name: string; eventId: string; leaderId: string }) {
  return prisma.team.create({
    data: {
      name: data.name,
      eventId: data.eventId,
      leaderId: data.leaderId,
      members: {
        create: { studentId: data.leaderId },
      },
    },
    include: {
      event: true,
      members: { include: { student: true } },
    },
  });
}

export async function findTeamWithMembers(id: string) {
  return prisma.team.findUnique({
    where: { id },
    include: { members: { select: { studentId: true } } },
  });
}

export async function deleteTeamTransaction(teamId: string) {
  return prisma.$transaction([
    prisma.eventRegistration.updateMany({
      where: { teamId },
      data: { teamId: null },
    }),
    prisma.teamInvitation.deleteMany({ where: { teamId } }),
    prisma.teamMember.deleteMany({ where: { teamId } }),
    prisma.team.delete({ where: { id: teamId } }),
  ]);
}


