import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { driveService } from '../services/drive.service';
import { emailService, EmailTemplateType } from '../services/email.service';
import { SUBMISSION_STATUSES, WINNER_RANKS } from '../config/constants';
import { ActivityService } from '../services/activity.service';

const router = Router();

// Protect all /admin/api routes with JWT authentication
router.use(requireAdminAuth);

// ==========================================
// 0. LIST EVENTS (GET /admin/api/events)
// ==========================================
router.get('/events', async (_req: Request, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'asc' },
    });
    res.json({ events });
  } catch (err: any) {
    console.error('Error fetching events list:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_EVENTS', message: err.message });
  }
});

// ==========================================
// 1. STATS DASHBOARD (GET /admin/api/stats)
// ==========================================
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = ((req.query.eventId as string) || 'self-introduction-2026').trim();

    const totalSubmissions = await prisma.submission.count({ where: { eventId } });
    const totalWinners = await prisma.submission.count({ where: { eventId, isWinner: true } });

    // Group by branch
    const branchGroups = await prisma.submission.groupBy({
      by: ['branch'],
      where: { eventId },
      _count: { _all: true },
    });
    const byBranch: Record<string, number> = {};
    branchGroups.forEach((g) => {
      byBranch[g.branch] = g._count._all;
    });

    // Group by year (excluding 1st year)
    const yearGroups = await prisma.submission.groupBy({
      by: ['year'],
      where: { eventId },
      _count: { _all: true },
    });
    const byYear: Record<string, number> = {};
    yearGroups.forEach((g) => {
      const yNum = typeof g.year === 'number' ? g.year : parseInt(String(g.year), 10);
      if (yNum !== 1) {
        byYear[`Year ${g.year}`] = g._count._all;
      }
    });

    // Group by year, branch, & section (excluding 1st year)
    const sectionGroups = await prisma.submission.groupBy({
      by: ['year', 'branch', 'section'],
      where: { eventId },
      _count: { _all: true },
    });

    const formatYearLabel = (y: number | string): string => {
      const str = String(y).trim();
      if (str.toLowerCase().includes('year')) return str;
      const num = parseInt(str, 10);
      if (isNaN(num)) return str;
      if (num === 2) return '2nd Year';
      if (num === 3) return '3rd Year';
      if (num === 4) return '4th Year';
      return `${num}th Year`;
    };

    const yearToNum = (y: number | string): number => {
      if (typeof y === 'number') return y;
      const match = String(y).match(/\d+/);
      return match ? parseInt(match[0], 10) : 999;
    };

    const bySection: Array<{ label: string; count: number; year: number; branch: string; section: string }> = sectionGroups
      .filter((g) => {
        const yNum = yearToNum(g.year);
        return yNum !== 1;
      })
      .map((g) => {
        const yearFormatted = formatYearLabel(g.year);
        const branchStr = g.branch ? g.branch.trim() : 'IT';
        const label = `${yearFormatted} · ${branchStr}-${g.section}`;
        return {
          label,
          count: g._count._all,
          year: g.year,
          branch: g.branch,
          section: g.section,
        };
      })
      .sort((a, b) => {
        const yearDiff = yearToNum(a.year) - yearToNum(b.year);
        if (yearDiff !== 0) return yearDiff;
        const branchDiff = (a.branch || '').localeCompare(b.branch || '');
        if (branchDiff !== 0) return branchDiff;
        return (a.section || '').localeCompare(b.section || '');
      });

    // Group by status
    const statusGroups = await prisma.submission.groupBy({
      by: ['status'],
      where: { eventId },
      _count: { _all: true },
    });
    const byStatus: Record<string, number> = {};
    statusGroups.forEach((g) => {
      byStatus[g.status] = g._count._all;
    });

    // Submissions over time (mini timeline)
    const allDates = await prisma.submission.findMany({
      where: { eventId },
      select: { submittedAt: true },
      orderBy: { submittedAt: 'asc' },
    });

    const dateCounts: Record<string, number> = {};
    allDates.forEach((s) => {
      const dateKey = s.submittedAt.toISOString().split('T')[0];
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });

    const overTime = Object.entries(dateCounts).map(([date, count]) => ({
      date,
      count,
    }));

    res.json({
      eventId,
      totalSubmissions,
      totalWinners,
      byBranch,
      byYear,
      bySection,
      byStatus,
      overTime,
    });
  } catch (err: any) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_STATS', message: err.message });
  }
});

// ==================================================
// 2. SUBMISSIONS LIST & SEARCH (GET /admin/api/submissions)
// ==================================================
router.get('/submissions', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = ((req.query.eventId as string) || 'self-introduction-2026').trim();
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
    const skip = (page - 1) * limit;

    const branch = req.query.branch as string | undefined;
    const section = req.query.section as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const status = req.query.status as any;
    const isWinner = req.query.isWinner !== undefined ? req.query.isWinner === 'true' : undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const sortBy = (req.query.sortBy as string) || 'submittedAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const whereClause: any = { eventId };

    if (branch) whereClause.branch = branch;
    if (section) whereClause.section = section;
    if (year) whereClause.year = year;
    if (status && SUBMISSION_STATUSES.includes(status)) whereClause.status = status;
    if (isWinner !== undefined) whereClause.isWinner = isWinner;

    if (search) {
      whereClause.AND = [
        { eventId },
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { rollNo: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, submissions] = await Promise.all([
      prisma.submission.count({ where: whereClause }),
      prisma.submission.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    res.json({
      eventId,
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Error fetching submissions list:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_SUBMISSIONS', message: err.message });
  }
});

// ======================================================
// 3. SUBMISSION DETAIL (GET /admin/api/submissions/:id)
// ======================================================
router.get('/submissions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
    });

    if (!submission) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }

    res.json(submission);
  } catch (err: any) {
    console.error('Error fetching submission detail:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_SUBMISSION', message: err.message });
  }
});

// =========================================================================
// 4. SECURE MEDIA PROXY (GET /admin/api/submissions/:id/media/:fileKey)
// =========================================================================
router.get('/submissions/:id/media/:fileKey', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, fileKey } = req.params;
    const submission = await prisma.submission.findUnique({ where: { id } });

    if (!submission) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }

    if (fileKey !== 'video') {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: `Media ${fileKey} is not available for this portal.` });
      return;
    }

    const driveFileId = submission.videoDriveId;

    if (!driveFileId) {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: `Media ${fileKey} not present for this submission.` });
      return;
    }

    const { stream, mimeType, size } = await driveService.streamDriveFile(driveFileId, submission.driveFolderPath);

    res.setHeader('Content-Type', mimeType);
    if (size) res.setHeader('Content-Length', size.toString());
    res.setHeader('Cache-Control', 'private, max-age=86400');
    stream.pipe(res);
  } catch (err: any) {
    console.error('Error proxying media:', err);
    res.status(500).json({ error: 'MEDIA_STREAM_ERROR', message: 'Could not stream media file.' });
  }
});

// ==============================================================
// 5. MARK WINNER & RANK (PATCH /admin/api/submissions/:id/winner)
// ==============================================================
router.patch('/submissions/:id/winner', async (req: Request, res: Response): Promise<void> => {
  try {
    const { isWinner, winnerRank } = req.body;

    const parsedRank = isWinner && winnerRank !== undefined && winnerRank !== null
      ? parseInt(winnerRank, 10)
      : null;

    const updated = await prisma.submission.update({
      where: { id: req.params.id },
      data: {
        isWinner: Boolean(isWinner),
        winnerRank: parsedRank,
        status: isWinner ? 'WINNER' : 'SUBMITTED',
      },
    });

    await ActivityService.log({
      eventId: updated.eventId,
      category: 'ADMIN',
      action: isWinner ? 'Admin marked applicant as winner' : 'Admin removed winner status',
      details: isWinner ? `Winner Rank: ${parsedRank || 'Unranked'}` : 'Status reset to SUBMITTED',
      applicantName: updated.name,
      userEmail: updated.email,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: isWinner ? 'Submission marked as winner' : 'Winner flag removed',
      submission: updated,
    });
  } catch (err: any) {
    console.error('Error updating winner status:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_WINNER', message: err.message });
  }
});

// ==========================================================
// 6. UPDATE STATUS (PATCH /admin/api/submissions/:id/status)
// ==========================================================
router.patch('/submissions/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    if (!SUBMISSION_STATUSES.includes(status)) {
      res.status(400).json({ error: 'INVALID_STATUS', message: 'Invalid status value provided.' });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id: req.params.id },
      data: {
        status,
        isWinner: status === 'WINNER',
        ...(status !== 'WINNER' ? { winnerRank: null } : {}),
      },
    });

    await ActivityService.log({
      eventId: updated.eventId,
      category: 'ADMIN',
      action: `Admin updated status to ${status}`,
      details: `Applicant status set to ${status}`,
      applicantName: updated.name,
      userEmail: updated.email,
      status: 'SUCCESS',
    });

    res.json({ success: true, submission: updated });
  } catch (err: any) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_STATUS', message: err.message });
  }
});

// ========================================================
// 7. EMAIL PREVIEW (GET /admin/api/email/preview)
// ========================================================
router.get('/email/preview', async (req: Request, res: Response): Promise<void> => {
  try {
    const templateType = (req.query.templateType as EmailTemplateType) || 'WINNER';
    const submissionId = req.query.submissionId as string | undefined;

    const preview = await emailService.previewTemplate(templateType, submissionId);
    res.json(preview);
  } catch (err: any) {
    console.error('Error generating email preview:', err);
    res.status(500).json({ error: 'PREVIEW_FAILED', message: err.message });
  }
});

// ========================================================
// 8. SEND EMAILS (POST /admin/api/email/send)
// ========================================================
router.post('/email/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { templateType, submissionIds, forceResend } = req.body;

    if (!templateType || !['WINNER', 'PARTICIPANT_THANKYOU'].includes(templateType)) {
      res.status(400).json({ error: 'INVALID_TEMPLATE', message: 'Valid templateType is required.' });
      return;
    }

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      res.status(400).json({ error: 'NO_RECIPIENTS', message: 'At least one submission ID must be selected.' });
      return;
    }

    const result = await emailService.sendBatch({
      templateType,
      submissionIds,
      forceResend: Boolean(forceResend),
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error sending emails:', err);
    res.status(500).json({ error: 'EMAIL_SEND_FAILED', message: err.message });
  }
});

// ========================================================
// 9. EMAIL LOGS (GET /admin/api/email/logs)
// ========================================================
router.get('/email/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = ((req.query.eventId as string) || 'self-introduction-2026').trim();

    const logs = await prisma.emailLog.findMany({
      where: { eventId },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });

    res.json({ eventId, logs });
  } catch (err: any) {
    console.error('Error fetching email logs:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_LOGS', message: err.message });
  }
});

// ==============================================================
// 10. EXCEL EXPORT (GET /admin/api/export/excel)
// ==============================================================
router.get('/export/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = ((req.query.eventId as string) || 'self-introduction-2026').trim();
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    const eventName = event ? event.name : 'Self Introduction';
    const eventSlug = event ? event.slug : 'photography';

    const submissions = await prisma.submission.findMany({
      where: { eventId },
      orderBy: { submittedAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ELITE Admin Control Center';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(`${eventName} Applicants`);

    // Styling headers
    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Applicant Name', key: 'name', width: 25 },
      { header: 'Roll Number', key: 'rollNo', width: 18 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Branch', key: 'branch', width: 10 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Media Type', key: 'mediaType', width: 14 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Winner', key: 'isWinner', width: 10 },
      { header: 'Rank', key: 'winnerRank', width: 20 },
      { header: 'Submitted At', key: 'submittedAt', width: 22 },
      { header: 'Drive Folder Path', key: 'driveFolderPath', width: 45 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' }, // ELITE dark theme header
    };
    headerRow.height = 24;

    submissions.forEach((sub, idx) => {
      let rankText = '-';
      if (sub.isWinner && sub.winnerRank) {
        const foundRank = WINNER_RANKS.find((r) => r.rank === sub.winnerRank);
        rankText = foundRank ? foundRank.label : `${sub.winnerRank}th Place`;
      }

      worksheet.addRow({
        sno: idx + 1,
        name: sub.name,
        rollNo: sub.rollNo,
        year: `Year ${sub.year}`,
        section: sub.section,
        branch: sub.branch,
        email: sub.email,
        mediaType: sub.mediaType || 'PHOTOS',
        status: sub.status,
        isWinner: sub.isWinner ? 'YES' : 'NO',
        winnerRank: rankText,
        submittedAt: new Date(sub.submittedAt).toLocaleString(),
        driveFolderPath: sub.driveFolderPath,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ELITE_${eventSlug}_2026_Applicants.xlsx`
    );

    await ActivityService.log({
      eventId,
      category: 'ADMIN',
      action: 'Admin exported Excel report',
      details: `Exported ${submissions.length} records for ${eventName}`,
      status: 'SUCCESS',
    });

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting Excel report:', err);
    res.status(500).json({ error: 'EXCEL_EXPORT_FAILED', message: err.message });
  }
});

// ==============================================================
// 11. DELETE SUBMISSION & DRIVE FILES (DELETE /admin/api/submissions/:id)
// ==============================================================
router.delete('/submissions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const submission = await prisma.submission.findUnique({ where: { id } });

    if (!submission) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }

    // 1. Delete associated files and folder from Google Drive or mock storage
    await driveService.deleteSubmissionFiles(submission);

    // 2. Delete associated email logs
    await prisma.emailLog.deleteMany({ where: { submissionId: id } });

    // 3. Delete submission record from database
    await prisma.submission.delete({ where: { id } });

    await ActivityService.log({
      eventId: submission.eventId,
      category: 'ADMIN',
      action: 'Admin deleted applicant',
      details: `Purged submission record and Drive files for ${submission.rollNo}`,
      applicantName: submission.name,
      userEmail: submission.email,
      status: 'WARNING',
    });

    res.json({
      success: true,
      message: 'Submission and associated Google Drive assets purged successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting submission:', err);
    res.status(500).json({ error: 'DELETE_FAILED', message: err.message });
  }
});

// =========================================================================
// 12. ACTIVITY & AUDIT LOGS (GET /admin/api/activity-logs)
// =========================================================================
router.get('/activity-logs', async (req: Request, res: Response): Promise<void> => {
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

    // Calculate aggregated stats
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
    res.status(500).json({ error: 'FAILED_TO_FETCH_ACTIVITY_LOGS', message: err.message });
  }
});

export default router;

