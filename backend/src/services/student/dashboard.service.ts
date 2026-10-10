import { prisma } from '../../lib/prisma';
import { EXCLUDE_INTERNAL_EVENT } from '../../config/constants';
import { AppError } from '../../utils/appError';

export async function getStudentDashboardData(studentId: string, rollNo?: string) {
  try {
    const [
      student,
      submission,
      introVideo,
      projectCount,
      achievementCount,
      certificateCount,
      resume,
      events,
      registrations,
      votingCampaigns,
      notifications,
      unreadNotificationsCount,
    ] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          rollNo: true,
          name: true,
          year: true,
          githubReminderSnoozedUntil: true,
          githubAccount: { select: { id: true } },
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
      }),
      rollNo
        ? prisma.submission.findFirst({
            where: { rollNo },
            orderBy: { submittedAt: 'desc' },
            select: { submittedAt: true, status: true },
          })
        : Promise.resolve(null),
      prisma.introVideo.findFirst({
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        select: { status: true, submittedAt: true },
      }),
      prisma.project.count({ where: { studentId } }),
      prisma.achievement.count({ where: { studentId } }),
      prisma.certificate.count({ where: { studentId } }),
      prisma.resume.findFirst({
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        select: { id: true, status: true, driveFileId: true },
      }),
      prisma.event.findMany({
        where: { status: 'OPEN', ...EXCLUDE_INTERNAL_EVENT },
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
      }),
      prisma.eventRegistration.findMany({
        where: {
          studentId,
          status: { notIn: ['CANCELLED', 'REJECTED'] },
          event: { status: { notIn: ['CLOSED', 'ARCHIVED'] } },
        },
        select: { id: true, eventId: true, status: true },
      }),
      prisma.votingCampaign.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, description: true },
      }),
      prisma.notification.findMany({
        where: { studentId },
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
      }),
      prisma.notification.count({
        where: { studentId, status: 'UNREAD' },
      }),
    ]);

    if (!student) {
      throw new AppError('NOT_FOUND', 'Student not found', 404, 'dashboard.service:getStudentDashboardData');
    }

    const photoUrl = (student.profile?.photoDriveId || student.profile?.photoUrl)
      ? `/api/public/media/photo/${student.profile?.id || student.id}`
      : null;

    let effectiveSubmission = submission;
    if (!effectiveSubmission && student.rollNo) {
      effectiveSubmission = await prisma.submission.findFirst({
        where: { rollNo: student.rollNo },
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true, status: true },
      });
    }

    const video = introVideo
      ? { status: introVideo.status }
      : effectiveSubmission
      ? { status: effectiveSubmission.status }
      : null;

    const profile = {
      name: student.name,
      year: student.year,
      rollNo: student.rollNo,
      photoUrl,
      bio: student.profile?.biography || null,
      biography: student.profile?.biography || null,
      skills: (student.profile?.skills || []).map((s: any) => s.skill.name),
      video,
      submission: effectiveSubmission?.submittedAt
        ? { submittedAt: effectiveSubmission.submittedAt }
        : introVideo?.submittedAt
        ? { submittedAt: introVideo.submittedAt }
        : null,
    };

    return {
      profile,
      counts: {
        projects: projectCount,
        achievements: achievementCount,
        certificates: certificateCount,
      },
      resume: {
        exists: Boolean(resume?.id || resume?.driveFileId),
        status: resume?.status || null,
        driveFileId: resume?.driveFileId || null,
      },
      events: events.map((e) => ({
        id: e.id,
        title: e.name,
        type: e.type,
        date: (e.eventDate || e.createdAt).toISOString(),
        eligibility: `Year ${e.year || 'All'}`,
      })),
      registrations,
      votingCampaigns,
      notifications: notifications.map((n) => ({
        ...n,
        isRead: n.status === 'READ',
      })),
      unreadNotificationsCount,
      github: {
        connected: Boolean(student.githubAccount),
        reminderSnoozedUntil: student.githubReminderSnoozedUntil,
      },
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[dashboard.service:getStudentDashboardData] studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500, 'dashboard.service:getStudentDashboardData');
  }
}
