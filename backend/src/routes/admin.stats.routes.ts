import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { httpError } from '../middleware/apiError';
import { requireAdminAuth } from '../middleware/auth';
import { TtlCache } from '../utils/ttlCache';
import { INTERNAL_EVENT_ID, EXCLUDE_INTERNAL_EVENT } from '../config/constants';

const router = Router();
router.use(requireAdminAuth);

const ACTIVE_EVENT_ID = INTERNAL_EVENT_ID;
const adminStatsCache = new TtlCache<any>(15_000, 10);

// ==========================================
// STATS DASHBOARD (GET /admin/api/stats)
// ==========================================
router.get('/stats', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const eventId = ((req.query.eventId as string) || ACTIVE_EVENT_ID).trim();

    const cached = adminStatsCache.get(eventId);
    if (cached) {
      res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
      return res.json(cached);
    }

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
      prisma.student.count().catch(() => 0),
      prisma.studentProfile.count().catch(() => 0),
      prisma.project.count().catch(() => 0),
      prisma.achievement.count().catch(() => 0),
      prisma.certificate.count().catch(() => 0),
      prisma.resume.count().catch(() => 0),
      prisma.event.count({ where: EXCLUDE_INTERNAL_EVENT }).catch(() => 0),
      prisma.eventRegistration.count().catch(() => 0),
      prisma.votingCampaign.count().catch(() => 0),
      prisma.vote.count().catch(() => 0),
      prisma.project.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.achievement.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.certificate.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.resume.count({ where: { status: 'PENDING' } }).catch(() => 0),
    ]);

    const formatYearLabel = (y: number | string): string => {
      const num = parseInt(String(y), 10);
      if (isNaN(num)) return String(y);
      if (num === 2) return '2nd Year';
      if (num === 3) return '3rd Year';
      if (num === 4) return '4th Year';
      return `${num}th Year`;
    };

    const bySection = (videoGroups as any[])
      .map((g: any) => ({
        label: `${formatYearLabel(g.year)} · ${(g.branch || 'IT').trim()}-${(g.section || '').trim()}`,
        year: g.year,
        branch: g.branch,
        section: g.section,
        submitted: g._count._all,
      }))
      .sort((a: any, b: any) => {
        if (a.year !== b.year) return a.year - b.year;
        if ((a.branch || '') !== (b.branch || '')) return (a.branch || '').localeCompare(b.branch || '');
        return (a.section || '').localeCompare(b.section || '');
      });

    const byYear: Record<string, number> = {};
    (videoGroups as any[]).forEach((g: any) => {
      const key = `Year ${g.year}`;
      byYear[key] = (byYear[key] || 0) + g._count._all;
    });

    const byStatus: Record<string, number> = {};
    (['SUBMITTED', 'UNDER_REVIEW', 'REJECTED'] as const).forEach((s) => {
      byStatus[s] = 0;
    });

    const byRating: Record<string, number> = {};
    (ratingGroups as any[]).forEach((g: any) => {
      if (g.rating) byRating[g.rating] = g._count._all;
    });

    const dateCounts: Record<string, number> = {};
    (overTimeRows as any[]).forEach((s: any) => {
      const dateKey = s.submittedAt.toISOString().split('T')[0];
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });
    const overTime = Object.entries(dateCounts).map(([date, count]) => ({ date, count }));

    const portal = {
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
      pendingModeration: (pendingProjects || 0) + (pendingAchievements || 0) + (pendingCertificates || 0) + (pendingResumes || 0),
    };

    const responsePayload = {
      eventId,
      totalSubmissions: totalVideos,
      totalVideos,
      totalRated,
      byYear,
      bySection,
      byStatus,
      byRating,
      overTime,
      portal,
    };

    adminStatsCache.set(eventId, responsePayload);
    res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
    res.json(responsePayload);
  } catch (err: any) {
    console.error('Error fetching admin stats:', err);
    return httpError(res, 500, err, "FAILED_TO_FETCH_STATS");
  }
});

// ==================================================
// 2. SUBMISSIONS LIST & SEARCH (GET /admin/api/submissions)
// ==================================================


// ==============================================================
// ACTIVITY & AUDIT LOGS (GET /admin/api/activity-logs)
// ==============================================================
router.get('/activity-logs', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const eventId = (req.query.eventId as string) || 'all';
    const category = (req.query.category as string) || 'ALL';
    const status = (req.query.status as string) || 'ALL';
    const search = ((req.query.search as string) || '').trim();

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (eventId !== 'all') {
      whereClause.eventId = eventId;
    }

    if (category !== 'ALL') {
      whereClause.category = category;
    }

    if (status !== 'ALL') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
        { applicantName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { errorMessage: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where: whereClause }),
      prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const statsWhere = eventId !== 'all' ? { eventId } : {};

    const [totalActivities, todayApps, adminCount, errorCount] = await Promise.all([
      prisma.activityLog.count({ where: statsWhere }),
      prisma.activityLog.count({
        where: {
          ...statsWhere,
          category: 'APPLICATION',
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.activityLog.count({
        where: {
          ...statsWhere,
          category: 'ADMIN',
        },
      }),
      prisma.activityLog.count({
        where: {
          ...statsWhere,
          status: 'ERROR',
        },
      }),
    ]);

    const successRate = totalActivities > 0
      ? Number((((totalActivities - errorCount) / totalActivities) * 100).toFixed(1))
      : 100;

    res.json({
      logs,
      stats: {
        totalActivities,
        applicationsToday: todayApps,
        adminActions: adminCount,
        errorsCount: errorCount,
        successRate,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Error fetching activity logs:', err);
    return httpError(res, 500, err, "FAILED_TO_FETCH_ACTIVITY_LOGS");
  }
});



// ==========================================
// ACTIVITY LOGS EXPORT (GET /admin/api/activity-logs/export)
// ==========================================
router.get('/activity-logs/export', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ELITE Student Portal Admin';
    const worksheet = workbook.addWorksheet('Activity Audit Logs');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 28 },
      { header: 'Timestamp', key: 'createdAt', width: 22 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Action', key: 'action', width: 35 },
      { header: 'Applicant', key: 'applicantName', width: 25 },
      { header: 'User Email', key: 'userEmail', width: 28 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Details', key: 'details', width: 45 },
    ];

    const hRow = worksheet.getRow(1);
    hRow.font = { bold: true };
    hRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    logs.forEach((log) => {
      worksheet.addRow({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        category: log.category,
        action: log.action,
        applicantName: log.applicantName || '',
        userEmail: log.userEmail || '',
        status: log.status,
        details: log.details || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=activity-logs-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting activity logs:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});



export default router;
