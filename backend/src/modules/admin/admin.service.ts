import ExcelJS from 'exceljs';
import { driveService } from '../../services/drive.service';
import { ActivityService } from '../../services/activity.service';
import { notifyStudent, notifyVideoChangeRequested } from '../../services/notification.service';
import { deliverAnnouncementNotifications } from '../../services/announcement.service';
import { TtlCache } from '../../utils/ttlCache';
import { AppError } from '../../utils/appError';
import {
  INTERNAL_EVENT_ID,
  RATINGS,
  RATING_LABELS,
  SUBMISSION_STATUSES,
} from '../../config/constants';
import * as adminRepo from './admin.repository';
import type {
  SubmissionQueryParams,
  StudentRosterQueryParams,
  PortalStudentsQueryParams,
  CreateVotingCampaignInput,
  UpdateVotingCampaignInput,
  CreateAnnouncementInput,
} from './admin.types';
import { isValidRating, isValidSubmissionStatus } from './admin.schemas';

export const ACTIVE_EVENT_ID = INTERNAL_EVENT_ID;
const adminStatsCache = new TtlCache<any>(15_000, 10);

// ==========================================
// 1. Submissions Services
// ==========================================

export async function listSubmissions(query: SubmissionQueryParams) {
  const eventId = (query.eventId || ACTIVE_EVENT_ID).trim();
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25', 10)));
  const skip = (page - 1) * limit;

  const branch = query.branch;
  const section = query.section;
  const year = query.year ? parseInt(query.year, 10) : undefined;
  const status = query.status;
  const rating = query.rating;
  const search = query.search?.trim();
  const tag = query.tag?.trim().toLowerCase();

  const sortBy = query.sortBy || 'submittedAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const whereClause: any = { eventId };
  const andConditions: any[] = [];

  if (branch) whereClause.branch = branch;
  if (section) whereClause.section = section;
  if (year) whereClause.year = year;
  if (status && SUBMISSION_STATUSES.includes(status as any)) whereClause.status = status;
  if (rating && RATINGS.includes(rating as any)) whereClause.rating = rating;

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
    adminRepo.countSubmissions(whereClause),
    adminRepo.findSubmissions(whereClause, skip, limit, sortBy, sortOrder),
  ]);

  return {
    eventId,
    data: submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSubmissionDetail(id: string) {
  const submission = await adminRepo.findSubmissionById(id);
  if (!submission) return null;

  const introVideo = await adminRepo.findIntroVideoByStudentRoll(submission.rollNo);

  return {
    ...submission,
    introVideo: introVideo
      ? {
          id: introVideo.id,
          status: introVideo.status,
          reviewNote: introVideo.reviewNote,
          isPublic: introVideo.isPublic,
          publishedAt: introVideo.publishedAt,
          changeRequestedAt: introVideo.changeRequestedAt,
          changeRequestNote: introVideo.changeRequestNote,
          driveFileId: introVideo.driveFileId,
          submittedAt: introVideo.submittedAt,
          publicUrl:
            introVideo.isPublic && introVideo.status === 'APPROVED'
              ? `/api/public/videos/stream/${introVideo.id}`
              : null,
        }
      : null,
  };
}

export async function getMediaStreamInfo(id: string, fileKey: string) {
  if (fileKey !== 'video') {
    throw new AppError('MEDIA_NOT_FOUND', `Media ${fileKey} is not available for this portal.`, 404);
  }

  let driveFileId: string | null = null;
  let driveFolderPath: string | undefined = undefined;

  const submission = await adminRepo.findSubmissionByDriveOrRoll(id);
  if (submission?.videoDriveId) {
    driveFileId = submission.videoDriveId.trim();
    driveFolderPath = submission.driveFolderPath;
  } else {
    const introVideo = await adminRepo.findIntroVideoByDriveOrRoll(id);
    if (introVideo?.driveFileId) {
      driveFileId = introVideo.driveFileId.trim();
    }
  }

  if (!driveFileId) {
    throw new AppError('MEDIA_NOT_FOUND', `Media ${fileKey} not present for this submission.`, 404);
  }

  return { driveFileId, driveFolderPath };
}

export async function updateRating(id: string, rating: unknown) {
  const hasRating = rating !== null && rating !== undefined && rating !== '';
  const normalized = hasRating ? String(rating).toUpperCase() : null;

  if (normalized && !isValidRating(normalized)) {
    throw new AppError('INVALID_RATING', `Invalid rating. Available options: ${RATINGS.join(', ')}.`, 400);
  }

  const updated = await adminRepo.updateSubmission(id, {
    rating: (normalized as any) || null,
    ratedAt: normalized ? new Date() : null,
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

  return updated;
}

export async function updateReview(id: string, reviewText?: string, pros?: any, cons?: any, adminUsername?: string) {
  const normalizedPros = Array.isArray(pros)
    ? (pros as string[]).map((p) => String(p).trim().toLowerCase()).filter(Boolean)
    : [];
  const normalizedCons = Array.isArray(cons)
    ? (cons as string[]).map((c) => String(c).trim().toLowerCase()).filter(Boolean)
    : [];
  const hasReview = Boolean(
    (reviewText && String(reviewText).trim()) || normalizedPros.length > 0 || normalizedCons.length > 0
  );

  const existing = await adminRepo.findSubmissionById(id);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Submission not found', 404);
  }

  const updated = await adminRepo.updateSubmission(
    id,
    hasReview
      ? {
          reviewText: reviewText ? String(reviewText).trim() : null,
          reviewPros: normalizedPros,
          reviewCons: normalizedCons,
          reviewedAt: new Date(),
          reviewedBy: adminUsername || undefined,
          status: 'REVIEWED',
        }
      : {
          reviewText: null,
          reviewPros: [],
          reviewCons: [],
          reviewedAt: null,
          reviewedBy: undefined,
          status: 'SUBMITTED',
        }
  );

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

  return updated;
}

export async function updateStatus(id: string, status: string) {
  if (!isValidSubmissionStatus(status)) {
    throw new AppError('INVALID_STATUS', 'Invalid status value provided.', 400);
  }

  const updated = await adminRepo.updateSubmission(id, { status });

  await ActivityService.log({
    eventId: updated.eventId,
    category: 'ADMIN',
    action: `Admin updated status to ${status}`,
    details: `Applicant status set to ${status}`,
    applicantName: updated.name,
    userEmail: updated.email,
    status: 'SUCCESS',
  });

  return updated;
}

export async function requestNewVideo(id: string, reason?: string | null) {
  const submission = await adminRepo.findSubmissionById(id);
  if (!submission) {
    throw new AppError('NOT_FOUND', 'Submission not found', 404);
  }

  const student = await adminRepo.findStudentByIdOrRoll(submission.rollNo);
  const introVideo = await adminRepo.findIntroVideoByStudentRoll(submission.rollNo);

  if (introVideo) {
    await adminRepo.updateIntroVideo(introVideo.id, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reason || 'A new introduction video has been requested.',
      changeRequestedAt: new Date(),
      changeRequestNote: reason,
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

  return { success: true, message: 'The student has been notified and asked to upload a new video.' };
}

export async function deleteSubmissionVideo(id: string) {
  const submission = await adminRepo.findSubmissionById(id);
  if (!submission) {
    throw new AppError('NOT_FOUND', 'Submission not found', 404);
  }

  if (!submission.videoDriveId) {
    throw new AppError('NO_VIDEO', 'This submission has no video to delete.', 400);
  }

  await driveService.deleteVideo(submission);

  const updated = await adminRepo.updateSubmission(id, {
    videoDriveId: null,
  });

  const student = await adminRepo.findStudentByIdOrRoll(submission.rollNo);

  try {
    await adminRepo.updateIntroVideosByStudent(submission.rollNo, {
      driveFileId: null,
      status: 'CHANGES_REQUESTED',
      reviewNote: 'Video removed by administrator.',
      isPublic: false,
      publishedAt: null,
      changeRequestedAt: new Date(),
      changeRequestNote: 'Your previous video was removed. Please upload a new one.',
    });
  } catch (_) {}

  if (student?.id) {
    await notifyVideoChangeRequested(
      student.id,
      'Your previous video was removed by the administrator.'
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

  return updated;
}

export async function deleteSubmission(id: string) {
  const submission = await adminRepo.findSubmissionById(id);
  if (!submission) {
    throw new AppError('NOT_FOUND', 'Submission not found', 404);
  }

  await driveService.deleteSubmissionFiles(submission);
  await adminRepo.deleteSubmission(id);

  await ActivityService.log({
    eventId: submission.eventId,
    category: 'ADMIN',
    action: 'Admin deleted applicant',
    details: `Purged submission record and Drive files for ${submission.rollNo}`,
    applicantName: submission.name,
    userEmail: submission.email,
    status: 'WARNING',
  });

  return { success: true, message: 'Submission and associated files purged successfully.' };
}

export async function exportSubmissionsWorkbook(eventId: string) {
  const event = await adminRepo.findEventById(eventId);
  const eventName = event ? event.name : 'Self Introduction';
  const eventSlug = event ? event.slug : 'self-introduction';

  const submissions = await adminRepo.findSubmissionsForExport(eventId);

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

  await ActivityService.log({
    eventId,
    category: 'ADMIN',
    action: 'Admin exported Excel report',
    details: `Exported ${submissions.length} records for ${eventName}`,
    status: 'SUCCESS',
  });

  return { workbook, filename: `ELITE_${eventSlug}_2026_Submissions.xlsx` };
}

// ==========================================
// 2. Student Roster & Portal Students Services
// ==========================================

export async function getStudentRoster(query: StudentRosterQueryParams) {
  const eventId = (query.eventId || ACTIVE_EVENT_ID).trim();
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(query.limit || '25', 10)));
  const skip = (page - 1) * limit;

  const section = query.section;
  const year = query.year ? parseInt(query.year, 10) : undefined;
  const uploaded = query.uploaded;
  const search = query.search?.trim();

  const whereClause: any = {};
  if (section) whereClause.section = section;
  if (year) whereClause.year = year;
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { rollNo: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (uploaded === 'yes') {
    whereClause.introVideos = { some: { driveFileId: { not: null } } };
  } else if (uploaded === 'no') {
    whereClause.introVideos = { none: { driveFileId: { not: null } } };
  }

  const [total, students] = await Promise.all([
    adminRepo.countStudents(whereClause),
    adminRepo.findStudentsForRoster(whereClause, skip, limit),
  ]);

  const rollNos = students.map((s) => s.rollNo);
  const studentIds = students.map((s) => s.id);

  const [submissions, introVideos] = await Promise.all([
    adminRepo.findSubmissionsByRollNos(eventId, rollNos),
    adminRepo.findIntroVideosByStudentIds(studentIds),
  ]);

  const submissionByRoll = new Map<string, any>();
  for (const sub of submissions) {
    const key = `${sub.rollNo}|${sub.year}|${sub.section}`;
    if (!submissionByRoll.has(key)) submissionByRoll.set(key, sub);
  }

  const videoByStudent = new Map<string, { status: string; isPublic: boolean }>();
  for (const vid of introVideos) {
    if (!videoByStudent.has(vid.studentId)) {
      videoByStudent.set(vid.studentId, { status: vid.status, isPublic: vid.isPublic });
    }
  }

  const rows = students.map((student) => {
    const key = `${student.rollNo}|${student.year}|${student.section}`;
    const submission = submissionByRoll.get(key) || null;
    const video = videoByStudent.get(student.id) || null;
    return {
      ...student,
      video,
      hasUploaded: Boolean(video ? true : submission?.videoDriveId),
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

  return {
    eventId,
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      rosterTotal: total,
    },
  };
}

export async function exportRosterWorkbook(eventId: string) {
  const event = await adminRepo.findEventById(eventId);
  const eventName = event ? event.name : 'Self Introduction';
  const eventSlug = event ? event.slug : 'self-introduction';

  const [students, submissions] = await Promise.all([
    adminRepo.findAllStudentsForExport(),
    adminRepo.findSubmissionsForExport(eventId),
  ]);

  const submissionByRoll = new Map<string, any>();
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

  await ActivityService.log({
    eventId,
    category: 'ADMIN',
    action: 'Admin exported full student roster',
    details: `Exported ${students.length} students (${exported} with submissions) for ${eventName}`,
    status: 'SUCCESS',
  });

  return { workbook, filename: `${eventSlug}_2026_All_Students.xlsx` };
}

export async function getPortalStudents(query: PortalStudentsQueryParams) {
  const { year, section, search, page = '1', limit = '25' } = query;
  const where: any = {};
  if (year) where.year = parseInt(String(year), 10);
  if (section) where.section = String(section);
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { rollNo: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  const p = Math.max(1, parseInt(String(page), 10));
  const l = Math.max(1, Math.min(100, parseInt(String(limit), 10)));

  const [total, students] = await Promise.all([
    adminRepo.countStudents(where),
    adminRepo.findStudentsWithProfile(where, (p - 1) * l, l),
  ]);

  const rollNos = students.map((s) => s.rollNo);
  const submissions = await adminRepo.findSubmissionsByRollNos(undefined, rollNos);

  const studentsWithSubs = students.map((s) => ({
    ...s,
    submissions: submissions.filter((sub) => sub.rollNo === s.rollNo),
  }));

  return { students: studentsWithSubs, total, page: p, totalPages: Math.ceil(total / l) || 1 };
}

export async function getPortalStudentDetail(id: string) {
  const student = await adminRepo.findStudentWithFullProfile(id);
  if (!student) throw new AppError('NOT_FOUND', 'Student not found', 404);

  const submissions = await adminRepo.findSubmissionsByRollNos(undefined, [student.rollNo]);

  const introVideos = (student.introVideos || []).map((v) => {
    const fileId = (v.driveFileId && v.driveFileId.trim()) ? v.driveFileId.trim() : v.id;
    return {
      ...v,
      streamUrl: fileId ? `/api/public/media/video/${fileId}?stream=true` : null,
      thumbnailUrl: (v.driveFileId && v.driveFileId.trim()) ? `/api/public/media/thumbnail/video/${v.id}?v=${encodeURIComponent(v.driveFileId.trim())}` : null,
      watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(v.driveFileId) : null,
      previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(v.driveFileId) : null,
    };
  });

  if (introVideos.length === 0 && submissions[0]?.videoDriveId) {
    const sub = submissions[0];
    const subDriveId = (sub.videoDriveId || '').trim();
    introVideos.push({
      id: sub.id,
      studentId: student.id,
      driveFileId: subDriveId,
      mimeType: 'video/mp4',
      sizeMb: null,
      filename: 'intro_video.mp4',
      status: (sub.status === 'REJECTED' ? 'REJECTED' : sub.status === 'REVIEWED' ? 'APPROVED' : 'PENDING') as any,
      reviewNote: sub.reviewText,
      reviewedBy: sub.reviewedBy,
      reviewedAt: sub.reviewedAt,
      isActive: true,
      submittedAt: sub.submittedAt,
      updatedAt: sub.updatedAt,
      isPublic: false,
      publishedAt: null,
      changeRequestedAt: null,
      changeRequestNote: null,
      streamUrl: `/api/public/media/video/${subDriveId}?stream=true`,
      thumbnailUrl: `/api/public/media/thumbnail/video/${sub.id}?v=${encodeURIComponent(subDriveId)}`,
      watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(subDriveId) : null,
      previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(subDriveId) : null,
    } as any);
  }

  const resumes = (student.resumes || []).map((r) => ({
    ...r,
    fileUrl: r.driveFileId ? `/api/public/media/resume/${r.id}` : null,
    thumbnailUrl: r.driveFileId ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}` : null,
    previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(r.driveFileId) : null,
    watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(r.driveFileId) : null,
  }));

  const achievements = (student.achievements || []).map((a) => ({
    ...a,
    proofUrl: a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.id}` : null),
    thumbnailUrl: a.proofDriveId ? `/api/public/media/thumbnail/achievement/${a.id}?v=${encodeURIComponent(a.proofDriveId)}` : null,
    watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(a.proofDriveId) : null,
    previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(a.proofDriveId) : null,
  }));

  const certificates = (student.certificates || []).map((c) => ({
    ...c,
    fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null,
    thumbnailUrl: c.fileDriveId ? `/api/public/media/thumbnail/certificate/${c.id}?v=${encodeURIComponent(c.fileDriveId)}` : null,
    previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(c.fileDriveId) : null,
    watchUrl: typeof driveService.getWatchUrl === 'function' ? driveService.getWatchUrl(c.fileDriveId) : null,
  }));

  const photoUrl = (student.profile?.photoDriveId || student.profile?.photoUrl)
    ? `/api/public/media/photo/${student.profile?.id || student.id}`
    : student.profile?.photoUrl || null;

  return {
    ...student,
    profile: student.profile
      ? {
          ...student.profile,
          photoUrl: photoUrl || undefined,
        }
      : null,
    introVideos,
    resumes,
    achievements,
    certificates,
    submissions,
  };
}

export async function requestItemChange(
  studentId: string,
  type: string,
  itemId: string,
  reasonText: string,
  reviewerName: string,
  userEmail?: string
) {
  if (!reasonText) {
    throw new AppError('BAD_REQUEST', 'Change request note is required.', 400);
  }

  const student = await adminRepo.findStudentByIdOrRoll(studentId);
  if (!student) {
    throw new AppError('NOT_FOUND', 'Student not found.', 404);
  }

  const normalizedType = type.toLowerCase().replace(/_/g, '-');

  if (normalizedType === 'video' || normalizedType === 'intro-video' || normalizedType === 'videos') {
    const item = await adminRepo.findIntroVideoById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Video not found.', 404);
    }
    await adminRepo.updateIntroVideo(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      changeRequestNote: reasonText,
      changeRequestedAt: new Date(),
      isPublic: false,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyVideoChangeRequested(student.id, reasonText);
  } else if (normalizedType === 'resume' || normalizedType === 'resumes') {
    const item = await adminRepo.findResumeById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Resume not found.', 404);
    }
    await adminRepo.updateResume(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyStudent({
      studentId: student.id,
      title: 'Resume Revision Requested',
      message: `Admin requested changes on your resume: "${reasonText}". Please upload an updated PDF.`,
      actionUrl: '/resume',
    });
  } else if (normalizedType === 'achievement' || normalizedType === 'achievements') {
    const item = await adminRepo.findAchievementById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Achievement not found.', 404);
    }
    await adminRepo.updateAchievement(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      isPublic: false,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyStudent({
      studentId: student.id,
      title: 'Achievement Revision Requested',
      message: `Admin requested changes on your achievement "${item.title}": "${reasonText}".`,
      actionUrl: '/portfolio/achievements',
    });
  } else if (normalizedType === 'certificate' || normalizedType === 'certificates') {
    const item = await adminRepo.findCertificateById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Certificate not found.', 404);
    }
    await adminRepo.updateCertificate(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      isPublic: false,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyStudent({
      studentId: student.id,
      title: 'Certificate Revision Requested',
      message: `Admin requested changes on your certificate "${item.title}": "${reasonText}".`,
      actionUrl: '/portfolio/certificates',
    });
  } else if (normalizedType === 'project' || normalizedType === 'projects') {
    const item = await adminRepo.findProjectById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Project not found.', 404);
    }
    await adminRepo.updateProject(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      isPublic: false,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyStudent({
      studentId: student.id,
      title: 'Project Revision Requested',
      message: `Admin requested changes on your project "${item.title}": "${reasonText}".`,
      actionUrl: '/portfolio/projects',
    });
  } else {
    throw new AppError('BAD_REQUEST', `Unknown item type: ${type}`, 400);
  }

  await ActivityService.log({
    category: 'ADMIN',
    action: 'REQUEST_CHANGE',
    details: `Admin requested changes for ${normalizedType} ${itemId} of student ${student.rollNo}: "${reasonText}"`,
    userEmail: userEmail || 'admin',
  });

  return { success: true, message: 'Change requested successfully and student notified.' };
}

export async function deleteStudentItem(
  studentId: string,
  type: string,
  itemId: string,
  reasonText?: string,
  userEmail?: string
) {
  const student = await adminRepo.findStudentByIdOrRoll(studentId);
  if (!student) {
    throw new AppError('NOT_FOUND', 'Student not found.', 404);
  }

  const normalizedType = type.toLowerCase().replace(/_/g, '-');
  const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const studentRelativePath = `Students/${cleanRollNo}`;

  if (normalizedType === 'video' || normalizedType === 'intro-video' || normalizedType === 'videos') {
    let item = await adminRepo.findIntroVideoById(itemId);
    if (!item || item.studentId !== student.id) {
      const fallback = await adminRepo.findFallbackIntroVideo(itemId, student.id, student.rollNo);
      if (fallback) item = fallback;
    }

    const submissions = await adminRepo.findSubmissionsByStudentOrItem(student.rollNo, student.id, itemId);

    if (!item && !submissions.some((s) => Boolean(s.videoDriveId))) {
      throw new AppError('NOT_FOUND', 'Video not found.', 404);
    }

    if (item?.driveFileId) {
      await driveService.deleteFileById(item.driveFileId, studentRelativePath).catch(() => {});
    }

    await adminRepo.updateManyIntroVideos(
      {
        OR: [
          { studentId: student.id },
          { student: { rollNo: student.rollNo } },
        ],
      },
      {
        driveFileId: null,
        thumbnail: null,
        filename: null,
        mimeType: null,
        sizeMb: null,
        status: 'CHANGES_REQUESTED',
        reviewNote: reasonText || 'Video removed by administrator.',
        isPublic: false,
        publishedAt: null,
        changeRequestedAt: new Date(),
        changeRequestNote: reasonText || 'Your previous video was removed. Please upload a new one.',
      }
    );

    for (const sub of submissions) {
      if (sub.videoDriveId) {
        if (!item || sub.videoDriveId !== item.driveFileId) {
          await driveService.deleteFileById(sub.videoDriveId, sub.driveFolderPath).catch(() => {});
        }
        await adminRepo.updateSubmission(sub.id, { videoDriveId: null });
      }
    }

    await notifyStudent({
      studentId: student.id,
      title: 'Introduction Video Deleted',
      message: reasonText
        ? `Your introduction video was removed by administrator. Reason: "${reasonText}".`
        : 'Your introduction video was removed by administrator.',
      actionUrl: '/intro-video',
    });

    await ActivityService.log({
      category: 'ADMIN',
      action: 'DELETE_VIDEO',
      details: `Admin deleted video (${itemId}) for student ${student.rollNo}${reasonText ? ` (Reason: ${reasonText})` : ''}`,
      applicantName: student.name,
      userEmail: userEmail || 'admin',
    });
  } else if (normalizedType === 'resume' || normalizedType === 'resumes') {
    const item = await adminRepo.findResumeById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Resume not found.', 404);
    }
    if (item.driveFileId) {
      await driveService.deleteFileById(item.driveFileId, studentRelativePath).catch(() => {});
    }
    await adminRepo.deleteResume(itemId);
    await notifyStudent({
      studentId: student.id,
      title: 'Resume Deleted',
      message: reasonText
        ? `Your resume was removed by administrator. Reason: "${reasonText}".`
        : 'Your resume was removed by administrator.',
      actionUrl: '/resume',
    });
  } else if (normalizedType === 'achievement' || normalizedType === 'achievements') {
    const item = await adminRepo.findAchievementById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Achievement not found.', 404);
    }
    if (item.proofDriveId) {
      await driveService.deleteFileById(item.proofDriveId, studentRelativePath).catch(() => {});
    }
    await adminRepo.deleteAchievement(itemId);
    await notifyStudent({
      studentId: student.id,
      title: 'Achievement Deleted',
      message: reasonText
        ? `Your achievement "${item.title}" was removed by administrator. Reason: "${reasonText}".`
        : `Your achievement "${item.title}" was removed by administrator.`,
      actionUrl: '/portfolio/achievements',
    });
  } else if (normalizedType === 'certificate' || normalizedType === 'certificates') {
    const item = await adminRepo.findCertificateById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Certificate not found.', 404);
    }
    if (item.fileDriveId) {
      await driveService.deleteFileById(item.fileDriveId, studentRelativePath).catch(() => {});
    }
    await adminRepo.deleteCertificate(itemId);
    await notifyStudent({
      studentId: student.id,
      title: 'Certificate Deleted',
      message: reasonText
        ? `Your certificate "${item.title}" was removed by administrator. Reason: "${reasonText}".`
        : `Your certificate "${item.title}" was removed by administrator.`,
      actionUrl: '/portfolio/certificates',
    });
  } else if (normalizedType === 'project' || normalizedType === 'projects') {
    const item = await adminRepo.findProjectById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Project not found.', 404);
    }
    await adminRepo.deleteProject(itemId);
    await notifyStudent({
      studentId: student.id,
      title: 'Project Deleted',
      message: reasonText
        ? `Your project "${item.title}" was removed by administrator. Reason: "${reasonText}".`
        : `Your project "${item.title}" was removed by administrator.`,
      actionUrl: '/portfolio/projects',
    });
  } else {
    throw new AppError('BAD_REQUEST', `Unknown item type: ${type}`, 400);
  }

  await ActivityService.log({
    category: 'ADMIN',
    action: 'DELETE_ITEM',
    details: `Admin deleted ${normalizedType} ${itemId} for student ${student.rollNo}${reasonText ? ` (Reason: ${reasonText})` : ''}`,
    userEmail: userEmail || 'admin',
  });

  return { success: true, message: 'Item deleted successfully.' };
}

// ==========================================
// 3. Voting Campaigns Services
// ==========================================

export async function listVotingCampaigns() {
  const campaigns = await adminRepo.findVotingCampaigns();
  return campaigns.map((c) => ({
    ...c,
    totalVotes: c._count.votes,
    candidateCount: c._count.candidates,
    eventTitle: c.event?.name,
  }));
}

export async function createVotingCampaign(data: CreateVotingCampaignInput) {
  return adminRepo.createVotingCampaign({
    title: data.title,
    description: data.description,
    rule: data.rule || 'ONE_TOTAL',
    fixedCount: data.fixedCount ? parseInt(String(data.fixedCount), 10) : null,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    eventId: data.eventId || null,
    status: 'DRAFT',
  });
}

export async function getVotingCampaign(id: string) {
  const campaign = await adminRepo.findVotingCampaignById(id);
  if (!campaign) throw new AppError('NOT_FOUND', 'Campaign not found', 404);
  return {
    ...campaign,
    totalVotes: campaign._count.votes,
    eventTitle: campaign.event?.name,
    candidates: (campaign.candidates || []).map((cand: any) => ({
      ...cand,
      voteCount: cand._count?.votes || 0,
    })),
  };
}

export async function updateVotingCampaign(id: string, data: UpdateVotingCampaignInput) {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.rule !== undefined) updateData.rule = data.rule;
  if (data.fixedCount !== undefined) updateData.fixedCount = data.fixedCount ? parseInt(String(data.fixedCount), 10) : null;
  if (data.startsAt !== undefined) updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
  if (data.endsAt !== undefined) updateData.endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (data.status !== undefined) updateData.status = data.status;

  return adminRepo.updateVotingCampaign(id, updateData);
}

export async function deleteVotingCampaign(id: string) {
  return adminRepo.deleteVotingCampaign(id);
}

export async function addVotingCandidate(campaignId: string, studentId?: string, projectId?: string) {
  return adminRepo.createVotingCandidate({
    campaignId,
    studentId: studentId || null,
    projectId: projectId || null,
  });
}

export async function removeVotingCandidate(candidateId: string) {
  return adminRepo.deleteVotingCandidate(candidateId);
}

// ==========================================
// 4. Settings & Roles Services
// ==========================================

export async function getSettings() {
  return adminRepo.findAllPortalSettings();
}

export async function saveSetting(key: string, value: any, group?: string) {
  if (key) {
    await adminRepo.upsertPortalSetting(key, String(value), group || 'general');
  }
}

export async function getPortalSettings() {
  const settings = await adminRepo.findAllPortalSettings();
  const map: Record<string, string> = {
    academic_year: '2026',
    portal_title: 'ELITE Student Portal',
    institution_name: 'Sasi Institute of Technology & Engineering',
    department_name: 'Department of Information Technology',
    max_video_size_mb: '100',
    max_photo_size_mb: '10',
    allowed_email_domain: 'sasi.ac.in',
    auto_approve_projects: 'true',
  };
  settings.forEach((s) => {
    map[s.key] = s.value;
  });
  return { settings: map, raw: settings };
}

export async function savePortalSettings(body: Record<string, any>, updatedBy: string = 'ADMIN') {
  const validEntries = Object.entries(body).filter(
    ([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  );
  if (validEntries.length > 0) {
    await adminRepo.batchUpsertPortalSettings(validEntries, updatedBy);
  }
}

export async function listSkills() {
  return adminRepo.findAllSkills();
}

export async function createSkill(name: string, category?: string) {
  return adminRepo.createSkill({ name, category, isActive: true });
}

export async function deleteSkill(id: string) {
  return adminRepo.deleteSkill(id);
}

export async function listRoles() {
  return adminRepo.findAllRoles();
}

export async function createRole(name: string, description?: string) {
  return adminRepo.createRole(name, description);
}

export async function updateRole(id: string, description?: string) {
  return adminRepo.updateRole(id, description);
}

export async function deleteRole(id: string) {
  return adminRepo.deleteRole(id);
}

export async function listPermissions(roleId?: string) {
  if (roleId) return adminRepo.findRolePermissions(roleId);
  return [];
}

export async function listAdmins() {
  return adminRepo.findAllAdminUsers();
}

export async function createAdmin(data: any) {
  return adminRepo.createAdminUser(data);
}

export async function updateAdmin(id: string, data: any) {
  return adminRepo.updateAdminUser(id, data);
}

export async function deleteAdmin(id: string) {
  return adminRepo.deleteAdminUser(id);
}

// ==========================================
// 5. Announcements Services (Portal duplicate surface)
// ==========================================

export async function listPortalAnnouncements() {
  return adminRepo.findAllAnnouncements();
}

export async function createPortalAnnouncement(data: CreateAnnouncementInput, createdBy: string = 'ADMIN') {
  const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const isFutureScheduled = scheduledDate !== null && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();
  const isTargetAll = data.targetAll === false ? false : (data.targetAll === true ? true : !(data.targetYear || data.targetSection));

  const announcement = await adminRepo.createAnnouncement({
    title: data.title,
    message: data.message || data.body || data.content || '',
    priority: data.priority || 'normal',
    targetYear: data.targetYear !== undefined && data.targetYear !== null && data.targetYear !== '' ? parseInt(String(data.targetYear), 10) : null,
    targetSection: data.targetSection ? String(data.targetSection) : null,
    targetAll: isTargetAll,
    createdBy,
    scheduledAt: scheduledDate,
    status: isFutureScheduled ? 'SCHEDULED' : 'PUBLISHED',
    publishedAt: isFutureScheduled ? null : (scheduledDate || new Date()),
  });

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

  return announcement;
}

export async function publishPortalAnnouncement(id: string) {
  const existing = await adminRepo.findAnnouncementById(id);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Announcement not found', 404);
  }

  if (existing.status === 'PUBLISHED') {
    return existing;
  }

  const claimed = await adminRepo.claimAnnouncementPublish(id);
  const announcement = claimed.count > 0 ? await adminRepo.findAnnouncementById(id) : existing;

  if (claimed.count > 0 && announcement) {
    await deliverAnnouncementNotifications({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      targetAll: announcement.targetAll,
      targetYear: announcement.targetYear,
      targetSection: announcement.targetSection,
    });
  }

  return announcement;
}

// ==========================================
// 6. Stats, Analytics & Storage Services
// ==========================================

export async function getActivityLogs(query: {
  eventId?: string;
  category?: string;
  status?: string;
  search?: string;
  page?: string;
  limit?: string;
}) {
  const eventId = query.eventId || 'all';
  const category = query.category || 'ALL';
  const status = query.status || 'ALL';
  const search = (query.search || '').trim();

  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25', 10)));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (eventId !== 'all') whereClause.eventId = eventId;
  if (category !== 'ALL') whereClause.category = category;
  if (status !== 'ALL') whereClause.status = status;

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
    adminRepo.countActivityLogs(whereClause),
    adminRepo.findActivityLogs(whereClause, skip, limit),
  ]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const statsWhere = eventId !== 'all' ? { eventId } : {};

  const [totalActivities, todayApps, adminCount, errorCount] = await Promise.all([
    adminRepo.countActivityLogs(statsWhere),
    adminRepo.countActivityLogs({
      ...statsWhere,
      category: 'APPLICATION',
      createdAt: { gte: startOfToday },
    }),
    adminRepo.countActivityLogs({
      ...statsWhere,
      category: 'ADMIN',
    }),
    adminRepo.countActivityLogs({
      ...statsWhere,
      status: 'ERROR',
    }),
  ]);

  const successRate = totalActivities > 0
    ? Number((((totalActivities - errorCount) / totalActivities) * 100).toFixed(1))
    : 100;

  return {
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
  };
}

export async function exportActivityLogsWorkbook() {
  const logs = await adminRepo.findRecentActivityLogs(2000);

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

  return workbook;
}

export async function getAdminStats(eventId: string) {
  const cached = adminStatsCache.get(eventId);
  if (cached) return { data: cached, cached: true };

  const data = await adminRepo.getAdminStatsCounts(eventId);
  adminStatsCache.set(eventId, data);
  return { data, cached: false };
}

export async function getPortalAnalytics() {
  return adminRepo.getAnalyticsCounts();
}

export async function getStorageInfo() {
  const inventory = await adminRepo.getStorageInventory();
  const totalFiles =
    inventory.submissionVideos +
    inventory.introVideos +
    inventory.resumes +
    inventory.certificates +
    inventory.achievementProofs +
    inventory.profilePhotos;

  const mem = process.memoryUsage();
  const memoryUsedMb = Math.round(mem.rss / (1024 * 1024));

  return {
    drive: {
      status: 'CONNECTED',
      account: 'organizer@sasi.ac.in',
      mode: 'OAuth 2.0 Workspace Token',
      rootFolder: 'ELITE_PORTAL_ROOT',
      cacheEntriesCount: inventory.cacheCount,
      recentCache: inventory.cacheEntries,
    },
    inventory: {
      totalFiles,
      ...inventory,
    },
    system: {
      memoryUsedMb,
      uptimeSec: Math.round(process.uptime()),
      nodeVersion: process.version,
    },
  };
}

export async function clearStorageCache() {
  return adminRepo.clearDriveFolderCache();
}
