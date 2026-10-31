import { TtlCache } from '../../../utils/ttlCache';
import * as adminRepo from '../admin.repository';

const adminStatsCache = new TtlCache<any>(15_000, 10);

export async function getAdminStats(eventId: string) {
  const cached = adminStatsCache.get(eventId);
  if (cached) return { data: cached, cached: true };

  const counts = await adminRepo.getAdminStatsCounts(eventId);

  const formatYearLabel = (y: number | string): string => {
    const num = parseInt(String(y), 10);
    if (isNaN(num)) return String(y);
    if (num === 2) return '2nd Year';
    if (num === 3) return '3rd Year';
    if (num === 4) return '4th Year';
    return `${num}th Year`;
  };

  const bySection = (counts.videoGroups || [])
    .map((g: any) => ({
      label: `${formatYearLabel(g.year)} · ${(g.branch || 'IT').trim()}-${(g.section || '').trim()}`,
      year: g.year,
      branch: g.branch,
      section: g.section,
      submitted: g._count?._all || 0,
    }))
    .sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year;
      if ((a.branch || '') !== (b.branch || '')) return (a.branch || '').localeCompare(b.branch || '');
      return (a.section || '').localeCompare(b.section || '');
    });

  const byYear: Record<string, number> = {};
  (counts.videoGroups || []).forEach((g: any) => {
    const key = `Year ${g.year}`;
    byYear[key] = (byYear[key] || 0) + (g._count?._all || 0);
  });

  const byStatus: Record<string, number> = {};
  (['SUBMITTED', 'UNDER_REVIEW', 'REJECTED'] as const).forEach((s) => {
    byStatus[s] = 0;
  });

  const byRating: Record<string, number> = {};
  (counts.ratingGroups || []).forEach((g: any) => {
    if (g.rating) byRating[g.rating] = g._count?._all || 0;
  });

  const dateCounts: Record<string, number> = {};
  (counts.overTimeRows || []).forEach((s: any) => {
    if (s.submittedAt) {
      const dateKey = s.submittedAt.toISOString().split('T')[0];
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    }
  });
  const overTime = Object.entries(dateCounts).map(([date, count]) => ({ date, count }));

  const portal = {
    totalStudents: counts.totalStudents,
    totalProfiles: counts.totalProfiles,
    totalProjects: counts.totalProjects,
    totalAchievements: counts.totalAchievements,
    totalCertificates: counts.totalCertificates,
    totalResumes: counts.totalResumes,
    totalEvents: counts.totalEvents,
    totalRegistrations: counts.totalRegistrations,
    totalCampaigns: counts.totalCampaigns,
    totalVotes: counts.totalVotes,
    pendingModeration:
      (counts.pendingProjects || 0) +
      (counts.pendingAchievements || 0) +
      (counts.pendingCertificates || 0) +
      (counts.pendingResumes || 0),
  };

  const responsePayload = {
    eventId,
    totalSubmissions: counts.totalVideos,
    totalVideos: counts.totalVideos,
    totalRated: counts.totalRated,
    byYear,
    bySection,
    byStatus,
    byRating,
    overTime,
    portal,
  };

  adminStatsCache.set(eventId, responsePayload);
  return { data: responsePayload, cached: false };
}

export async function getPortalAnalytics() {
  return adminRepo.getAnalyticsCounts();
}
