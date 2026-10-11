import * as repo from '../students.repository';
import { EXCLUDE_INTERNAL_EVENT } from '../../../config/constants';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

export async function getStudentDashboardData(studentId: string, rollNo?: string) {
  try {
    const [
      student,
      submission,
      introVideo,
      portfolioCounts,
      resume,
      events,
      registrations,
      votingCampaigns,
      notifications,
      unreadNotificationsCount,
    ] = await Promise.all([
      repo.findStudentDashboardDetails(studentId),
      rollNo
        ? repo.findSubmissionReview(rollNo)
        : Promise.resolve(null),
      repo.findIntroVideoReview(studentId),
      repo.countStudentPortfolioItems(studentId),
      repo.findStudentResume(studentId),
      repo.findOpenEventsForDashboard(EXCLUDE_INTERNAL_EVENT),
      repo.findStudentRegistrations(studentId),
      repo.findActiveVotingCampaigns(),
      repo.findDashboardNotifications(studentId),
      repo.countUnreadNotifications(studentId),
    ]);

    if (!student) {
      throw new AppError('NOT_FOUND', 'Student not found', 404, 'dashboard.service:getStudentDashboardData');
    }

    const photoUrl = (student.profile?.photoDriveId || student.profile?.photoUrl)
      ? `/api/public/media/photo/${student.profile?.id || student.id}`
      : null;

    let effectiveSubmission = submission;
    if (!effectiveSubmission && student.rollNo) {
      effectiveSubmission = await repo.findSubmissionReview(student.rollNo);
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
        projects: portfolioCounts.projects,
        achievements: portfolioCounts.achievements,
        certificates: portfolioCounts.certificates,
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
    logger.error(`[dashboard.service:getStudentDashboardData] studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500, 'dashboard.service:getStudentDashboardData');
  }
}
