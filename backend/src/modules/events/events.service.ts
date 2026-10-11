import * as repo from './events.repository';
import { isInternalEvent } from '../../config/constants';
import { AppError } from '../../utils/appError';
import { ActivityService } from '../../services/activity.service';
import { notifyAllStudentsAboutEvent } from '../../services/notification.service';
import ExcelJS from 'exceljs';

let cachedOpenEvents: { data: any[]; expiry: number } | null = null;

export function invalidateStudentEventsCache(): void {
  cachedOpenEvents = null;
}

export async function getOpenStudentEvents() {
  if (cachedOpenEvents && Date.now() < cachedOpenEvents.expiry) {
    return cachedOpenEvents.data;
  }

  const events = await repo.findOpenEvents(100);
  const mapped = events.map((e) => ({
    ...e,
    title: e.name,
    date: e.eventDate || e.createdAt,
    eligibility: `Year ${e.year || 'All'}`,
    deadline: e.registrationEnd || e.createdAt,
  }));

  cachedOpenEvents = { data: mapped, expiry: Date.now() + 15_000 };
  return mapped;
}

export async function getStudentEventById(idOrSlug: string) {
  if (isInternalEvent(idOrSlug)) {
    throw new AppError('NOT_FOUND', 'Event not found', 404);
  }

  const event = await repo.findEventByIdOrSlug(idOrSlug);
  if (!event) {
    throw new AppError('NOT_FOUND', 'Event not found', 404);
  }

  return {
    ...event,
    title: event.name,
    date: event.eventDate || event.createdAt,
    eligibility: `Year ${event.year || 'All'}`,
    deadline: event.registrationEnd || event.createdAt,
    registrationFields: event.formFields,
  };
}

export async function getAdminEventsList() {
  const events = await repo.findAdminEvents();
  return events.map((e) => ({
    ...e,
    registrationCount: e._count.registrations,
    submissionCount: e._count.submissions,
  }));
}

export async function getRegistrationsList(params: {
  eventId?: string;
  status?: string;
  year?: number;
  section?: string;
  team?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 25));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.eventId && params.eventId !== 'all') {
    where.eventId = params.eventId;
  }
  if (params.status && params.status !== 'ALL') {
    where.status = params.status;
  }
  if (params.year && !isNaN(params.year)) {
    where.student = { ...(where.student || {}), year: params.year };
  }
  if (params.section && params.section !== 'ALL') {
    where.student = { ...(where.student || {}), section: params.section };
  }
  if (params.team === 'team') {
    where.teamId = { not: null };
  } else if (params.team === 'solo') {
    where.teamId = null;
  }
  if (params.search) {
    where.OR = [
      { student: { name: { contains: params.search, mode: 'insensitive' } } },
      { student: { rollNo: { contains: params.search, mode: 'insensitive' } } },
      { student: { email: { contains: params.search, mode: 'insensitive' } } },
      { team: { name: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  const statsFilter: any = params.eventId && params.eventId !== 'all' ? { eventId: params.eventId } : {};
  const teamStatsFilter: any = params.eventId && params.eventId !== 'all' ? { eventId: params.eventId } : {};

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
    repo.countRegistrations(where),
    repo.findRegistrations(where, skip, limit),
    repo.countRegistrations({ ...statsFilter, status: 'CONFIRMED' as any }),
    repo.countRegistrations({ ...statsFilter, status: 'PENDING' as any }),
    repo.countRegistrations({ ...statsFilter, status: 'WAITLISTED' as any }),
    repo.countRegistrations({ ...statsFilter, status: 'CANCELLED' as any }),
    repo.countRegistrations({ ...statsFilter, status: 'REJECTED' as any }),
    repo.countTeams(teamStatsFilter),
    repo.countTeams({ ...teamStatsFilter, status: 'COMPLETE' as any }),
  ]);

  const leaderIds = registrations
    .map(r => r.team?.leaderId)
    .filter((id): id is string => Boolean(id));

  let leaderMap = new Map<string, any>();
  if (leaderIds.length > 0) {
    const leaders = await repo.findStudentsByIds(leaderIds);
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

  return {
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
  };
}

export async function exportRegistrationsWorkbook(params: {
  eventId?: string;
  status?: string;
  year?: number;
  section?: string;
}) {
  const where: any = {};
  if (params.eventId && params.eventId !== 'all') where.eventId = params.eventId;
  if (params.status && params.status !== 'ALL') where.status = params.status;
  if (params.year && !isNaN(params.year)) where.student = { ...(where.student || {}), year: params.year };
  if (params.section && params.section !== 'ALL') where.student = { ...(where.student || {}), section: params.section };

  const registrations = await repo.findRegistrationsForExport(where);

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

  return workbook;
}

export async function getRegistrationDetail(id: string) {
  const reg = await repo.findRegistrationById(id);
  if (!reg) {
    throw new AppError('NOT_FOUND', 'Registration not found', 404);
  }

  let leader = null;
  if (reg.team?.leaderId) {
    leader = await repo.findStudentById(reg.team.leaderId);
  }

  return {
    ...reg,
    team: reg.team ? { ...reg.team, leader } : null
  };
}

export async function updateRegistrationStatus(id: string, status: string, note?: string) {
  const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'WAITLISTED'];
  if (!allowed.includes(status)) {
    throw new AppError('INVALID_STATUS', `Status must be one of: ${allowed.join(', ')}`, 400);
  }

  const reg = await repo.findRegistrationById(id);
  if (!reg) {
    throw new AppError('NOT_FOUND', 'Registration not found', 404);
  }

  const updated = await repo.updateRegistration(id, { status: status as any });

  await ActivityService.log({
    eventId: reg.eventId,
    category: 'ADMIN',
    action: `Admin updated registration status to ${status}`,
    details: note || `Registration for ${reg.student.name} (${reg.student.rollNo}) set to ${status}`,
    applicantName: reg.student.name,
    userEmail: reg.student.email || undefined,
    status: 'SUCCESS'
  });

  return updated;
}

export async function deleteRegistration(id: string) {
  const reg = await repo.findRegistrationById(id);
  if (!reg) {
    throw new AppError('NOT_FOUND', 'Registration not found', 404);
  }

  await repo.deleteRegistrationWithAnswers(id);

  await ActivityService.log({
    eventId: reg.eventId,
    category: 'ADMIN',
    action: `Admin deleted registration`,
    details: `Registration for ${reg.student.name} (${reg.student.rollNo}) deleted`,
    applicantName: reg.student.name,
    userEmail: reg.student.email || undefined,
    status: 'SUCCESS'
  });

  return true;
}

export async function getTeamsList(params: {
  eventId?: string;
  status?: string;
  search?: string;
}) {
  const where: any = {};
  if (params.eventId && params.eventId !== 'all') where.eventId = params.eventId;
  if (params.status && params.status !== 'ALL') where.status = params.status;
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { members: { some: { student: { name: { contains: params.search, mode: 'insensitive' } } } } },
      { members: { some: { student: { rollNo: { contains: params.search, mode: 'insensitive' } } } } },
    ];
  }

  const teams = await repo.findTeams(where);
  const leaderIds = teams.map(t => t.leaderId);
  let leaderMap = new Map<string, any>();
  if (leaderIds.length > 0) {
    const leaders = await repo.findStudentsByIds(leaderIds);
    leaderMap = new Map(leaders.map(l => [l.id, l]));
  }

  return teams.map(t => ({
    ...t,
    leader: leaderMap.get(t.leaderId) || null
  }));
}

export async function updateTeamStatus(id: string, status: string) {
  const allowed = ['FORMING', 'ACTIVE', 'COMPLETE', 'REJECTED'];
  if (!allowed.includes(status)) {
    throw new AppError('INVALID_STATUS', `Status must be one of: ${allowed.join(', ')}`, 400);
  }

  const team = await repo.updateTeam(id, { status: status as any });

  await ActivityService.log({
    eventId: team.eventId,
    category: 'ADMIN',
    action: `Admin updated team status to ${status}`,
    details: `Team ${team.name} status updated to ${status}`,
    status: 'SUCCESS'
  });

  return team;
}

export async function removeTeamMember(teamId: string, studentId: string, reason?: string) {
  if (!studentId) {
    throw new AppError('MISSING_DATA', 'studentId is required', 400);
  }

  const team = await repo.findTeamById(teamId);
  if (!team) {
    throw new AppError('NOT_FOUND', 'Team not found', 404);
  }

  const member = await repo.findTeamMember(team.id, studentId);
  if (!member) {
    throw new AppError('NOT_FOUND', 'Student is not a member of this team', 404);
  }

  await repo.removeTeamMemberTransaction(member.id, team.eventId, studentId, team.id);

  await ActivityService.log({
    eventId: team.eventId,
    category: 'ADMIN',
    action: `Admin removed member from team`,
    details: `Removed ${member.student.name} (${member.student.rollNo}) from ${team.name}. Reason: ${reason || 'Admin action'}`,
    applicantName: member.student.name,
    userEmail: member.student.email || undefined,
    status: 'SUCCESS'
  });

  return true;
}

// Portal Events Service
export async function getPortalEventsList() {
  const events = await repo.findPortalEvents();
  return events.map((e) => ({
    ...e,
    registrationCount: e._count.registrations,
    submissionCount: e._count.submissions,
  }));
}

export async function getPortalEventById(id: string) {
  if (isInternalEvent(id)) {
    throw new AppError('SYSTEM_RECORD', 'This is a system record, not an event.', 409);
  }

  const event = await repo.findPortalEventDetail(id);
  if (!event) {
    throw new AppError('NOT_FOUND', 'Event not found', 404);
  }
  return event;
}

export async function createPortalEvent(data: any) {
  const id = `${data.slug}-${Date.now().toString().slice(-4)}`;
  const event = await repo.createEventRecord({ id, ...data });
  invalidateStudentEventsCache();

  await notifyAllStudentsAboutEvent({
    id: event.id,
    name: event.name,
    description: event.description,
    slug: event.slug,
    eligibilityYears: event.eligibilityYears,
  });

  return event;
}

export async function updatePortalEvent(id: string, data: any) {
  if (isInternalEvent(id)) {
    throw new AppError('SYSTEM_RECORD', 'This is a system record, not an event.', 409);
  }

  const existing = await repo.findEventById(id);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Event not found', 404);
  }

  const mergedMin = data.teamMin ?? existing.teamMin;
  const mergedMax = data.teamMax ?? existing.teamMax;
  if (mergedMin > mergedMax) {
    throw new AppError('BAD_REQUEST', 'Maximum team members cannot be lower than the minimum.', 400);
  }

  const event = await repo.updateEventRecord(id, data);
  invalidateStudentEventsCache();
  return event;
}

export async function setPortalEventStatus(id: string, status: 'OPEN' | 'CLOSED' | 'ARCHIVED') {
  if (isInternalEvent(id)) {
    throw new AppError('SYSTEM_RECORD', 'This is a system record, not an event.', 409);
  }

  const existing = await repo.findEventByIdWithSelect(id, { id: true });
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Event not found.', 404);
  }

  const event = await repo.updateEventRecord(id, { status });
  invalidateStudentEventsCache();

  if (status === 'OPEN') {
    await notifyAllStudentsAboutEvent({
      id: event.id,
      name: event.name,
      description: event.description,
      slug: event.slug,
      eligibilityYears: event.eligibilityYears,
    });
  }

  return event;
}

export async function deletePortalEvent(id: string, force?: boolean, adminEmail?: string) {
  if (isInternalEvent(id)) {
    throw new AppError('PROTECTED_EVENT', 'The internal submission event cannot be deleted.', 403);
  }

  const event = await repo.findEventByIdWithSelect(id, { id: true, name: true });
  if (!event) {
    throw new AppError('NOT_FOUND', 'Event not found', 404);
  }

  const dependents = await repo.countEventDependents(id);
  const totalDependents = Object.values(dependents).reduce((sum, n) => sum + n, 0);

  if (totalDependents > 0 && !force) {
    return {
      confirmationRequired: true as const,
      error: 'CONFIRMATION_REQUIRED',
      message: `This event has ${totalDependents} dependent record(s). Resend with { "force": true } to delete them.`,
      dependents,
    };
  }

  const deleted = await repo.deleteEventWithCascade(id, dependents);
  invalidateStudentEventsCache();

  await ActivityService.log({
    category: 'ADMIN',
    action: 'EVENT_DELETE',
    details: `Deleted event "${event.name}" (${id}) plus ${totalDependents} dependent records: ${JSON.stringify(dependents)}`,
    userEmail: adminEmail,
  });

  return { confirmationRequired: false as const, success: true, deleted, dependents };
}

export async function getPortalEventRegistrations(id: string) {
  if (isInternalEvent(id)) {
    throw new AppError('SYSTEM_RECORD', 'This is a system record, not an event.', 409);
  }
  return repo.findPortalEventRegistrations(id);
}

export async function createPortalEventFormField(eventId: string, body: any) {
  if (isInternalEvent(eventId)) {
    throw new AppError('SYSTEM_RECORD', 'This is a system record, not an event.', 409);
  }
  const { label, fieldType, isRequired, options, displayOrder } = body;
  return repo.createFormField({
    eventId,
    label: label || 'Field',
    fieldType: fieldType || 'text',
    isRequired: Boolean(isRequired),
    options: options || [],
    displayOrder: displayOrder || 0,
  });
}

export async function updatePortalEventFormField(eventId: string, fieldId: string, body: any) {
  if (isInternalEvent(eventId)) {
    throw new AppError('SYSTEM_RECORD', 'This is a system record, not an event.', 409);
  }
  const { label, fieldType, isRequired, options, displayOrder } = body;
  return repo.updateFormField(fieldId, {
    label,
    fieldType,
    isRequired: isRequired !== undefined ? Boolean(isRequired) : undefined,
    options,
    displayOrder,
  });
}

export async function deletePortalEventFormField(eventId: string, fieldId: string) {
  if (isInternalEvent(eventId)) {
    throw new AppError('SYSTEM_RECORD', 'This is a system record, not an event.', 409);
  }
  return repo.deleteFormField(fieldId);
}
