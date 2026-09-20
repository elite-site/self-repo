import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { driveService } from '../services/drive.service';
import { RATINGS, RATING_LABELS, SUBMISSION_STATUSES } from '../config/constants';
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

    const [totalVideos, totalRated, videoGroups, ratingGroups, overTimeRows] =
      await Promise.all([
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

    const formatYearLabel = (y: number | string): string => {
      const num = parseInt(String(y), 10);
      if (isNaN(num)) return String(y);
      if (num === 2) return '2nd Year';
      if (num === 3) return '3rd Year';
      if (num === 4) return '4th Year';
      return `${num}th Year`;
    };

    const bySection = videoGroups
      .map((g) => ({
        label: `${formatYearLabel(g.year)} · ${(g.branch || 'IT').trim()}-${(g.section || '').trim()}`,
        year: g.year,
        branch: g.branch,
        section: g.section,
        submitted: g._count._all,
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if ((a.branch || '') !== (b.branch || '')) return (a.branch || '').localeCompare(b.branch || '');
        return (a.section || '').localeCompare(b.section || '');
      });

    const byYear: Record<string, number> = {};
    videoGroups.forEach((g) => {
      const key = `Year ${g.year}`;
      byYear[key] = (byYear[key] || 0) + g._count._all;
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
      totalSubmissions: totalVideos,
      totalVideos,
      totalRated,
      byYear,
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
    const tag = (req.query.tag as string | undefined)?.trim().toLowerCase();

    const sortBy = (req.query.sortBy as string) || 'submittedAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const whereClause: any = { eventId };
    const andConditions: any[] = [];

    if (branch) whereClause.branch = branch;
    if (section) whereClause.section = section;
    if (year) whereClause.year = year;
    if (status && SUBMISSION_STATUSES.includes(status)) whereClause.status = status;
    if (rating && RATINGS.includes(rating)) whereClause.rating = rating;

    // Filter by a review hashtag keyword (matches pros or cons on the review)
    if (tag) {
      andConditions.push({
        OR: [
          { reviewPros: { has: tag } },
          { reviewCons: { has: tag } },
        ],
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { rollNo: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      whereClause.AND = andConditions;
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
// 3. STUDENT ROSTER (GET /admin/api/students)
// Full IT-Department roster imported from the XLSX sheet,
// joined with each student's upload status + review info.
// ======================================================
router.get('/students', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = ((req.query.eventId as string) || ACTIVE_EVENT_ID).trim();
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
    const skip = (page - 1) * limit;

    const section = req.query.section as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const uploaded = req.query.uploaded as string | undefined; // 'yes' | 'no'
    const search = (req.query.search as string | undefined)?.trim();

    const whereClause: any = {};
    if (section) whereClause.section = section;
    if (year) whereClause.year = year;
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, submissions] = await Promise.all([
      prisma.student.findMany({
        where: whereClause,
        orderBy: [{ year: 'asc' }, { section: 'asc' }, { rollNo: 'asc' }],
      }),
      prisma.submission.findMany({
        where: { eventId },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    // Join submissions by roll number (latest wins per student)
    const submissionByRoll = new Map<string, typeof submissions[number] | null>();
    for (const sub of submissions) {
      const key = `${sub.rollNo}|${sub.year}|${sub.section}`;
      if (!submissionByRoll.has(key)) {
        submissionByRoll.set(key, sub);
      }
    }

    // 'uploaded' filter applied post-join
    const rows = students
      .map((student) => {
        const key = `${student.rollNo}|${student.year}|${student.section}`;
        const submission = submissionByRoll.get(key) || null;
        return {
          id: student.id,
          rollNo: student.rollNo,
          name: student.name,
          year: student.year,
          section: student.section,
          branch: student.branch,
          hasUploaded: Boolean(submission?.videoDriveId),
          submission: submission
            ? {
                id: submission.id,
                status: submission.status,
                submittedAt: submission.submittedAt,
                videoDriveId: submission.videoDriveId,
                reviewText: submission.reviewText,
                reviewPros: submission.reviewPros,
                reviewCons: submission.reviewCons,
                reviewedAt: submission.reviewedAt,
              }
            : null,
        };
      })
      .filter((row): any => {
        if (uploaded === 'yes') return row.hasUploaded;
        if (uploaded === 'no') return !row.hasUploaded;
        return true;
      });

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginated = rows.slice(skip, skip + limit);

    res.json({
      eventId,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        rosterTotal: students.length,
      },
    });
  } catch (err: any) {
    console.error('Error fetching student roster:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_STUDENTS', message: err.message });
  }
});

// ======================================================
// 3.5 STUDENT ROSTER EXCEL EXPORT (GET /admin/api/students/export)
// Full roster dump from the parent database: every student with
// their complete submission + review information, as an .xlsx file.
// ======================================================
router.get('/students/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = ((req.query.eventId as string) || ACTIVE_EVENT_ID).trim();
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    const eventName = event ? event.name : 'Self Introduction';
    const eventSlug = event ? event.slug : 'self-introduction';

    const [students, submissions] = await Promise.all([
      prisma.student.findMany({
        orderBy: [{ year: 'asc' }, { section: 'asc' }, { rollNo: 'asc' }],
      }),
      prisma.submission.findMany({
        where: { eventId },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    // Join submissions by roll number (latest wins per student)
    const submissionByRoll = new Map<string, typeof submissions[number] | null>();
    for (const sub of submissions) {
      const key = `${sub.rollNo}|${sub.year}|${sub.section}`;
      if (!submissionByRoll.has(key)) {
        submissionByRoll.set(key, sub);
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ELITE Admin Control Center';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('All Students');

    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Student Name', key: 'name', width: 26 },
      { header: 'Roll Number', key: 'rollNo', width: 18 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Branch', key: 'branch', width: 10 },
      { header: 'Email Address', key: 'email', width: 32 },
      { header: 'Phone No', key: 'phoneNo', width: 16 },
      { header: 'Submission Status', key: 'status', width: 16 },
      { header: 'Has Video', key: 'hasVideo', width: 12 },
      { header: 'Submitted At', key: 'submittedAt', width: 22 },
      { header: 'Rating', key: 'rating', width: 16 },
      { header: 'Review Feedback', key: 'reviewText', width: 45 },
      { header: 'Pros / Keywords', key: 'pros', width: 32 },
      { header: 'Cons / Keywords', key: 'cons', width: 32 },
      { header: 'Reviewed At', key: 'reviewedAt', width: 22 },
      { header: 'Reviewed By', key: 'reviewedBy', width: 14 },
      { header: 'Drive Folder Path', key: 'driveFolderPath', width: 48 },
      { header: 'Video Drive ID', key: 'videoDriveId', width: 30 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' },
    };
    headerRow.height = 24;
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    let exported = 0;
    students.forEach((student, idx) => {
      const key = `${student.rollNo}|${student.year}|${student.section}`;
      const sub = submissionByRoll.get(key) || null;

      const ratingText = sub?.rating
        ? `${sub.rating} (${RATING_LABELS[sub.rating] || sub.rating})`
        : sub?.videoDriveId
          ? 'Not Rated'
          : '';

      worksheet.addRow({
        sno: idx + 1,
        name: student.name,
        rollNo: student.rollNo,
        year: `Year ${student.year}`,
        section: student.section,
        branch: student.branch,
        email: sub?.email || `${student.rollNo.toLowerCase()}@itassociations.local`,
        phoneNo: sub?.phoneNo || '',
        status: sub ? sub.status : 'NOT SUBMITTED',
        hasVideo: sub?.videoDriveId ? 'Yes' : 'No',
        submittedAt: sub ? new Date(sub.submittedAt).toLocaleString() : '',
        rating: ratingText,
        reviewText: sub?.reviewText || '',
        pros: (sub?.reviewPros || []).join(', '),
        cons: (sub?.reviewCons || []).join(', '),
        reviewedAt: sub?.reviewedAt ? new Date(sub.reviewedAt).toLocaleString() : '',
        reviewedBy: sub?.reviewedBy || '',
        driveFolderPath: sub?.driveFolderPath || '',
        videoDriveId: sub?.videoDriveId || '',
      });
      if (sub) exported += 1;
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${eventSlug}_2026_All_Students.xlsx`
    );

    await ActivityService.log({
      eventId,
      category: 'ADMIN',
      action: 'Admin exported full student roster',
      details: `Exported ${students.length} students (${exported} with submissions) for ${eventName}`,
      status: 'SUCCESS',
    });

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting student roster:', err);
    res.status(500).json({ error: 'STUDENTS_EXPORT_FAILED', message: err.message });
  }
});

// ======================================================
// 4. SUBMISSION DETAIL (GET /admin/api/submissions/:id)
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

// ==============================================================
// 6. SUBMIT REVIEW RESPONSE (PATCH /admin/api/submissions/:id/review)
// Saves free-text feedback + pros/cons hashtag keywords. The student sees
// this response on their portal after sending.
// ==============================================================
router.patch('/submissions/:id/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewText, pros, cons } = req.body;

    const normalizedPros = Array.isArray(pros)
      ? (pros as string[]).map((p) => String(p).trim().toLowerCase()).filter(Boolean)
      : [];
    const normalizedCons = Array.isArray(cons)
      ? (cons as string[]).map((c) => String(c).trim().toLowerCase()).filter(Boolean)
      : [];
    const hasReview = Boolean(
      (reviewText && String(reviewText).trim()) || normalizedPros.length > 0 || normalizedCons.length > 0
    );

    const existing = await prisma.submission.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id: req.params.id },
      data: hasReview
        ? {
            reviewText: reviewText ? String(reviewText).trim() : null,
            reviewPros: normalizedPros,
            reviewCons: normalizedCons,
            reviewedAt: new Date(),
            reviewedBy: req.adminUser?.username || undefined,
            status: 'REVIEWED',
          }
        : {
            reviewText: null,
            reviewPros: [],
            reviewCons: [],
            reviewedAt: null,
            reviewedBy: undefined,
            status: 'SUBMITTED',
          },
    });

    await ActivityService.log({
      eventId: updated.eventId,
      category: 'ADMIN',
      action: hasReview ? 'Admin sent review response to student' : 'Admin cleared review response',
      details: hasReview
        ? `Pros: ${normalizedPros.length}, Cons: ${normalizedCons.length}`
        : 'Review cleared',
      applicantName: updated.name,
      userEmail: updated.email,
      status: 'SUCCESS',
    });

    res.json({ success: true, submission: updated });
  } catch (err: any) {
    console.error('Error updating review:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_REVIEW', message: err.message });
  }
});

// ==============================================================
// 7. UPDATE STATUS (PATCH /admin/api/submissions/:id/status)
// ==============================================================
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
      { header: 'Phone No', key: 'phoneNo', width: 16 },
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
        phoneNo: sub.phoneNo || '',
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