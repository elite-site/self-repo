import ExcelJS from 'exceljs';
import * as adminRepo from '../admin.repository';

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
