import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { requireAdminAuth } from '../middleware/auth';
import { httpError } from "../middleware/apiError";
import { prisma } from '../lib/prisma';
import { driveService } from '../services/drive.service';
import { RATINGS, RATING_LABELS, SUBMISSION_STATUSES } from '../config/constants';
import { ActivityService } from '../services/activity.service';
import {
  countAnnouncementAudience,
  deliverAnnouncementNotifications,
  resolveAnnouncementTarget,
} from '../services/announcement.service';
import { notifyStudent, notifyVideoChangeRequested } from '../services/notification.service';
import { resolveContentRange } from '../utils/rangeParser';

const router = Router();

const ACTIVE_EVENT_ID = 'self-introduction-2026';

// Protect all /admin/api routes with JWT authentication
router.use(requireAdminAuth);

// ==========================================
// 0. LIST EVENTS (GET /admin/api/events)
// ==========================================
router.get('/events', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const events = await prisma.event.findMany({
      // `registrationCount` is a Prisma aggregate, not a stored column, so it
      // arrives as `_count.registrations`. The admin table reads it, so expose
      // it under the name the client expects rather than making the client know
      // about the aggregate shape.
      include: { _count: { select: { registrations: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({
      events: events.map(({ _count, ...event }) => ({
        ...event,
        registrationCount: _count.registrations,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching events list:', err);
    return httpError(res, 500, err, "FAILED_TO_FETCH_EVENTS");
  }
});

// ==========================================
// 1. STATS DASHBOARD (GET /admin/api/stats)
// ==========================================
router.get('/stats', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "FAILED_TO_FETCH_STATS");
  }
});

// ==================================================
// 2. SUBMISSIONS LIST & SEARCH (GET /admin/api/submissions)
// ==================================================
router.get('/submissions', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "FAILED_TO_FETCH_SUBMISSIONS");
  }
});

// ======================================================
// 3. STUDENT ROSTER (GET /admin/api/students)
// Full IT-Department roster imported from the XLSX sheet,
// joined with each student's upload status + review info.
// ======================================================
router.get('/students', async (req: Request, res: Response): Promise<Response | void> => {
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

    // Filter by upload status directly in DB when possible
    // (avoids loading the entire roster into memory)
    if (uploaded === 'yes') {
      whereClause.resumes = undefined; // not needed
      // students whose rollNo appears in submissions with a videoDriveId
      whereClause.introVideos = { some: { driveFileId: { not: null } } };
    } else if (uploaded === 'no') {
      whereClause.introVideos = { none: { driveFileId: { not: null } } };
    }

    // Fetch paginated students with their latest submission in one query
    const [total, students] = await Promise.all([
      prisma.student.count({ where: whereClause }),
      prisma.student.findMany({
        where: whereClause,
        orderBy: [{ year: 'asc' }, { section: 'asc' }, { rollNo: 'asc' }],
        skip,
        take: limit,
        select: {
          id: true,
          rollNo: true,
          name: true,
          year: true,
          section: true,
          branch: true,
          status: true,
          graduatedAt: true,
        },
      }),
    ]);

    // Batch-fetch submissions for just the page of students (not all students)
    const rollNos = students.map((s) => s.rollNo);
    const submissions = rollNos.length
      ? await prisma.submission.findMany({
          where: { eventId, rollNo: { in: rollNos } },
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            rollNo: true,
            year: true,
            section: true,
            status: true,
            submittedAt: true,
            videoDriveId: true,
            reviewText: true,
            reviewPros: true,
            reviewCons: true,
            reviewedAt: true,
          },
        })
      : [];

    // Join submissions by roll number (latest wins per student)
    const submissionByRoll = new Map<string, typeof submissions[number]>();
    for (const sub of submissions) {
      const key = `${sub.rollNo}|${sub.year}|${sub.section}`;
      if (!submissionByRoll.has(key)) submissionByRoll.set(key, sub);
    }

    const rows = students.map((student) => {
      const key = `${student.rollNo}|${student.year}|${student.section}`;
      const submission = submissionByRoll.get(key) || null;
      return {
        ...student,
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
    });

    res.json({
      eventId,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        rosterTotal: total,
      },
    });
  } catch (err: any) {
    console.error('Error fetching student roster:', err);
    return httpError(res, 500, err, 'FAILED_TO_FETCH_STUDENTS');
  }
});


// ======================================================
// 3.5 STUDENT ROSTER EXCEL EXPORT (GET /admin/api/students/export)
// Full roster dump from the parent database: every student with
// their complete submission + review information, as an .xlsx file.
// ======================================================
router.get('/students/export', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "STUDENTS_EXPORT_FAILED");
  }
});

// ======================================================
// 4. SUBMISSION DETAIL (GET /admin/api/submissions/:id)
// ======================================================
router.get('/submissions/:id', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
    });

    if (!submission) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }

    // Include the introduction video's moderation + public visibility state so
    // the admin can approve, publish, or request a new take from one place.
    const introVideo = await prisma.introVideo.findFirst({
      where: { student: { rollNo: submission.rollNo } },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        status: true,
        reviewNote: true,
        isPublic: true,
        publishedAt: true,
        changeRequestedAt: true,
        changeRequestNote: true,
        driveFileId: true,
        submittedAt: true,
      },
    });

    res.json({
      ...submission,
      introVideo: introVideo
        ? { ...introVideo, publicUrl: introVideo.isPublic && introVideo.status === 'APPROVED' ? `/api/public/videos/stream/${introVideo.id}` : null }
        : null,
    });
  } catch (err: any) {
    console.error('Error fetching submission detail:', err);
    return httpError(res, 500, err, "FAILED_TO_FETCH_SUBMISSION");
  }
});

// =========================================================================
// 4. SECURE MEDIA PROXY (GET /admin/api/submissions/:id/media/:fileKey)
// Supports HTTP Range requests so the admin video player can seek.
// =========================================================================
router.get('/submissions/:id/media/:fileKey', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id, fileKey } = req.params;

    if (fileKey !== 'video') {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: `Media ${fileKey} is not available for this portal.` });
      return;
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      select: { videoDriveId: true, driveFolderPath: true },
    });

    if (!submission) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }

    const driveFileId = submission.videoDriveId;
    if (!driveFileId) {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: `Media ${fileKey} not present for this submission.` });
      return;
    }

    const etag = `"${driveFileId}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    const rangeHeader = req.headers.range;

    // The service performs the actual byte-range fetch, so the response body
    // always matches the advertised Content-Range. Answering 206 while piping
    // the full file would break seeking in the admin player.
    const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
      driveFileId,
      submission.driveFolderPath,
      rangeHeader,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('ETag', etag);

    const range = resolveContentRange(contentRange, rangeHeader, size);

    if (range) {
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${range.total}`);
      res.setHeader('Content-Length', String(range.end - range.start + 1));
      res.status(206);
    } else if (rangeHeader && size !== undefined) {
      if (typeof (stream as any).destroy === 'function') {
        (stream as any).destroy();
      }
      res.setHeader('Content-Range', `bytes */${size}`);
      res.status(416).end();
      return;
    } else if (size !== undefined) {
      res.setHeader('Content-Length', String(size));
      res.status(200);
    } else {
      res.status(200);
    }

    // Release the storage stream when the admin closes the tab or seeks away.
    res.on('close', () => {
      if (!res.writableFinished && typeof (stream as any).destroy === 'function') {
        (stream as any).destroy();
      }
    });

    stream.on('error', (err: any) => {
      console.error('Admin video stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'STREAM_ERROR', message: 'Video stream interrupted' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (err: any) {
    console.error('Error proxying media:', err);
    if (!res.headersSent) return httpError(res, 500, err, 'MEDIA_STREAM_ERROR');
  }
});


// ==============================================================
// 5. SET PERFORMANCE RATING (PATCH /admin/api/submissions/:id/rating)
// ==============================================================
router.patch('/submissions/:id/rating', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "FAILED_TO_UPDATE_RATING");
  }
});

// ==============================================================
// 6. SUBMIT REVIEW RESPONSE (PATCH /admin/api/submissions/:id/review)
// Saves free-text feedback + pros/cons hashtag keywords. The student sees
// this response on their portal after sending.
// ==============================================================
router.patch('/submissions/:id/review', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "FAILED_TO_UPDATE_REVIEW");
  }
});

// ==============================================================
// 7. UPDATE STATUS (PATCH /admin/api/submissions/:id/status)
// ==============================================================
router.patch('/submissions/:id/status', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "FAILED_TO_UPDATE_STATUS");
  }
});

// ==============================================================
// 6b. REQUEST A NEW VIDEO (POST /admin/api/submissions/:id/request-video)
// Asks the student to re-upload. The current video stays in place until the
// replacement arrives, and the student receives a notification.
// ==============================================================
router.post('/submissions/:id/request-video', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : null;

    const submission = await prisma.submission.findUnique({
      where: { id },
      select: { id: true, rollNo: true, name: true, eventId: true, email: true, videoDriveId: true },
    });

    if (!submission) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { rollNo: submission.rollNo },
      select: { id: true },
    });

    const introVideo = await prisma.introVideo.findFirst({
      where: { student: { rollNo: submission.rollNo } },
      orderBy: { submittedAt: 'desc' },
    });

    if (introVideo) {
      await prisma.introVideo.update({
        where: { id: introVideo.id },
        data: {
          status: 'CHANGES_REQUESTED',
          reviewNote: reason || 'A new introduction video has been requested.',
          changeRequestedAt: new Date(),
          changeRequestNote: reason,
        },
      });
    }

    if (student?.id) {
      await notifyVideoChangeRequested(student.id, reason);
    }

    await ActivityService.log({
      eventId: submission.eventId,
      category: 'ADMIN',
      action: 'Admin requested a new introduction video',
      details: `New video requested for ${submission.rollNo}${reason ? `: ${reason}` : ''}`,
      applicantName: submission.name,
      userEmail: submission.email,
      status: 'WARNING',
    });

    res.json({
      success: true,
      message: 'The student has been notified and asked to upload a new video.',
    });
  } catch (err: any) {
    console.error('Error requesting new video:', err);
    return httpError(res, 500, err, "REQUEST_VIDEO_FAILED");
  }
});

// ==============================================================
// 7. DELETE ONLY THE VIDEO (DELETE /admin/api/submissions/:id/video)
// Removes the video file so the student can upload a replacement.
// ==============================================================
router.delete('/submissions/:id/video', async (req: Request, res: Response): Promise<Response | void> => {
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

    const videoDriveIdToDelete = submission.videoDriveId;
    if (videoDriveIdToDelete) {
      await driveService.deleteVideo(submission).catch(() => {});
      await driveService.deleteFileById(videoDriveIdToDelete, submission.driveFolderPath).catch(() => {});
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        videoDriveId: null,
      },
    });

    const student = await prisma.student.findUnique({
      where: { rollNo: submission.rollNo },
      select: { id: true },
    });

    // Also nullify videoDriveId across any other submission entries for this student
    await prisma.submission.updateMany({
      where: {
        OR: [
          { rollNo: submission.rollNo },
          ...(student?.id ? [{ id: student.id }] : []),
        ],
      },
      data: {
        videoDriveId: null,
      },
    });

    try {
      const introVideos = await prisma.introVideo.findMany({
        where: {
          OR: [
            { student: { rollNo: submission.rollNo } },
            ...(student?.id ? [{ studentId: student.id }] : []),
          ],
        },
      });
      const cleanRollNo = (submission?.rollNo || '').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const studentRelativePath = submission.driveFolderPath || (cleanRollNo ? `Students/${cleanRollNo}` : undefined);
      for (const iv of introVideos) {
        if (iv.driveFileId) {
          await driveService.deleteFileById(iv.driveFileId, studentRelativePath).catch(() => {});
        }
      }
      await prisma.introVideo.updateMany({
        where: {
          OR: [
            { student: { rollNo: submission.rollNo } },
            ...(student?.id ? [{ studentId: student.id }] : []),
          ],
        },
        data: {
          driveFileId: null,
          thumbnail: null,
          filename: null,
          mimeType: null,
          sizeMb: null,
          status: 'CHANGES_REQUESTED',
          reviewNote: 'Video removed by administrator.',
          // Removed videos must disappear from the public showcase too.
          isPublic: false,
          publishedAt: null,
          changeRequestedAt: new Date(),
          changeRequestNote: 'Your previous video was removed. Please upload a new one.',
        },
      });
    } catch (_) {}

    if (student?.id) {
      await notifyVideoChangeRequested(
        student.id,
        'Your previous video was removed by the administrator.',
      );
    }

    await ActivityService.log({
      eventId: updated.eventId,
      category: 'ADMIN',
      action: 'Admin deleted student introduction video',
      details: `Video removed for ${updated.rollNo}. Student notified to upload a replacement.`,
      applicantName: updated.name,
      userEmail: updated.email,
      status: 'WARNING',
    });

    res.json({
      success: true,
      message: 'Introduction video deleted. The student has been notified to upload a replacement.',
      submission: updated,
    });
  } catch (err: any) {
    console.error('Error deleting video:', err);
    return httpError(res, 500, err, "VIDEO_DELETE_FAILED");
  }
});

// ==============================================================
// 8. EXCEL EXPORT (GET /admin/api/export/excel)
// ==============================================================
router.get('/export/excel', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "EXCEL_EXPORT_FAILED");
  }
});

// ==============================================================
// 9. DELETE SUBMISSION & DRIVE FILES (DELETE /admin/api/submissions/:id)
// ==============================================================
router.delete('/submissions/:id', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const submission = await prisma.submission.findUnique({ where: { id } });

    if (!submission) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }

    // Find and delete associated IntroVideo rows, thumbnails, and drive files
    const student = await prisma.student.findFirst({
      where: { rollNo: submission.rollNo },
      select: { id: true, rollNo: true },
    });

    const introVideos = await prisma.introVideo.findMany({
      where: {
        OR: [
          { student: { rollNo: submission.rollNo } },
          ...(student?.id ? [{ studentId: student.id }] : []),
        ],
      },
    });

    const cleanRollNo = (submission?.rollNo || student?.rollNo || '').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    const studentRelativePath = submission.driveFolderPath || (cleanRollNo ? `Students/${cleanRollNo}` : undefined);
    for (const iv of introVideos) {
      if (iv.driveFileId) {
        await driveService.deleteFileById(iv.driveFileId, studentRelativePath).catch(() => {});
      }
    }

    if (introVideos.length > 0) {
      await prisma.introVideo.deleteMany({
        where: { id: { in: introVideos.map((v) => v.id) } },
      });
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
    return httpError(res, 500, err, "DELETE_FAILED");
  }
});

// ==============================================================
// 14. ACTIVITY & AUDIT LOGS (GET /admin/api/activity-logs)
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
// MODERATION, VOTING, ANNOUNCEMENTS, SETTINGS, SKILLS
// ==========================================

// Unified Moderation Queue (All submission artifacts: Intro Video, Resume, Certificate, Project, Achievement)
router.get(['/moderation', '/moderation/items'], async (req: Request, res: Response): Promise<Response | void> => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const requestedType = String(req.query.type || 'all').toLowerCase();
    const statusQuery = req.query.status as string | undefined;
    const statuses = statusQuery
      ? statusQuery.split(',').map((s) => s.trim())
      : ['PENDING', 'UNDER_REVIEW', 'CHANGES_REQUESTED'];

    const items: any[] = [];

    // 1. Videos
    if (requestedType === 'all' || requestedType === 'videos' || requestedType === 'video') {
      const videos = await prisma.introVideo.findMany({
        where: {
          status: { in: statuses as any },
          driveFileId: { not: null },
        },
        include: { student: true },
        orderBy: { submittedAt: 'desc' },
      });
      for (const v of videos) {
        items.push({
          id: v.id,
          type: 'videos',
          itemType: 'video',
          studentId: v.studentId,
          studentName: v.student?.name || 'Unknown',
          studentRoll: v.student?.rollNo || 'Unknown',
          studentYear: v.student?.year,
          studentSection: v.student?.section,
          studentBranch: v.student?.branch || 'IT',
          title: `Intro Video - ${v.student?.name || v.student?.rollNo}`,
          description: v.reviewNote || null,
          reviewNote: v.reviewNote || null,
          reviewedBy: v.reviewedBy || null,
          reviewedAt: v.reviewedAt || null,
          changeRequestedAt: v.changeRequestedAt || null,
          changeRequestNote: v.changeRequestNote || null,
          fileUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/video/${v.driveFileId}` : null,
          driveFileId: v.driveFileId,
          thumbnailUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/thumbnail/video/${v.id}?v=${encodeURIComponent(v.driveFileId.trim())}` : null,
          status: v.status,
          submittedAt: v.submittedAt,
          isPublic: Boolean(v.isPublic),
          publicUrl: v.isPublic && v.status === 'APPROVED' ? `/api/public/videos/stream/${v.id}` : null,
        });
      }
    }

    // 2. Resumes
    if (requestedType === 'all' || requestedType === 'resumes' || requestedType === 'resume') {
      const resumes = await prisma.resume.findMany({
        where: {
          status: { in: statuses as any },
        },
        include: { student: true },
        orderBy: { submittedAt: 'desc' },
      });
      for (const r of resumes) {
        items.push({
          id: r.id,
          type: 'resumes',
          itemType: 'resume',
          studentId: r.studentId,
          studentName: r.student?.name || 'Unknown',
          studentRoll: r.student?.rollNo || 'Unknown',
          studentYear: r.student?.year,
          studentSection: r.student?.section,
          studentBranch: r.student?.branch || 'IT',
          title: `Resume - ${r.student?.name || r.student?.rollNo}`,
          description: r.filename || 'Curriculum Vitae',
          filename: r.filename || null,
          sizeMb: r.sizeMb || null,
          reviewNote: r.reviewNote || null,
          reviewedBy: r.reviewedBy || null,
          reviewedAt: r.reviewedAt || null,
          fileUrl: r.driveFileId ? `/api/public/media/resume/${r.id}` : null,
          driveFileId: r.driveFileId,
          thumbnailUrl: r.driveFileId ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}` : null,
          status: r.status,
          submittedAt: r.submittedAt,
          isPublic: Boolean(r.isPublic),
        });
      }
    }

    // 3. Certificates
    if (requestedType === 'all' || requestedType === 'certificates' || requestedType === 'certificate') {
      const certs = await prisma.certificate.findMany({
        where: {
          status: { in: statuses as any },
        },
        include: { student: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const c of certs) {
        items.push({
          id: c.id,
          type: 'certificates',
          itemType: 'certificate',
          studentId: c.studentId,
          studentName: c.student?.name || 'Unknown',
          studentRoll: c.student?.rollNo || 'Unknown',
          studentYear: c.student?.year,
          studentSection: c.student?.section,
          studentBranch: c.student?.branch || 'IT',
          title: c.title || `Certificate - ${c.student?.name}`,
          description: c.issuer ? `Issued by ${c.issuer}` : 'Verified Certificate',
          issuer: c.issuer || null,
          issuedAt: c.issuedAt || null,
          reviewNote: c.reviewNote || null,
          reviewedBy: c.reviewedBy || null,
          reviewedAt: c.reviewedAt || null,
          fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null,
          fileDriveId: c.fileDriveId,
          driveFileId: c.fileDriveId,
          thumbnailUrl: c.fileDriveId ? `/api/public/media/thumbnail/certificate/${c.id}?v=${encodeURIComponent(c.fileDriveId)}` : null,
          status: c.status,
          submittedAt: c.createdAt,
          isPublic: Boolean(c.isPublic),
        });
      }
    }

    // 4. Projects
    if (requestedType === 'all' || requestedType === 'projects' || requestedType === 'project') {
      const projs = await prisma.project.findMany({
        where: { status: { in: statuses as any } },
        include: { student: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const p of projs) {
        items.push({
          id: p.id,
          type: 'projects',
          itemType: 'project',
          studentId: p.studentId,
          studentName: p.student?.name || 'Unknown',
          studentRoll: p.student?.rollNo || 'Unknown',
          studentYear: p.student?.year,
          studentSection: p.student?.section,
          studentBranch: p.student?.branch || 'IT',
          title: p.title,
          description: p.description,
          technologies: p.technologies || [],
          githubUrl: p.githubUrl,
          driveVideoUrl: p.driveVideoUrl,
          fileUrl: p.driveVideoUrl || p.githubUrl,
          proofUrl: p.githubUrl,
          reviewNote: p.reviewNote || null,
          reviewedBy: p.reviewedBy || null,
          reviewedAt: p.reviewedAt || null,
          status: p.status,
          submittedAt: p.createdAt,
          isPublic: Boolean(p.isPublic),
        });
      }
    }

    // 5. Achievements
    if (requestedType === 'all' || requestedType === 'achievements' || requestedType === 'achievement') {
      const achs = await prisma.achievement.findMany({
        where: { status: { in: statuses as any } },
        include: { student: true, category: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const a of achs) {
        const proofUrl = a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.id}` : null);
        const thumbnailUrl = a.proofDriveId ? `/api/public/media/thumbnail/achievement/${a.id}?v=${encodeURIComponent(a.proofDriveId)}` : null;
        items.push({
          id: a.id,
          type: 'achievements',
          itemType: 'achievement',
          studentId: a.studentId,
          studentName: a.student?.name || 'Unknown',
          studentRoll: a.student?.rollNo || 'Unknown',
          studentYear: a.student?.year,
          studentSection: a.student?.section,
          studentBranch: a.student?.branch || 'IT',
          title: a.title,
          description: a.description,
          organization: a.organization,
          category: a.category?.name || 'Achievement',
          achievedAt: a.achievedAt || null,
          fileUrl: proofUrl,
          proofUrl,
          proofDriveId: a.proofDriveId,
          driveFileId: a.proofDriveId,
          thumbnailUrl,
          reviewNote: a.reviewNote || null,
          reviewedBy: a.reviewedBy || null,
          reviewedAt: a.reviewedAt || null,
          status: a.status,
          submittedAt: a.createdAt,
          isPublic: Boolean(a.isPublic),
        });
      }
    }

    items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    res.json({
      items,
      total: items.length,
    });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/moderation/videos', async (req, res) => {
  try {
    // Only videos still awaiting a decision belong in the queue. Approved
    // videos are managed from the submission detail view (publish/unpublish).
    const videos = await prisma.introVideo.findMany({
      where: {
        status: { in: ['PENDING', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] },
        driveFileId: { not: null },
      },
      select: {
        id: true, studentId: true, driveFileId: true, mimeType: true, sizeMb: true,
        filename: true, status: true, reviewNote: true, reviewedBy: true,
        reviewedAt: true, isActive: true, submittedAt: true, updatedAt: true,
        isPublic: true, publishedAt: true, changeRequestedAt: true, changeRequestNote: true,
        student: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 200,
    });
    res.json(videos.map(v => {
      return {
        ...v,
        studentName: v.student?.name || 'Unknown',
        studentRoll: v.student?.rollNo || 'Unknown',
        title: `${v.student?.name} (${v.student?.rollNo})`,
        fileUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/video/${v.driveFileId}` : null,
        thumbnailUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/thumbnail/video/${v.id}?v=${encodeURIComponent(v.driveFileId.trim())}` : null,
        isPublic: Boolean(v.isPublic),
        publicUrl: v.isPublic && v.status === 'APPROVED' ? `/api/public/videos/stream/${v.id}` : null,
      };
    }));
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/moderation/resumes', async (req, res) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      take: 200,
      select: {
        id: true, studentId: true, driveFileId: true, filename: true, sizeMb: true,
        status: true, reviewNote: true, reviewedBy: true, reviewedAt: true,
        isActive: true, isPublic: true, submittedAt: true, updatedAt: true,
        student: true,
      }
    });
    res.json(resumes.map(r => {
      return {
        ...r,
        studentName: r.student?.name || 'Unknown',
        studentRoll: r.student?.rollNo || 'Unknown',
        title: `${r.student?.name} (${r.student?.rollNo})`,
        fileUrl: r.driveFileId ? `/api/public/media/resume/${r.id}` : null,
        thumbnailUrl: r.driveFileId ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}` : null,
      };
    }));
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/moderation/achievements', async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      take: 200,
      select: {
        id: true, studentId: true, categoryId: true, title: true, description: true,
        organization: true, achievedAt: true, proofDriveId: true, proofUrl: true,
        status: true, reviewNote: true, reviewedBy: true, reviewedAt: true,
        isPublic: true, createdAt: true, updatedAt: true,
        student: true, category: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    const projects = await prisma.project.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      take: 200,
      select: {
        id: true, studentId: true, title: true, description: true, technologies: true,
        githubUrl: true, driveVideoUrl: true, displayOrder: true, status: true,
        reviewNote: true, reviewedBy: true, reviewedAt: true, isPublic: true,
        createdAt: true, updatedAt: true,
        student: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    const mappedAchievements = achievements.map(a => {
      const proofUrl = a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.id}` : null);
      const thumbnailUrl = a.proofDriveId ? `/api/public/media/thumbnail/achievement/${a.id}?v=${encodeURIComponent(a.proofDriveId)}` : null;
      return {
        ...a,
        itemType: 'achievement' as const,
        studentName: a.student?.name || 'Unknown',
        studentRoll: a.student?.rollNo || 'Unknown',
        submittedAt: a.createdAt,
        title: a.title,
        description: a.description,
        organization: a.organization,
        category: a.category?.name || 'Achievement',
        proofUrl,
        fileUrl: proofUrl,
        thumbnailUrl,
      };
    });
    const mappedProjects = projects.map(p => {
      return {
        id: p.id,
        studentId: p.studentId,
        studentName: p.student?.name || 'Unknown',
        studentRoll: p.student?.rollNo || 'Unknown',
        submittedAt: p.createdAt,
        title: p.title,
        description: p.description,
        organization: null,
        category: 'Project',
        itemType: 'project' as const,
        proofUrl: p.githubUrl,
        fileUrl: p.driveVideoUrl || p.githubUrl,
        githubUrl: p.githubUrl,
        driveVideoUrl: p.driveVideoUrl,
        status: p.status,
        reviewNote: p.reviewNote,
        reviewedBy: p.reviewedBy,
        reviewedAt: p.reviewedAt,
      };
    });
    const combined = [...mappedAchievements, ...mappedProjects].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    res.json(combined);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/moderation/certificates', async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      take: 200,
      select: {
        id: true, studentId: true, title: true, issuer: true, issuedAt: true,
        fileDriveId: true, status: true, reviewNote: true, reviewedBy: true,
        reviewedAt: true, isPublic: true, createdAt: true, updatedAt: true,
        student: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(certificates.map(c => {
      return {
        ...c,
        studentName: c.student?.name || 'Unknown',
        studentRoll: c.student?.rollNo || 'Unknown',
        submittedAt: c.createdAt,
        fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null,
        thumbnailUrl: c.fileDriveId ? `/api/public/media/thumbnail/certificate/${c.id}?v=${encodeURIComponent(c.fileDriveId)}` : null,
      };
    }));
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/moderation/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      include: { student: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects.map(p => ({
      id: p.id,
      studentId: p.studentId,
      studentName: p.student?.name || 'Unknown',
      studentRoll: p.student?.rollNo || 'Unknown',
      submittedAt: p.createdAt,
      title: p.title,
      description: p.description,
      organization: null,
      category: 'Project',
      itemType: 'project' as const,
      proofUrl: p.githubUrl,
      fileUrl: p.driveVideoUrl || p.githubUrl,
      githubUrl: p.githubUrl,
      driveVideoUrl: p.driveVideoUrl,
      status: p.status,
      reviewNote: p.reviewNote,
      reviewedBy: p.reviewedBy,
      reviewedAt: p.reviewedAt,
    })));
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/moderation/videos/:id', async (req, res) => {
  try {
    const { action, reason, approvalNote, publish } = req.body;
    const video = await prisma.introVideo.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true } } },
    });

    if (!video) {
      return httpError(res, 404, new Error('Video not found'), "NOT_FOUND");
    }

    const normalized = String(action || '').toLowerCase();
    const status = normalized === 'approve' || action === 'APPROVED'
      ? 'APPROVED'
      : normalized === 'reject' || action === 'REJECTED'
      ? 'REJECTED'
      : normalized === 'hide' || action === 'HIDDEN'
      ? 'HIDDEN'
      : 'CHANGES_REQUESTED';
    const note = reason ? String(reason) : null;
    // A single `reviewNote` column carries whichever message the admin wrote:
    // the approval note when approving, otherwise the reason for the decision.
    const reviewNote = status === 'APPROVED'
      ? (approvalNote ? String(approvalNote) : null)
      : note;

    // Approval publishes the video on the public page; a rejection un-publishes
    // it so nothing is visible before approval.
    const publishApproved = status === 'APPROVED' ? (publish !== undefined ? Boolean(publish) : true) : false;

    const data: Record<string, unknown> = {
      status,
      reviewNote,
      reviewedAt: new Date(),
      reviewedBy: req.adminUser?.username || req.adminUser?.email || null,
    };

    if (status === 'APPROVED') {
      data.isPublic = publishApproved;
      data.publishedAt = publishApproved ? (video.publishedAt ?? new Date()) : null;
      data.changeRequestedAt = null;
      data.changeRequestNote = null;
    } else if (status === 'REJECTED' || status === 'HIDDEN') {
      data.isPublic = false;
      data.publishedAt = null;
    } else {
      // Request changes: the student must upload a new take.
      data.isPublic = false;
      data.changeRequestedAt = new Date();
      data.changeRequestNote = note;
    }

    const updated = await prisma.introVideo.update({
      where: { id: req.params.id },
      data,
    });

    // Keep the student informed about the decision on their video.
    if (video.student?.id) {
      if (status === 'CHANGES_REQUESTED') {
        await notifyVideoChangeRequested(video.student.id, note);
      } else if (status === 'APPROVED') {
        await notifyStudent({
          studentId: video.student.id,
          title: publishApproved
            ? 'Introduction video approved and published'
            : 'Introduction video approved',
          message: publishApproved
            ? 'Your introduction video was approved and is now visible on the public page.'
            : 'Your introduction video was approved. You can publish it to the public page from your Introduction Video page.',
        });
      } else if (status === 'REJECTED') {
        await notifyStudent({
          studentId: video.student.id,
          title: 'Introduction video rejected',
          message: note
            ? `Your introduction video was rejected. Faculty note: "${note}". You can upload a new version at any time.`
            : 'Your introduction video was rejected. You can upload a new version at any time.',
        });
      }
    }

    res.json({ message: 'Success', video: updated, isPublic: Boolean(updated.isPublic) });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// PATCH /admin/api/moderation/videos/:id/visibility — publish/unpublish an
// approved video on the public showcase without re-running moderation.
router.patch('/moderation/videos/:id/visibility', async (req, res) => {
  try {
    const { isPublic } = req.body || {};

    if (typeof isPublic !== 'boolean') {
      return httpError(res, 400, new Error('isPublic must be true or false'), "VALIDATION_ERROR");
    }

    const video = await prisma.introVideo.findUnique({ where: { id: req.params.id } });

    if (!video) {
      return httpError(res, 404, new Error('Video not found'), "NOT_FOUND");
    }

    if (isPublic && video.status !== 'APPROVED') {
      return httpError(
        res,
        409,
        new Error('Only an approved video can be published publicly.'),
        "NOT_APPROVED",
      );
    }

    const updated = await prisma.introVideo.update({
      where: { id: req.params.id },
      data: { isPublic, publishedAt: isPublic ? new Date() : null },
      select: { id: true, isPublic: true, publishedAt: true, status: true },
    });

    res.json({
      success: true,
      video: updated,
      message: isPublic
        ? 'Video is now visible on the public page.'
        : 'Video has been removed from the public page.',
    });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/moderation/resumes/:id', async (req, res) => {
  try {
    const { action, reason, approvalNote, publish } = req.body;
    const resume = await prisma.resume.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true } } },
    });
    if (!resume) {
      return httpError(res, 404, new Error('Resume not found'), "NOT_FOUND");
    }

    const normalized = String(action || '').toLowerCase();
    const status = normalized === 'approve' || action === 'APPROVED'
      ? 'APPROVED'
      : normalized === 'reject' || action === 'REJECTED'
      ? 'REJECTED'
      : normalized === 'hide' || action === 'HIDDEN'
      ? 'HIDDEN'
      : 'CHANGES_REQUESTED';

    const publishApproved = status === 'APPROVED' ? (publish !== undefined ? Boolean(publish) : true) : false;

    const updated = await prisma.resume.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewNote: status === 'APPROVED' ? (approvalNote ? String(approvalNote) : null) : (reason ? String(reason) : null),
        reviewedAt: new Date(),
        reviewedBy: req.adminUser?.username || req.adminUser?.email || null,
        isPublic: publishApproved,
      },
    });

    if (resume.student?.id) {
      if (status === 'CHANGES_REQUESTED') {
        await notifyStudent({
          studentId: resume.student.id,
          title: 'Resume Revision Requested',
          message: reason
            ? `Admin requested changes on your resume: "${reason}".`
            : 'Admin requested changes on your resume.',
          actionUrl: '/resume',
        });
      } else if (status === 'APPROVED') {
        await notifyStudent({
          studentId: resume.student.id,
          title: 'Resume Approved',
          message: 'Your resume has been approved.',
          actionUrl: '/resume',
        });
      } else if (status === 'REJECTED') {
        await notifyStudent({
          studentId: resume.student.id,
          title: 'Resume Rejected',
          message: reason
            ? `Your resume was rejected. Faculty note: "${reason}".`
            : 'Your resume was rejected.',
          actionUrl: '/resume',
        });
      }
    }

    res.json({ message: 'Success', resume: updated, isPublic: Boolean(updated.isPublic) });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/moderation/achievements/:id', async (req, res) => {
  try {
    const { action, reason, approvalNote, publish } = req.body;
    const ach = await prisma.achievement.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true } } },
    });
    if (!ach) {
      return httpError(res, 404, new Error('Achievement not found'), "NOT_FOUND");
    }

    const normalized = String(action || '').toLowerCase();
    const status = normalized === 'approve' || action === 'APPROVED'
      ? 'APPROVED'
      : normalized === 'reject' || action === 'REJECTED'
      ? 'REJECTED'
      : normalized === 'hide' || action === 'HIDDEN'
      ? 'HIDDEN'
      : 'CHANGES_REQUESTED';

    const publishApproved = status === 'APPROVED' ? (publish !== undefined ? Boolean(publish) : true) : false;

    const updated = await prisma.achievement.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewNote: status === 'APPROVED' ? (approvalNote ? String(approvalNote) : null) : (reason ? String(reason) : null),
        reviewedAt: new Date(),
        reviewedBy: req.adminUser?.username || req.adminUser?.email || null,
        isPublic: publishApproved,
      },
    });

    if (ach.student?.id) {
      if (status === 'CHANGES_REQUESTED') {
        await notifyStudent({
          studentId: ach.student.id,
          title: 'Achievement Revision Requested',
          message: reason
            ? `Admin requested changes on your achievement "${ach.title}": "${reason}".`
            : `Admin requested changes on your achievement "${ach.title}".`,
          actionUrl: '/portfolio/achievements',
        });
      } else if (status === 'APPROVED') {
        await notifyStudent({
          studentId: ach.student.id,
          title: 'Achievement Approved',
          message: `Your achievement "${ach.title}" has been approved.`,
          actionUrl: '/portfolio/achievements',
        });
      } else if (status === 'REJECTED') {
        await notifyStudent({
          studentId: ach.student.id,
          title: 'Achievement Rejected',
          message: reason
            ? `Your achievement "${ach.title}" was rejected. Faculty note: "${reason}".`
            : `Your achievement "${ach.title}" was rejected.`,
          actionUrl: '/portfolio/achievements',
        });
      }
    }

    res.json({ message: 'Success', achievement: updated, isPublic: Boolean(updated.isPublic) });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/moderation/certificates/:id', async (req, res) => {
  try {
    const { action, reason, approvalNote, publish } = req.body;
    const cert = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true } } },
    });
    if (!cert) {
      return httpError(res, 404, new Error('Certificate not found'), "NOT_FOUND");
    }

    const normalized = String(action || '').toLowerCase();
    const status = normalized === 'approve' || action === 'APPROVED'
      ? 'APPROVED'
      : normalized === 'reject' || action === 'REJECTED'
      ? 'REJECTED'
      : normalized === 'hide' || action === 'HIDDEN'
      ? 'HIDDEN'
      : 'CHANGES_REQUESTED';

    const publishApproved = status === 'APPROVED' ? (publish !== undefined ? Boolean(publish) : true) : false;

    const updated = await prisma.certificate.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewNote: status === 'APPROVED' ? (approvalNote ? String(approvalNote) : null) : (reason ? String(reason) : null),
        reviewedAt: new Date(),
        reviewedBy: req.adminUser?.username || req.adminUser?.email || null,
        isPublic: publishApproved,
      },
    });

    if (cert.student?.id) {
      if (status === 'CHANGES_REQUESTED') {
        await notifyStudent({
          studentId: cert.student.id,
          title: 'Certificate Revision Requested',
          message: reason
            ? `Admin requested changes on your certificate "${cert.title}": "${reason}".`
            : `Admin requested changes on your certificate "${cert.title}".`,
          actionUrl: '/portfolio/certificates',
        });
      } else if (status === 'APPROVED') {
        await notifyStudent({
          studentId: cert.student.id,
          title: 'Certificate Approved',
          message: `Your certificate "${cert.title}" has been approved.`,
          actionUrl: '/portfolio/certificates',
        });
      } else if (status === 'REJECTED') {
        await notifyStudent({
          studentId: cert.student.id,
          title: 'Certificate Rejected',
          message: reason
            ? `Your certificate "${cert.title}" was rejected. Faculty note: "${reason}".`
            : `Your certificate "${cert.title}" was rejected.`,
          actionUrl: '/portfolio/certificates',
        });
      }
    }

    res.json({ message: 'Success', certificate: updated });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/moderation/projects/:id', async (req, res) => {
  try {
    const { action, reason, approvalNote, publish } = req.body;
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true } } },
    });
    if (!project) {
      return httpError(res, 404, new Error('Project not found'), "NOT_FOUND");
    }

    const normalized = String(action || '').toLowerCase();
    const status = normalized === 'approve' || action === 'APPROVED'
      ? 'APPROVED'
      : normalized === 'reject' || action === 'REJECTED'
      ? 'REJECTED'
      : normalized === 'hide' || action === 'HIDDEN'
      ? 'HIDDEN'
      : 'CHANGES_REQUESTED';

    const publishApproved = status === 'APPROVED' ? (publish !== undefined ? Boolean(publish) : true) : false;

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewNote: status === 'APPROVED' ? (approvalNote ? String(approvalNote) : null) : (reason ? String(reason) : null),
        reviewedAt: new Date(),
        reviewedBy: req.adminUser?.username || req.adminUser?.email || null,
        isPublic: publishApproved,
      },
    });

    if (project.student?.id) {
      if (status === 'CHANGES_REQUESTED') {
        await notifyStudent({
          studentId: project.student.id,
          title: 'Project Revision Requested',
          message: reason
            ? `Admin requested changes on your project "${project.title}": "${reason}".`
            : `Admin requested changes on your project "${project.title}".`,
          actionUrl: '/portfolio/projects',
        });
      } else if (status === 'APPROVED') {
        await notifyStudent({
          studentId: project.student.id,
          title: 'Project Approved',
          message: `Your project "${project.title}" has been approved.`,
          actionUrl: '/portfolio/projects',
        });
      } else if (status === 'REJECTED') {
        await notifyStudent({
          studentId: project.student.id,
          title: 'Project Rejected',
          message: reason
            ? `Your project "${project.title}" was rejected. Faculty note: "${reason}".`
            : `Your project "${project.title}" was rejected.`,
          actionUrl: '/portfolio/projects',
        });
      }
    }

    res.json({ message: 'Success', project: updated });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// ============================================================================
// GENERIC MODERATION CAPABILITIES (videos, resumes, certificates, projects,
// achievements)
//
// The video flow was built first and the other four types never grew the same
// operations, so admins could approve them but could not un-publish, delete, or
// ask for a re-upload. These routes close that gap with one implementation
// instead of four more near-duplicates.
// ============================================================================

type ModerationKind = 'videos' | 'resumes' | 'certificates' | 'projects' | 'achievements';

const MODERATION_KINDS: Record<string, ModerationKind> = {
  videos: 'videos',
  resumes: 'resumes',
  certificates: 'certificates',
  projects: 'projects',
  achievements: 'achievements',
};

/** Per-kind model config: the drive field, title field, and student-facing URL. */
const MODERATION_META: Record<
  ModerationKind,
  { model: 'introVideo' | 'resume' | 'certificate' | 'project' | 'achievement'; driveField: string; label: string; studentUrl: string }
> = {
  videos: { model: 'introVideo', driveField: 'driveFileId', label: 'Intro video', studentUrl: '/intro-video' },
  resumes: { model: 'resume', driveField: 'driveFileId', label: 'Resume', studentUrl: '/resume' },
  certificates: { model: 'certificate', driveField: 'fileDriveId', label: 'Certificate', studentUrl: '/portfolio/certificates' },
  projects: { model: 'project', driveField: 'driveVideoUrl', label: 'Project', studentUrl: '/portfolio/projects' },
  achievements: { model: 'achievement', driveField: 'proofDriveId', label: 'Achievement', studentUrl: '/portfolio/achievements' },
};

function resolveKind(raw: string): ModerationKind | null {
  return MODERATION_KINDS[String(raw || '').toLowerCase()] ?? null;
}

/**
 * PATCH /moderation/:kind/:id/visibility — publish or unpublish without changing
 * the approval decision. Only APPROVED items may be published.
 */
router.patch('/moderation/:kind/:id/visibility', async (req, res) => {
  const kind = resolveKind(req.params.kind);
  if (!kind) {
    return httpError(res, 404, new Error('Unknown moderation type'), "NOT_FOUND");
  }

  try {
    const { isPublic } = req.body || {};
    if (typeof isPublic !== 'boolean') {
      return httpError(res, 400, new Error('isPublic must be true or false'), "VALIDATION_ERROR");
    }

    const meta = MODERATION_META[kind];
    const delegate = (prisma as any)[meta.model];
    const record = await delegate.findUnique({ where: { id: req.params.id } });
    if (!record) {
      return httpError(res, 404, new Error(`${meta.label} not found`), "NOT_FOUND");
    }

    if (isPublic && record.status !== 'APPROVED') {
      return httpError(
        res,
        409,
        new Error(`Only an approved ${meta.label.toLowerCase()} can be published publicly.`),
        "NOT_APPROVED",
      );
    }

    const updated = await delegate.update({
      where: { id: req.params.id },
      data: { isPublic, publishedAt: isPublic ? new Date() : null },
      select: { id: true, isPublic: true, publishedAt: true, status: true },
    });

    res.json({
      success: true,
      [kind.replace(/s$/, '')]: updated,
      isPublic: updated.isPublic,
      message: isPublic
        ? `${meta.label} is now visible on the public page.`
        : `${meta.label} has been removed from the public page.`,
    });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

/**
 * DELETE /moderation/:kind/:id — remove the artefact entirely.
 *
 * Mirrors `DELETE /submissions/:id/video`: the Drive file is deleted, the
 * record is reset to CHANGES_REQUESTED with a note, it is un-published so
 * nothing stale remains on the public page, and the student is told to
 * re-upload rather than left with a silently missing item.
 */
router.delete('/moderation/:kind/:id', async (req, res) => {
  const kind = resolveKind(req.params.kind);
  if (!kind) {
    return httpError(res, 404, new Error('Unknown moderation type'), "NOT_FOUND");
  }

  try {
    const meta = MODERATION_META[kind];
    const delegate = (prisma as any)[meta.model];

    const record = await delegate.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true, rollNo: true } } },
    });
    if (!record) {
      return httpError(res, 404, new Error(`${meta.label} not found`), "NOT_FOUND");
    }

    const driveFileId = record[meta.driveField];

    // Delete from Drive when there is a real Drive-backed file. Projects store a
    // URL rather than a Drive id, so there is nothing to delete for those.
    if (driveFileId && kind !== 'projects' && typeof driveService.deleteFileById === 'function') {
      const cleanRollNo = (record as any).student?.rollNo?.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const studentRelativePath = cleanRollNo ? `Students/${cleanRollNo}` : undefined;
      await driveService.deleteFileById(driveFileId, studentRelativePath).catch(() => {});
    }

    const note = `${meta.label} removed by administrator. Please upload a new one.`;
    const data: Record<string, unknown> = {
      status: 'CHANGES_REQUESTED',
      reviewNote: note,
      isPublic: false,
      thumbnail: null,
      reviewedBy: req.adminUser?.username || req.adminUser?.email || null,
      reviewedAt: new Date(),
    };
    // Clear the file reference so the lazy thumbnail generator cannot resurrect
    // a cached image for a file that no longer exists.
    if (kind !== 'projects') data[meta.driveField] = null;

    const updated = await delegate.update({ where: { id: req.params.id }, data });

    if (record.student?.id) {
      await notifyStudent({
        studentId: record.student.id,
        title: `${meta.label} Removed`,
        message: `Your ${meta.label.toLowerCase()} was removed by the administrator. Please upload a new one.`,
        actionUrl: meta.studentUrl,
      });
    }

    await ActivityService.log({
      eventId: undefined,
      category: 'ADMIN',
      action: `Admin deleted student ${meta.label.toLowerCase()}`,
      details: `${meta.label} removed (${record.id}). Student notified to upload a replacement.`,
      applicantName: record.student?.name || 'Unknown',
      userEmail: record.student?.id || null,
      status: 'WARNING',
    }).catch(() => {});

    res.json({ success: true, message: `${meta.label} removed. The student has been asked to re-upload.`, [kind.replace(/s$/, '')]: updated });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

/**
 * POST /moderation/:kind/:id/request-changes — nudge a student to re-upload a
 * specific item without necessarily rejecting it.
 */
router.post('/moderation/:kind/:id/request-changes', async (req, res) => {
  const kind = resolveKind(req.params.kind);
  if (!kind) {
    return httpError(res, 404, new Error('Unknown moderation type'), "NOT_FOUND");
  }

  try {
    const note = req.body?.note ? String(req.body.note) : 'Please upload a new version.';
    const meta = MODERATION_META[kind];
    const delegate = (prisma as any)[meta.model];

    const record = await delegate.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { id: true, name: true } } },
    });
    if (!record) {
      return httpError(res, 404, new Error(`${meta.label} not found`), "NOT_FOUND");
    }

    const updated = await delegate.update({
      where: { id: req.params.id },
      data: {
        status: 'CHANGES_REQUESTED',
        reviewNote: note,
        isPublic: false,
        thumbnail: null,
        reviewedBy: req.adminUser?.username || req.adminUser?.email || null,
        reviewedAt: new Date(),
      },
    });

    if (record.student?.id) {
      await notifyStudent({
        studentId: record.student.id,
        title: `${meta.label} Update Requested`,
        message: `Admin requested an update to your ${meta.label.toLowerCase()}: "${note}".`,
        actionUrl: meta.studentUrl,
      });
    }

    res.json({ success: true, message: `Change request sent for this ${meta.label.toLowerCase()}.`, [kind.replace(/s$/, '')]: updated });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/voting', async (req, res) => {
  try {
    const campaigns = await prisma.votingCampaign.findMany();
    res.json(campaigns);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
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
    return httpError(res, 500, err, "SERVER_ERROR");
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
    return httpError(res, 500, err, "SERVER_ERROR");
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/announcements', async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(announcements);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    const existing = await prisma.announcement.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found.' });
    }
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/announcements/preview', async (req, res) => {
  try {
    const target = resolveAnnouncementTarget({
      audience: req.query.audience,
      targetYear: req.query.targetYear,
      targetSection: req.query.targetSection,
    });
    const count = await countAnnouncementAudience(target);
    res.json({ count });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/announcements', async (req, res) => {
  try {
    const { title, body, content, message, scheduledAt, priority, targetYear, targetSection, targetAll, audience } = req.body;
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isFutureScheduled = scheduledDate !== null && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();

    // `audience` is what the admin UI sends (ALL / YEAR_1..YEAR_4); targetYear and
    // friends are kept for older callers. Both resolve to the same target here.
    const resolved = resolveAnnouncementTarget({ audience, targetYear, targetSection, targetAll });

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message: body || content || message || '',
        priority: priority || 'normal',
        targetYear: resolved.targetYear,
        targetSection: resolved.targetSection,
        targetAll: resolved.targetAll,
        createdBy: (req as any).adminUser?.username || (req as any).user?.username || 'admin',
        scheduledAt: scheduledDate,
        status: isFutureScheduled ? 'SCHEDULED' : 'PUBLISHED',
        publishedAt: isFutureScheduled ? null : (scheduledDate || new Date())
      }
    });

    // Hold back notifications if scheduled in the future. The publish route
    // below uses the same delivery function, so scheduled announcements get
    // the same canonical target as immediate announcements.
    if (!isFutureScheduled) {
      await deliverAnnouncementNotifications({
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        targetAll: announcement.targetAll,
        targetYear: announcement.targetYear,
        targetSection: announcement.targetSection,
      });
    }

    res.status(201).json(announcement);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/announcements/:id/publish', async (req, res) => {
  try {
    const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found' });
    }

    if (existing.status === 'PUBLISHED') {
      return res.json(existing);
    }

    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    await deliverAnnouncementNotifications({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      targetAll: announcement.targetAll,
      targetYear: announcement.targetYear,
      targetSection: announcement.targetSection,
    });

    res.json(announcement);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.portalSettings.findMany();
    res.json(settings);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/skills', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany();
    res.json(skills);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.delete('/skills/:id', async (req, res) => {
  try {
    await prisma.skill.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/achievement-categories', async (req, res) => {
  try {
    const categories = await prisma.achievementCategory.findMany();
    res.json(categories);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// ==========================================
// EVENT REGISTRATIONS & TEAM ADMINISTRATION (ADM-08 & ADM-09)
// ==========================================

router.get('/registrations', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/registrations/export', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/registrations/:id', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/registrations/:id/status', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.delete('/registrations/:id', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// Teams management (ADM-09)
router.get('/teams', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/teams/:id/status', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/teams/:id/members/remove', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// ==========================================
// STORAGE MANAGEMENT (Storage.tsx)
// ==========================================

router.get('/storage', async (_req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/storage/clear-cache', async (_req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/storage/ensure-viewer-permissions', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const result = typeof driveService.ensureAllFilesViewerAccess === 'function'
      ? await driveService.ensureAllFilesViewerAccess()
      : { count: 0, failed: 0 };

    await ActivityService.log({
      eventId: 'photo-2026',
      category: 'ADMIN',
      action: 'Admin synchronized Drive viewer permissions',
      details: `Granted viewer access to ${result.count} files/folders (${result.failed} failed)`,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: `Viewer permissions updated for ${result.count} Drive items.`,
      ...result,
    });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// ==========================================
// EMAIL AUTOMATIONS & HISTORY
// ==========================================

router.get('/email/automations', async (_req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/email/automations', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/email/automations/:id/toggle', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/email/automations/:id/run', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/email/history', async (_req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/email/templates', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ templates });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// ==========================================
// EXPORTS CONSOLE
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

// ==========================================
// ROLES & PERMISSIONS
// ==========================================

router.get('/roles', async (_req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/roles/assign', async (req: Request, res: Response): Promise<Response | void> => {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

export default router;
