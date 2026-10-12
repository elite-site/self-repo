import { prisma } from '../../../infrastructure/prisma';
import { EXCLUDE_INTERNAL_EVENT } from '../../../config/constants';

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
    totalEvents,
    totalRegistrations,
    totalCampaigns,
    totalVotes,
    pendingProjects,
    pendingAchievements,
    pendingCertificates,
    pendingResumes,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.studentProfile.count(),
    prisma.project.count(),
    prisma.achievement.count(),
    prisma.certificate.count(),
    prisma.resume.count(),
    prisma.event.count({ where: EXCLUDE_INTERNAL_EVENT }),
    prisma.eventRegistration.count(),
    prisma.votingCampaign.count(),
    prisma.vote.count(),
    prisma.project.count({ where: { status: 'PENDING' } }),
    prisma.achievement.count({ where: { status: 'PENDING' } }),
    prisma.certificate.count({ where: { status: 'PENDING' } }),
    prisma.resume.count({ where: { status: 'PENDING' } }),
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
    totalEvents,
    totalRegistrations,
    totalCampaigns,
    totalVotes,
    pendingProjects,
    pendingAchievements,
    pendingCertificates,
    pendingResumes,
  };
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
