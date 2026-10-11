import ExcelJS from 'exceljs';
import { ActivityService } from './activity.service';
import { INTERNAL_EVENT_ID, RATING_LABELS } from '../../../config/constants';
import * as adminRepo from '../admin.repository';
import type { StudentRosterQueryParams } from '../admin.types';

const ACTIVE_EVENT_ID = INTERNAL_EVENT_ID;

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
    if (search.length >= 2) {
      if (/^\d+$/.test(search)) {
        whereClause.rollNo = { contains: search, mode: 'insensitive' };
      } else {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { rollNo: { contains: search, mode: 'insensitive' } },
        ];
      }
    }
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
