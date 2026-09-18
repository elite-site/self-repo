import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { driveService } from '../services/drive.service';
import { RATINGS, RATING_LABELS, SUBMISSION_STATUSES, SECTIONS, BRANCHES, YEARS } from '../config/constants';
import { studentImportUploadMiddleware } from '../middleware/upload';
import { ActivityService } from '../services/activity.service';

const router = Router();

const ACTIVE_EVENT_ID = 'self-introduction-2026';

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
    const eventId = ((req.query.eventId as string) || ACTIVE_EVENT_ID).trim();

    const [totalStudents, totalVideos, totalRated, studentGroups, videoGroups, ratingGroups, overTimeRows] =
      await Promise.all([
        prisma.student.count({ where: { eventId } }),
        prisma.submission.count({ where: { eventId, videoDriveId: { not: null } } }),
        prisma.submission.count({ where: { eventId, rating: { not: null } } }),
        prisma.student.groupBy({
          by: ['branch', 'section', 'year'],
          where: { eventId },
          _count: { _all: true },
        }),
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

    const totalRemaining = Math.max(0, totalStudents - totalVideos);

    const formatYearLabel = (y: number | string): string => {
      const num = parseInt(String(y), 10);
      if (isNaN(num)) return String(y);
      if (num === 2) return '2nd Year';
      if (num === 3) return '3rd Year';
      if (num === 4) return '4th Year';
      return `${num}th Year`;
    };

    const key = (g: { branch: string; section: string; year: number }) =>
      `${String(g.year)}|${(g.branch || '').trim()}|${(g.section || '').trim()}`;

    const submittedMap = new Map<string, number>();
    videoGroups.forEach((g) => submittedMap.set(key(g), g._count._all));

    const bySection = studentGroups
      .map((g) => {
        const k = key(g);
        const submitted = submittedMap.get(k) || 0;
        return {
          label: `${formatYearLabel(g.year)} · ${(g.branch || 'IT').trim()}-${(g.section || '').trim()}`,
          year: g.year,
          branch: g.branch,
          section: g.section,
          total: g._count._all,
          submitted,
          remaining: Math.max(0, g._count._all - submitted),
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if ((a.branch || '') !== (b.branch || '')) return (a.branch || '').localeCompare(b.branch || '');
        return (a.section || '').localeCompare(b.section || '');
      });

    const yearTotals = new Map<number, { total: number; submitted: number }>();
    studentGroups.forEach((g) => {
      const cur = yearTotals.get(g.year) || { total: 0, submitted: 0 };
      cur.total += g._count._all;
      yearTotals.set(g.year, cur);
    });
    videoGroups.forEach((g) => {
      const cur = yearTotals.get(g.year) || { total: 0, submitted: 0 };
      cur.submitted += g._count._all;
      yearTotals.set(g.year, cur);
    });
    const byYear: Record<string, number> = {};
    const byYearProgress: Record<string, { total: number; submitted: number; remaining: number }> = {};
    [...yearTotals.entries()].sort((a, b) => a[0] - b[0]).forEach(([y, v]) => {
      byYear[`Year ${y}`] = v.submitted;
      byYearProgress[`Year ${y}`] = {
        total: v.total,
        submitted: v.submitted,
        remaining: Math.max(0, v.total - v.submitted),
      };
    });

    const byStatus: Record<string, number> = {};
    (['SUBMITTED', 'UNDER_REVIEW', 'REJECTED'] as const).forEach((s) => {
      byStatus[s] = 0;
    });

    const byRating: Record<string, number> = {};
    ratingGroups.forEach((g) => {
      if (g.rating) byRating[g.rating] = g._count._all;
    });

    const dateCounts: Record<string, number> = {};
    overTimeRows.forEach((s) => {
      const dateKey = s.submittedAt.toISOString().split('T')[0];
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });
    const overTime = Object.entries(dateCounts).map(([date, count]) => ({ date, count }));

    res.json({
      eventId,
      totalStudents,
      totalSubmissions: totalVideos,
      totalVideos,
      totalRated,
      totalRemaining,
      byYear,
      byYearProgress,
      bySection,
      byStatus,
      byRating,
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
    const eventId = ((req.query.eventId as string) || ACTIVE_EVENT_ID).trim();
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
    const skip = (page - 1) * limit;

    const branch = req.query.branch as string | undefined;
    const section = req.query.section as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const status = req.query.status as any;
    const rating = req.query.rating as any;
    const search = (req.query.search as string | undefined)?.trim();

    const sortBy = (req.query.sortBy as string) || 'submittedAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const whereClause: any = { eventId };

    if (branch) whereClause.branch = branch;
    if (section) whereClause.section = section;
    if (year) whereClause.year = year;
    if (status && SUBMISSION_STATUSES.includes(status)) whereClause.status = status;
    if (rating && RATINGS.includes(rating)) whereClause.rating = rating;

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
// 5. SET PERFORMANCE RATING (PATCH /admin/api/submissions/:id/rating)
// ==============================================================
router.patch('/submissions/:id/rating', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rating } = req.body;

    const hasRating = rating !== null && rating !== undefined && rating !== '';
    const normalized = hasRating ? String(rating).toUpperCase() : null;

    if (normalized && !RATINGS.includes(normalized as any)) {
      res.status(400).json({ error: 'INVALID_RATING', message: `Invalid rating. Available options: ${RATINGS.join(', ')}.` });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id: req.params.id },
      data: {
        rating: (normalized as any) || null,
        ratedAt: normalized ? new Date() : null,
      },
    });

    await ActivityService.log({
      eventId: updated.eventId,
      category: 'ADMIN',
      action: normalized ? `Admin rated student ${RATING_LABELS[normalized]}` : 'Admin cleared performance rating',
      details: normalized ? `Rating: ${normalized} (${RATING_LABELS[normalized]})` : 'Rating cleared',
      applicantName: updated.name,
      userEmail: updated.email,
      status: 'SUCCESS',
    });

    res.json({ success: true, submission: updated });
  } catch (err: any) {
    console.error('Error updating rating:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_RATING', message: err.message });
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
      data: { status },
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

// ==============================================================
// 7. DELETE ONLY THE VIDEO (DELETE /admin/api/submissions/:id/video)
// Removes the video file so the student can upload a replacement.
// ==============================================================
router.delete('/submissions/:id/video', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const submission = await prisma.submission.findUnique({ where: { id } });

    if (!submission) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }

    if (!submission.videoDriveId) {
      res.status(400).json({ error: 'NO_VIDEO', message: 'This submission has no video to delete.' });
      return;
    }

    await driveService.deleteVideo(submission);

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        videoDriveId: null,
      },
    });

    await ActivityService.log({
      eventId: updated.eventId,
      category: 'ADMIN',
      action: 'Admin deleted student introduction video',
      details: `Video removed for ${updated.rollNo}. Student may re-upload.`,
      applicantName: updated.name,
      userEmail: updated.email,
      status: 'WARNING',
    });

    res.json({
      success: true,
      message: 'Introduction video deleted. The student can now upload a replacement.',
      submission: updated,
    });
  } catch (err: any) {
    console.error('Error deleting video:', err);
    res.status(500).json({ error: 'VIDEO_DELETE_FAILED', message: err.message });
  }
});

// ==============================================================
// 8. EXCEL EXPORT (GET /admin/api/export/excel)
// ==============================================================
router.get('/export/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = ((req.query.eventId as string) || ACTIVE_EVENT_ID).trim();
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    const eventName = event ? event.name : 'Self Introduction';
    const eventSlug = event ? event.slug : 'self-introduction';

    const submissions = await prisma.submission.findMany({
      where: { eventId },
      orderBy: { submittedAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ELITE Admin Control Center';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(`${eventName} Submissions`);

    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Roll Number', key: 'rollNo', width: 18 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Branch', key: 'branch', width: 10 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Rating', key: 'rating', width: 14 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Submitted At', key: 'submittedAt', width: 22 },
      { header: 'Drive Folder Path', key: 'driveFolderPath', width: 45 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' },
    };
    headerRow.height = 24;

    submissions.forEach((sub, idx) => {
      const ratingText = sub.rating ? `${sub.rating} (${RATING_LABELS[sub.rating] || sub.rating})` : 'Not Rated';

      worksheet.addRow({
        sno: idx + 1,
        name: sub.name,
        rollNo: sub.rollNo,
        year: `Year ${sub.year}`,
        section: sub.section,
        branch: sub.branch,
        email: sub.email,
        rating: ratingText,
        status: sub.status,
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
      `attachment; filename=ELITE_${eventSlug}_2026_Submissions.xlsx`
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
// 9. DELETE SUBMISSION & DRIVE FILES (DELETE /admin/api/submissions/:id)
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

    // 2. Delete submission record from database
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
      message: 'Submission and associated files purged successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting submission:', err);
    res.status(500).json({ error: 'DELETE_FAILED', message: err.message });
  }
});

// ==========================================
// 10. STUDENT ROSTER LIST (GET /admin/api/students)
// ==========================================
router.get('/students', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = ((req.query.eventId as string) || ACTIVE_EVENT_ID).trim();
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
    const skip = (page - 1) * limit;

    const section = req.query.section as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const whereClause: any = { eventId };
    if (section) whereClause.section = section;
    if (year) whereClause.year = year;
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where: whereClause }),
      prisma.student.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { rollNo: 'asc' },
      }),
    ]);

    // Attach submission state (hasVideo + rating) for each student
    const submissions = await prisma.submission.findMany({
      where: { eventId, rollNo: { in: students.map((s) => s.rollNo) } },
      select: { rollNo: true, videoDriveId: true, rating: true, id: true, year: true, branch: true, section: true },
    });

    const stateMap = new Map<string, { id: string; hasVideo: boolean; rating: string | null }>();
    submissions.forEach((sub) => {
      stateMap.set(sub.rollNo, {
        id: sub.id,
        hasVideo: Boolean(sub.videoDriveId),
        rating: sub.rating as string | null,
      });
    });

    res.json({
      eventId,
      data: students.map((s) => ({
        ...s,
        submissionId: stateMap.get(s.rollNo)?.id || null,
        hasVideo: stateMap.get(s.rollNo)?.hasVideo || false,
        rating: stateMap.get(s.rollNo)?.rating || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Error fetching student roster:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_STUDENTS', message: err.message });
  }
});

// ==========================================
// 11. IMPORT STUDENT ROSTER (POST /admin/api/students/import)
// Accepts .xlsx or .csv (multipart field "file")
// ==========================================
router.post('/students/import', studentImportUploadMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = ((req.query.eventId as string) || ACTIVE_EVENT_ID).trim();
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'NO_FILE', message: 'Please attach an Excel (.xlsx) or CSV file.' });
      return;
    }

    const fileName = (file.originalname || '').toLowerCase();
    const isCsv = fileName.endsWith('.csv');

    interface RawRow {
      rollNo: string;
      name: string;
      branch: string;
      section: string;
      year: number;
      email: string;
    }

    let rows: RawRow[] = [];

    if (isCsv) {
      const content = file.buffer.toString('utf-8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        res.status(400).json({ error: 'EMPTY_FILE', message: 'CSV file must contain a header row and at least one student row.' });
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const colIdx = (name: string) => headers.findIndex((h) => h.includes(name));

      lines.slice(1).forEach((line) => {
        const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const get = (name: string, fallbackIdx?: number) =>
          colIdx(name) >= 0 ? cells[colIdx(name)] : cells[fallbackIdx ?? -1];

        if (cells.filter((c) => c).length === 0) return;

        const rollNo = (get('roll', 0) || '').toUpperCase();
        const name = get('name', 1) || '';
        const branch = (get('branch', 2) || 'IT').toUpperCase();
        const section = (get('section', 3) || '').toUpperCase();
        const year = parseInt(get('year', 4) || '0', 10);
        const email = (get('email', 5) || '').toLowerCase();

        if (rollNo && name && section && year) {
          rows.push({ rollNo, name, branch, section, year, email });
        }
      });
    } else {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = file.buffer.buffer.slice(
        file.buffer.byteOffset,
        file.buffer.byteOffset + file.buffer.byteLength
      );
      await workbook.xlsx.load(arrayBuffer as ArrayBuffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        res.status(400).json({ error: 'EMPTY_FILE', message: 'Excel file does not contain a worksheet.' });
        return;
      }

      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: false }, (cell) => {
        headers.push(String(cell.value ?? '').trim().toLowerCase());
      });
      const colIdx = (name: string) => headers.findIndex((h) => h.includes(name));

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const cell = (name: string, fallbackIdx?: number) => {
          const idx = colIdx(name) >= 0 ? colIdx(name) : fallbackIdx;
          if (idx === undefined || idx === null || idx < 0) return '';
          const val = row.getCell(idx + 1).value;
          return val === null || val === undefined ? '' : String(val).trim();
        };

        const rollNo = cell('roll', 0).toUpperCase();
        const name = cell('name', 1);
        const branch = (cell('branch', 2) || 'IT').toUpperCase();
        const section = cell('section', 3).toUpperCase();
        const year = parseInt(cell('year', 4) || '0', 10);
        const email = cell('email', 5).toLowerCase();

        if (rollNo && name && section && year) {
          rows.push({ rollNo, name, branch, section, year, email });
        }
      });
    }

    if (rows.length === 0) {
      res.status(400).json({ error: 'NO_ROWS', message: 'No valid student rows were found in the uploaded file.' });
      return;
    }

    // Normalize & validate against allowed options
    const validBranches = new Set<string>(BRANCHES as unknown as string[]);
    const validSections = new Set<string>(SECTIONS as unknown as string[]);
    const validYears = new Set<number>(YEARS as unknown as number[]);

    const errors: string[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const seenRollNos = new Set<string>();

    for (const row of rows) {
      if (seenRollNos.has(row.rollNo)) {
        skipped++;
        continue;
      }
      seenRollNos.add(row.rollNo);

      const finalSection = validSections.has(row.section) ? row.section : (SECTIONS[0] as string);
      const finalYear = validYears.has(row.year) ? row.year : NaN;
      const finalBranch = validBranches.has(row.branch) ? row.branch : (BRANCHES[0] as string);

      if (!Number.isFinite(finalYear)) {
        errors.push(`${row.rollNo}: invalid year "${row.year}"`);
        skipped++;
        continue;
      }

      const existing = await prisma.student.findUnique({
        where: { eventId_rollNo: { eventId, rollNo: row.rollNo } },
      });

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            branch: finalBranch,
            section: finalSection,
            year: finalYear,
            email: row.email,
          },
        });
        updated++;
      } else {
        await prisma.student.create({
          data: {
            eventId,
            rollNo: row.rollNo,
            name: row.name,
            branch: finalBranch,
            section: finalSection,
            year: finalYear,
            email: row.email,
          },
        });
        imported++;
      }
    }

    await ActivityService.log({
      eventId,
      category: 'ADMIN',
      action: 'Admin imported student roster',
      details: `Imported ${imported} new, updated ${updated}, skipped ${skipped}, errors ${errors.length}`,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: `Student roster imported: ${imported} new, ${updated} updated, ${skipped} skipped.`,
      imported,
      updated,
      skipped,
      errors,
    });
  } catch (err: any) {
    console.error('Error importing student roster:', err);
    res.status(500).json({ error: 'IMPORT_FAILED', message: err.message });
  }
});

// ==========================================
// 12. STUDENT ROSTER TEMPLATE (GET /admin/api/students/template)
// ==========================================
router.get('/students/template', async (_req: Request, res: Response): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ELITE Admin Control Center';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Students');
    worksheet.columns = [
      { header: 'Roll No', key: 'rollNo', width: 18 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Branch', key: 'branch', width: 10 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Email', key: 'email', width: 30 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };

    worksheet.addRow({ rollNo: '25K61A1201', name: 'Jane Smith', branch: 'IT', section: 'A', year: 2, email: 'janesmith@sasi.ac.in' });
    worksheet.addRow({ rollNo: '23K61A1202', name: 'John Doe', branch: 'IT', section: 'B', year: 3, email: 'johndoe@sasi.ac.in' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=student_roster_template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error generating student template:', err);
    res.status(500).json({ error: 'TEMPLATE_FAILED', message: err.message });
  }
});

// ==========================================
// 13. DELETE STUDENT (DELETE /admin/api/students/:id)
// ==========================================
router.delete('/students/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } });

    if (!student) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
      return;
    }

    await prisma.student.delete({ where: { id: student.id } });

    await ActivityService.log({
      eventId: student.eventId,
      category: 'ADMIN',
      action: 'Admin removed student from roster',
      details: `Removed ${student.rollNo} (${student.name})`,
      status: 'WARNING',
    });

    res.json({ success: true, message: `Student ${student.rollNo} removed from the roster.` });
  } catch (err: any) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'DELETE_FAILED', message: err.message });
  }
});

// ==============================================================
// 14. ACTIVITY & AUDIT LOGS (GET /admin/api/activity-logs)
// ==============================================================
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