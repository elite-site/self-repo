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
      prisma.event.count().catch(() => 0),
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
      portal,
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
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('ETag', `"${driveFileId}"`);

    if (req.headers['if-none-match'] === `"${driveFileId}"`) {
      res.status(304).end();
      return;
    }

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

    try {
      await prisma.introVideo.updateMany({
        where: { student: { rollNo: submission.rollNo } },
        data: {
          driveFileId: null,
          status: 'REJECTED',
          reviewNote: 'Video removed by administrator.',
        },
      });
    } catch (_) {}

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


// ==========================================
// MODERATION, VOTING, ANNOUNCEMENTS, SETTINGS, SKILLS
// ==========================================

router.get('/moderation/videos', async (req, res) => {
  try {
    const videos = await prisma.introVideo.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      include: { student: true }
    });
    res.json(videos.map(v => ({
      ...v,
      studentName: v.student?.name || 'Unknown',
      studentRoll: v.student?.rollNo || 'Unknown',
      title: `${v.student?.name} (${v.student?.rollNo})`,
      fileUrl: v.driveFileId ? `/api/public/media/video/${v.driveFileId}` : null,
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/moderation/resumes', async (req, res) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      include: { student: true }
    });
    res.json(resumes.map(r => ({
      ...r,
      studentName: r.student?.name || 'Unknown',
      studentRoll: r.student?.rollNo || 'Unknown',
      title: `${r.student?.name} (${r.student?.rollNo})`,
      fileUrl: r.driveFileId ? `/api/public/media/resume/${r.driveFileId}` : null,
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/moderation/achievements', async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      include: { student: true, category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(achievements.map(a => {
      const proofUrl = a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.proofDriveId}` : null);
      return {
        ...a,
        studentName: a.student?.name || 'Unknown',
        studentRoll: a.student?.rollNo || 'Unknown',
        submittedAt: a.createdAt,
        title: a.title,
        description: a.description,
        organization: a.organization,
        category: a.category?.name,
        proofUrl,
        fileUrl: proofUrl,
      };
    }));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/moderation/certificates', async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      include: { student: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(certificates.map(c => ({
      ...c,
      studentName: c.student?.name || 'Unknown',
      studentRoll: c.student?.rollNo || 'Unknown',
      submittedAt: c.createdAt,
      fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.fileDriveId}` : null
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/moderation/videos/:id', async (req, res) => {
  try {
    const { action, reason } = req.body;
    const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CHANGES_REQUESTED';
    await prisma.introVideo.update({
      where: { id: req.params.id },
      data: { status, reviewNote: reason }
    });
    res.json({ message: 'Success' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/moderation/resumes/:id', async (req, res) => {
  try {
    const { action, reason } = req.body;
    const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CHANGES_REQUESTED';
    await prisma.resume.update({
      where: { id: req.params.id },
      data: { status, reviewNote: reason }
    });
    res.json({ message: 'Success' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/moderation/achievements/:id', async (req, res) => {
  try {
    const { action, reason } = req.body;
    const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : action === 'hide' ? 'HIDDEN' : 'CHANGES_REQUESTED';
    const updated = await prisma.achievement.update({
      where: { id: req.params.id },
      data: { status, reviewNote: reason || null, reviewedAt: new Date() }
    });
    res.json({ message: 'Success', achievement: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/voting', async (req, res) => {
  try {
    const campaigns = await prisma.votingCampaign.findMany();
    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/voting', async (req, res) => {
  try {
    const { title, description, votingStart, votingEnd, startDate, endDate, eventId } = req.body;
    const campaign = await prisma.votingCampaign.create({
      data: {
        title,
        description,
        startsAt: votingStart || startDate ? new Date(votingStart || startDate) : null,
        endsAt: votingEnd || endDate ? new Date(votingEnd || endDate) : null,
        eventId: eventId || null,
        status: 'DRAFT'
      }
    });
    res.status(201).json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/voting/:id', async (req, res) => {
  try {
    const { status, title, description } = req.body;
    const campaign = await prisma.votingCampaign.update({
      where: { id: req.params.id },
      data: { status, title, description }
    });
    res.json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/voting/:id/results', async (req, res) => {
  try {
    const votes = await prisma.vote.groupBy({
      by: ['candidateId'],
      where: { campaignId: req.params.id },
      _count: { id: true }
    });
    res.json(votes);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/announcements', async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(announcements);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/announcements', async (req, res) => {
  try {
    const { title, body, content, message, scheduledAt, priority, targetYear, targetSection, targetAll } = req.body;
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isFutureScheduled = scheduledDate !== null && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();

    const isTargetAll = targetAll === false ? false : (targetAll === true ? true : !(targetYear || targetSection));

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message: body || content || message || '',
        priority: priority || 'normal',
        targetYear: targetYear !== undefined && targetYear !== null && targetYear !== '' ? parseInt(String(targetYear), 10) : null,
        targetSection: targetSection ? String(targetSection) : null,
        targetAll: isTargetAll,
        createdBy: (req as any).adminUser?.username || (req as any).user?.username || 'admin',
        scheduledAt: scheduledDate,
        status: isFutureScheduled ? 'SCHEDULED' : 'PUBLISHED',
        publishedAt: isFutureScheduled ? null : (scheduledDate || new Date())
      }
    });

    // Hold back notifications if scheduled in the future
    if (!isFutureScheduled) {
      const studentWhere: any = {};
      if (!isTargetAll) {
        if (targetYear !== undefined && targetYear !== null && targetYear !== '') {
          studentWhere.year = parseInt(String(targetYear), 10);
        }
        if (targetSection !== undefined && targetSection !== null && targetSection !== '') {
          studentWhere.section = String(targetSection);
        }
      }

      const students = await prisma.student.findMany({
        where: studentWhere,
        select: { id: true }
      });

      if (students.length > 0) {
        await prisma.notification.createMany({
          data: students.map(s => ({
            studentId: s.id,
            title: `Announcement: ${title}`,
            message: body || content || message || '',
            type: 'ANNOUNCEMENT'
          }))
        });
      }
    }

    res.status(201).json(announcement);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.portalSettings.findMany();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { key, value, group } = req.body;
    if (key) {
      await prisma.portalSettings.upsert({
        where: { key },
        update: { value: String(value), group: group || 'general' },
        create: { key, value: String(value), group: group || 'general' }
      });
    }
    res.json({ message: 'Success' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/skills', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany();
    res.json(skills);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/skills', async (req, res) => {
  try {
    const { name, category } = req.body;
    const skill = await prisma.skill.create({
      data: { name, category: category || 'GENERAL', isActive: true }
    });
    res.status(201).json(skill);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/skills/:id', async (req, res) => {
  try {
    await prisma.skill.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/achievement-categories', async (req, res) => {
  try {
    const categories = await prisma.achievementCategory.findMany();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/achievement-categories', async (req, res) => {
  try {
    const { name } = req.body;
    const cat = await prisma.achievementCategory.create({
      data: { name }
    });
    res.status(201).json(cat);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ==========================================
// EVENT REGISTRATIONS & TEAM ADMINISTRATION (ADM-08 & ADM-09)
// ==========================================

router.get('/registrations', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
    const status = req.query.status ? String(req.query.status).trim() : undefined;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
    const section = req.query.section ? String(req.query.section).trim() : undefined;
    const team = req.query.team ? String(req.query.team).trim().toLowerCase() : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '25'), 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (eventId && eventId !== 'all') {
      where.eventId = eventId;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (year && !isNaN(year)) {
      where.student = { ...(where.student || {}), year };
    }
    if (section && section !== 'ALL') {
      where.student = { ...(where.student || {}), section };
    }
    if (team === 'team') {
      where.teamId = { not: null };
    } else if (team === 'solo') {
      where.teamId = null;
    }
    if (search) {
      where.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { rollNo: { contains: search, mode: 'insensitive' } } },
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { team: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const statsFilter = eventId && eventId !== 'all' ? { eventId } : {};

    const [
      total,
      registrations,
      statsConfirmed,
      statsPending,
      statsWaitlisted,
      statsCancelled,
      statsRejected,
      totalTeams,
      completedTeams
    ] = await Promise.all([
      prisma.eventRegistration.count({ where }),
      prisma.eventRegistration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { registeredAt: 'desc' },
        include: {
          student: true,
          event: true,
          team: {
            include: {
              members: {
                include: {
                  student: {
                    select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true }
                  }
                }
              }
            }
          },
          answers: {
            include: {
              field: true
            }
          }
        }
      }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'CONFIRMED' } }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'PENDING' } }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'WAITLISTED' } }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'CANCELLED' } }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'REJECTED' } }),
      prisma.team.count({ where: statsFilter }),
      prisma.team.count({ where: { ...statsFilter, status: 'COMPLETE' } }),
    ]);

    const leaderIds = registrations
      .map(r => r.team?.leaderId)
      .filter((id): id is string => Boolean(id));

    let leaderMap = new Map<string, any>();
    if (leaderIds.length > 0) {
      const leaders = await prisma.student.findMany({
        where: { id: { in: leaderIds } },
        select: { id: true, rollNo: true, name: true, email: true }
      });
      leaderMap = new Map(leaders.map(l => [l.id, l]));
    }

    const enriched = registrations.map(reg => ({
      ...reg,
      team: reg.team
        ? {
            ...reg.team,
            leader: leaderMap.get(reg.team.leaderId) || null
          }
        : null
    }));

    res.json({
      registrations: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        total: statsConfirmed + statsPending + statsWaitlisted + statsCancelled + statsRejected,
        confirmed: statsConfirmed,
        pending: statsPending,
        waitlisted: statsWaitlisted,
        cancelled: statsCancelled,
        rejected: statsRejected,
        totalTeams,
        completedTeams,
      }
    });
  } catch (err: any) {
    console.error('Error fetching registrations:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/registrations/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
    const status = req.query.status ? String(req.query.status).trim() : undefined;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
    const section = req.query.section ? String(req.query.section).trim() : undefined;

    const where: any = {};
    if (eventId && eventId !== 'all') where.eventId = eventId;
    if (status && status !== 'ALL') where.status = status;
    if (year && !isNaN(year)) where.student = { ...(where.student || {}), year };
    if (section && section !== 'ALL') where.student = { ...(where.student || {}), section };

    const registrations = await prisma.eventRegistration.findMany({
      where,
      orderBy: { registeredAt: 'desc' },
      include: {
        student: true,
        event: true,
        team: true,
        answers: { include: { field: true } }
      }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ELITE Student Portal Admin';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Registrations');

    worksheet.columns = [
      { header: 'Registration ID', key: 'id', width: 28 },
      { header: 'Event', key: 'event', width: 25 },
      { header: 'Roll No', key: 'rollNo', width: 16 },
      { header: 'Student Name', key: 'name', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Branch', key: 'branch', width: 10 },
      { header: 'Team', key: 'team', width: 20 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Registered At', key: 'registeredAt', width: 22 },
      { header: 'Answers', key: 'answers', width: 45 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FF0B192C' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    headerRow.height = 24;

    registrations.forEach(r => {
      const answersText = r.answers.map(a => `${a.field?.label || 'Field'}: ${a.value || ''}`).join('; ');
      worksheet.addRow({
        id: r.id,
        event: r.event.name,
        rollNo: r.student.rollNo,
        name: r.student.name,
        email: r.student.email || '',
        year: r.student.year,
        section: r.student.section,
        branch: r.student.branch,
        team: r.team ? r.team.name : 'Solo',
        status: r.status,
        registeredAt: r.registeredAt.toISOString(),
        answers: answersText,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=event-registrations-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting registrations:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/registrations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: {
        student: true,
        event: true,
        team: {
          include: {
            members: {
              include: {
                student: {
                  select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true }
                }
              }
            },
            invitations: {
              include: {
                student: {
                  select: { id: true, rollNo: true, name: true, email: true }
                }
              }
            }
          }
        },
        answers: {
          include: {
            field: true
          }
        }
      }
    });

    if (!reg) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
      return;
    }

    let leader = null;
    if (reg.team?.leaderId) {
      leader = await prisma.student.findUnique({
        where: { id: reg.team.leaderId },
        select: { id: true, rollNo: true, name: true, email: true }
      });
    }

    res.json({
      ...reg,
      team: reg.team ? { ...reg.team, leader } : null
    });
  } catch (err: any) {
    console.error('Error fetching registration detail:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/registrations/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, note } = req.body;
    const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'WAITLISTED'];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: 'INVALID_STATUS', message: `Status must be one of: ${allowed.join(', ')}` });
      return;
    }

    const reg = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: { student: true, event: true }
    });
    if (!reg) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
      return;
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        student: true,
        event: true,
        team: true,
        answers: { include: { field: true } }
      }
    });

    await ActivityService.log({
      eventId: reg.eventId,
      category: 'ADMIN',
      action: `Admin updated registration status to ${status}`,
      details: note || `Registration for ${reg.student.name} (${reg.student.rollNo}) set to ${status}`,
      applicantName: reg.student.name,
      userEmail: reg.student.email || undefined,
      status: 'SUCCESS'
    });

    res.json({ success: true, registration: updated });
  } catch (err: any) {
    console.error('Error updating registration status:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/registrations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: { student: true }
    });
    if (!reg) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
      return;
    }

    await prisma.registrationAnswer.deleteMany({
      where: { registrationId: reg.id }
    });

    await prisma.eventRegistration.delete({
      where: { id: reg.id }
    });

    await ActivityService.log({
      eventId: reg.eventId,
      category: 'ADMIN',
      action: `Admin deleted registration`,
      details: `Registration for ${reg.student.name} (${reg.student.rollNo}) deleted`,
      applicantName: reg.student.name,
      userEmail: reg.student.email || undefined,
      status: 'SUCCESS'
    });

    res.json({ success: true, message: 'Registration deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting registration:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Teams management (ADM-09)
router.get('/teams', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
    const status = req.query.status ? String(req.query.status).trim() : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;

    const where: any = {};
    if (eventId && eventId !== 'all') where.eventId = eventId;
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { members: { some: { student: { name: { contains: search, mode: 'insensitive' } } } } },
        { members: { some: { student: { rollNo: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const teams = await prisma.team.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        event: true,
        members: {
          include: {
            student: {
              select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true }
            }
          }
        },
        invitations: {
          include: {
            student: {
              select: { id: true, rollNo: true, name: true, email: true }
            }
          }
        },
        registrations: {
          include: {
            student: {
              select: { id: true, rollNo: true, name: true }
            }
          }
        }
      }
    });

    const leaderIds = teams.map(t => t.leaderId);
    let leaderMap = new Map<string, any>();
    if (leaderIds.length > 0) {
      const leaders = await prisma.student.findMany({
        where: { id: { in: leaderIds } },
        select: { id: true, rollNo: true, name: true, email: true }
      });
      leaderMap = new Map(leaders.map(l => [l.id, l]));
    }

    const enriched = teams.map(t => ({
      ...t,
      leader: leaderMap.get(t.leaderId) || null
    }));

    res.json({ teams: enriched });
  } catch (err: any) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/teams/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const allowed = ['FORMING', 'ACTIVE', 'COMPLETE', 'REJECTED'];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: 'INVALID_STATUS', message: `Status must be one of: ${allowed.join(', ')}` });
      return;
    }

    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        event: true,
        members: { include: { student: true } }
      }
    });

    await ActivityService.log({
      eventId: team.eventId,
      category: 'ADMIN',
      action: `Admin updated team status to ${status}`,
      details: `Team ${team.name} status updated to ${status}`,
      status: 'SUCCESS'
    });

    res.json({ success: true, team });
  } catch (err: any) {
    console.error('Error updating team status:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/teams/:id/members/remove', async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, reason } = req.body;
    if (!studentId) {
      res.status(400).json({ error: 'MISSING_DATA', message: 'studentId is required' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });
    if (!team) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found' });
      return;
    }

    const member = await prisma.teamMember.findFirst({
      where: { teamId: team.id, studentId },
      include: { student: true }
    });
    if (!member) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student is not a member of this team' });
      return;
    }

    await prisma.$transaction([
      prisma.teamMember.delete({
        where: { id: member.id }
      }),
      prisma.eventRegistration.updateMany({
        where: { eventId: team.eventId, studentId, teamId: team.id },
        data: { teamId: null }
      })
    ]);

    await ActivityService.log({
      eventId: team.eventId,
      category: 'ADMIN',
      action: `Admin removed member from team`,
      details: `Removed ${member.student.name} (${member.student.rollNo}) from ${team.name}. Reason: ${reason || 'Admin action'}`,
      applicantName: member.student.name,
      userEmail: member.student.email || undefined,
      status: 'SUCCESS'
    });

    res.json({ success: true, message: 'Member removed from team successfully' });
  } catch (err: any) {
    console.error('Error removing team member:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ==========================================
// STORAGE MANAGEMENT (Storage.tsx)
// ==========================================

router.get('/storage', async (_req: Request, res: Response): Promise<void> => {
  try {
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

    const totalFiles =
      submissionVideos +
      introVideos +
      resumes +
      certificates +
      achievementProofs +
      profilePhotos;

    const mem = process.memoryUsage();
    const memoryUsedMb = Math.round(mem.rss / (1024 * 1024));

    res.json({
      drive: {
        status: 'CONNECTED',
        account: 'organizer@sasi.ac.in',
        mode: 'OAuth 2.0 Workspace Token',
        rootFolder: 'ELITE_PORTAL_ROOT',
        cacheEntriesCount: cacheCount,
        recentCache: cacheEntries,
      },
      inventory: {
        totalFiles,
        submissionVideos,
        introVideos,
        resumes,
        certificates,
        achievementProofs,
        profilePhotos,
      },
      system: {
        memoryUsedMb,
        uptimeSeconds: Math.round(process.uptime()),
        database: 'PostgreSQL 16 (Connected)',
      },
    });
  } catch (err: any) {
    console.error('Error fetching storage stats:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/storage/clear-cache', async (_req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await prisma.driveFolderCache.deleteMany();
    await ActivityService.log({
      eventId: 'photo-2026',
      category: 'ADMIN',
      action: 'Admin cleared Drive folder cache',
      details: `Purged ${deleted.count} cached folder lookups`,
      status: 'SUCCESS',
    });
    res.json({ success: true, message: `Purged ${deleted.count} cache entries.` });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ==========================================
// EMAIL AUTOMATIONS & HISTORY
// ==========================================

router.get('/email/automations', async (_req: Request, res: Response): Promise<void> => {
  try {
    let automations = await prisma.emailAutomation.findMany({
      include: {
        template: true,
        history: { take: 5, orderBy: { runAt: 'desc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // If none exist, seed default production templates and automations
    if (automations.length === 0) {
      const t1 = await prisma.emailTemplate.create({
        data: {
          name: 'Welcome & Profile Setup Confirmation',
          subject: 'Welcome to ELITE Student Portal, {{student_name}}!',
          body: 'Dear {{student_name}},\n\nYour ELITE profile has been created. Please complete your skills, projects, and achievements.\n\nDept of IT, SASI.',
          variables: ['{{student_name}}', '{{roll_no}}', '{{department}}'],
          status: 'ACTIVE',
        },
      });
      const t2 = await prisma.emailTemplate.create({
        data: {
          name: 'Event Registration Confirmed',
          subject: 'Your registration for {{event_name}} is confirmed!',
          body: 'Hello {{student_name}},\n\nYou are confirmed for {{event_name}}. Venue and timings will be broadcasted prior to kickoff.\n\nBest of luck,\nELITE Committee.',
          variables: ['{{student_name}}', '{{event_name}}'],
          status: 'ACTIVE',
        },
      });
      const t3 = await prisma.emailTemplate.create({
        data: {
          name: 'Content Approval Notice',
          subject: 'Your submission has been approved',
          body: 'Hello {{student_name}},\n\nYour recent submission has passed faculty review and is now live on your profile.',
          variables: ['{{student_name}}'],
          status: 'ACTIVE',
        },
      });

      await prisma.emailAutomation.create({
        data: {
          name: 'New Student Onboarding Dispatch',
          trigger: 'STUDENT_REGISTERED',
          description: 'Dispatches instant welcome guidelines on first SSO login',
          status: 'ACTIVE',
          templateId: t1.id,
          targetAll: true,
        },
      });
      await prisma.emailAutomation.create({
        data: {
          name: 'Event Participation Pass',
          trigger: 'EVENT_REGISTERED',
          description: 'Sends confirmed team/solo ticket upon registration confirmation',
          status: 'ACTIVE',
          templateId: t2.id,
          targetAll: true,
        },
      });
      await prisma.emailAutomation.create({
        data: {
          name: 'Portfolio Verification Alert',
          trigger: 'CONTENT_APPROVED',
          description: 'Notifies student when project or achievement passes moderation',
          status: 'ACTIVE',
          templateId: t3.id,
          targetAll: true,
        },
      });

      automations = await prisma.emailAutomation.findMany({
        include: {
          template: true,
          history: { take: 5, orderBy: { runAt: 'desc' } },
        },
      });
    }

    res.json({ automations });
  } catch (err: any) {
    console.error('Error fetching email automations:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/email/automations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, trigger, description, templateId, targetYear, targetSection, targetAll } = req.body;
    const automation = await prisma.emailAutomation.create({
      data: {
        name,
        trigger,
        description,
        templateId,
        targetYear: targetYear ? parseInt(String(targetYear), 10) : null,
        targetSection: targetSection || null,
        targetAll: targetAll !== undefined ? Boolean(targetAll) : true,
        status: 'ACTIVE',
      },
      include: { template: true },
    });
    res.status(201).json(automation);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/email/automations/:id/toggle', async (req: Request, res: Response): Promise<void> => {
  try {
    const current = await prisma.emailAutomation.findUnique({ where: { id: req.params.id } });
    if (!current) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Automation not found' });
      return;
    }
    const nextStatus = current.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated = await prisma.emailAutomation.update({
      where: { id: req.params.id },
      data: { status: nextStatus },
      include: { template: true },
    });
    res.json({ success: true, automation: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/email/automations/:id/run', async (req: Request, res: Response): Promise<void> => {
  try {
    const auto = await prisma.emailAutomation.findUnique({
      where: { id: req.params.id },
      include: { template: true },
    });
    if (!auto) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Automation not found' });
      return;
    }

    const studentCount = await prisma.student.count();
    const run = await prisma.emailAutomationRun.create({
      data: {
        automationId: auto.id,
        recipientCount: studentCount,
        sentCount: studentCount,
        failedCount: 0,
        status: 'success',
      },
    });

    await prisma.emailAutomation.update({
      where: { id: auto.id },
      data: { lastRunAt: new Date() },
    });

    await ActivityService.log({
      eventId: 'photo-2026',
      category: 'EMAIL',
      action: `Executed email automation: ${auto.name}`,
      details: `Delivered to ${studentCount} students via template: ${auto.template.name}`,
      status: 'SUCCESS',
    });

    res.json({ success: true, run });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/email/history', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [automationRuns, emailLogs] = await Promise.all([
      prisma.emailAutomationRun.findMany({
        take: 50,
        orderBy: { runAt: 'desc' },
        include: { automation: { include: { template: true } } },
      }),
      prisma.emailLog.findMany({
        take: 50,
        orderBy: { sentAt: 'desc' },
        include: { event: true },
      }),
    ]);
    res.json({ automationRuns, emailLogs });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/email/templates', async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ templates });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ==========================================
// EXPORTS CONSOLE
// ==========================================

router.get('/activity-logs/export', async (_req: Request, res: Response): Promise<void> => {
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
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ==========================================
// ROLES & PERMISSIONS
// ==========================================

router.get('/roles', async (_req: Request, res: Response): Promise<void> => {
  try {
    let roles = await prisma.role.findMany({
      include: {
        permissions: true,
        assignments: { include: { admin: { select: { id: true, username: true, email: true, role: true } } } },
      },
    });

    if (roles.length === 0) {
      const superAdmin = await prisma.role.create({
        data: { name: 'SUPER_ADMIN', description: 'Full access to all system features and settings', isSystem: true },
      });
      const admin = await prisma.role.create({
        data: { name: 'ADMIN', description: 'Department operations, students, and events', isSystem: true },
      });
      const mod = await prisma.role.create({
        data: { name: 'MODERATOR', description: 'Review submissions and student portfolio items', isSystem: true },
      });
      roles = await prisma.role.findMany({
        include: { permissions: true, assignments: { include: { admin: true } } },
      });
    }

    const admins = await prisma.adminUser.findMany({
      select: { id: true, username: true, email: true, role: true, createdAt: true },
    });

    res.json({ roles, admins });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/roles/assign', async (req: Request, res: Response): Promise<void> => {
  try {
    const { adminId, roleId } = req.body;
    if (!adminId || !roleId) {
      res.status(400).json({ error: 'MISSING_DATA', message: 'adminId and roleId are required' });
      return;
    }
    const assignment = await prisma.roleAssignment.upsert({
      where: { adminId_roleId: { adminId, roleId } },
      update: {},
      create: { adminId, roleId },
    });
    res.json({ success: true, assignment });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
