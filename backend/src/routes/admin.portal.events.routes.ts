import { Router, Request, Response } from 'express';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ActivityService } from '../services/activity.service';
import { notifyAllStudentsAboutEvent } from '../services/notification.service';
import { invalidateStudentEventsCache } from './student.events.routes';
import { EXCLUDE_INTERNAL_EVENT, isInternalEvent } from '../config/constants';

const router = Router();
router.use(requireAdminAuth);

// ── Events (admin)
router.get('/events', async (_req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: EXCLUDE_INTERNAL_EVENT,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { registrations: true, submissions: true },
        },
      },
    });
    res.json({
      events: events.map((e) => ({
        ...e,
        registrationCount: e._count.registrations,
        submissionCount: e._count.submissions,
      })),
    });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

const EVENT_TYPES = ['HACKATHON', 'WORKSHOP', 'COMPETITION', 'SEMINAR', 'OTHER'] as const;
const EVENT_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'] as const;

/**
 * Validates and normalises an event payload for create/update.
 *
 * The seven-step wizard collects a rich set of fields (dates, eligibility, team
 * size, reminders). Before this parser existed, every one of those fields was
 * silently discarded, so it needs real parsing rather than a blind spread: an
 * invalid date string would otherwise reach Prisma and surface as a 500.
 *
 * Returns either `{ ok: true, data }` or `{ ok: false, message }`. Callers
 * return 400 with the message rather than guessing at a default.
 */
function parseEventPayload(rawBody: any, { partial }: { partial: boolean }) {
  if (rawBody === undefined || rawBody === null || typeof rawBody !== 'object') {
    return { ok: false as const, message: 'A JSON request body is required.' };
  }

  const body = rawBody;
  const data: Record<string, unknown> = {};

  const rawName = body.name ?? body.title;
  if (rawName !== undefined || !partial) {
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) return { ok: false as const, message: 'Event title is required.' };
    if (name.length > 200) return { ok: false as const, message: 'Event title must be 200 characters or fewer.' };
    data.name = name;
    data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  if (body.description !== undefined) {
    data.description = typeof body.description === 'string' ? body.description.trim() || null : null;
  }

  if (body.type !== undefined) {
    const type = String(body.type).toUpperCase();
    if (type !== 'GENERAL' && !(EVENT_TYPES as readonly string[]).includes(type)) {
      return { ok: false as const, message: `Unknown event type: ${body.type}` };
    }
    data.type = type;
  }

  if (body.year !== undefined) {
    const year = parseInt(String(body.year), 10);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return { ok: false as const, message: 'Year must be between 2000 and 2100.' };
    }
    data.year = year;
  }

  if (body.status !== undefined) {
    const status = String(body.status).toUpperCase();
    if (!(EVENT_STATUSES as readonly string[]).includes(status)) {
      return { ok: false as const, message: `Unknown event status: ${body.status}` };
    }
    data.status = status;
  }

  // Dates arrive from <input type="datetime-local"> as `YYYY-MM-DDTHH:mm`,
  // which is local time with no zone. `new Date(str)` parses that as local,
  // but a bare date-only string is parsed as UTC midnight, which shifts the
  // day backwards for anyone west of Greenwich. Pin date-only values to noon
  // so the stored date always matches the day the admin typed.
  for (const field of ['registrationStart', 'registrationEnd', 'eventDate'] as const) {
    if (body[field] === undefined) continue;
    const raw = body[field];
    if (raw === null || raw === '') {
      data[field] = null;
      continue;
    }
    if (typeof raw !== 'string') {
      return { ok: false as const, message: `Invalid ${field} date.` };
    }
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
    if (Number.isNaN(date.getTime())) {
      return { ok: false as const, message: `Invalid ${field} date.` };
    }
    data[field] = date;
  }

  const start = data.registrationStart as Date | null | undefined;
  const end = data.registrationEnd as Date | null | undefined;
  // Only compare when the request supplied both, so a partial edit that sets
  // just one bound is not rejected against an unknown other bound.
  if (body.registrationStart !== undefined && body.registrationEnd !== undefined && start && end && start > end) {
    return { ok: false as const, message: 'Registration end must be after registration start.' };
  }

  if (body.eligibilityYears !== undefined) {
    if (!Array.isArray(body.eligibilityYears)) {
      return { ok: false as const, message: 'Eligibility years must be a list.' };
    }
    const years: number[] = (body.eligibilityYears as unknown[]).map((y) => parseInt(String(y), 10));
    if (years.some((y: number) => !Number.isFinite(y) || y < 1 || y > 4)) {
      return { ok: false as const, message: 'Eligibility years must be between 1 and 4.' };
    }
    data.eligibilityYears = [...new Set(years)].sort((a: number, b: number) => a - b);
  }

  for (const field of ['minCompletion'] as const) {
    if (body[field] === undefined) continue;
    const value = parseInt(String(body[field]), 10);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return { ok: false as const, message: 'Minimum profile completion must be between 0 and 100.' };
    }
    data[field] = value;
  }

  for (const field of ['notifyOnOpen', 'notifyReminder', 'teamEnabled'] as const) {
    if (body[field] !== undefined) data[field] = Boolean(body[field]);
  }

  for (const field of ['teamMin', 'teamMax'] as const) {
    if (body[field] === undefined) continue;
    const value = parseInt(String(body[field]), 10);
    if (!Number.isFinite(value) || value < 1 || value > 20) {
      return { ok: false as const, message: `${field === 'teamMin' ? 'Minimum' : 'Maximum'} team members must be between 1 and 20.` };
    }
    data[field] = value;
  }

  if (
    (body.teamMin !== undefined || body.teamMax !== undefined) &&
    (data.teamMin as number) > (data.teamMax as number)
  ) {
    return { ok: false as const, message: 'Maximum team members cannot be lower than the minimum.' };
  }

  return { ok: true as const, data };
}

router.post('/events', async (req: Request, res: Response) => {
  try {
    const parsed = parseEventPayload(req.body, { partial: false });
    if (!parsed.ok) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.message });
    }

    const id = `${parsed.data.slug}-${Date.now().toString().slice(-4)}`;

    const event = await prisma.event.create({
      data: { id, ...parsed.data } as any,
    });
    invalidateStudentEventsCache();

    // Send the event created by the admin to all the students
    await notifyAllStudentsAboutEvent({
      id: event.id,
      name: event.name,
      description: event.description,
      slug: event.slug,
      eligibilityYears: event.eligibilityYears,
    });
    res.status(201).json(event);
  } catch (err: any) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not create the event.' });
  }
});

router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        formFields: { orderBy: { displayOrder: 'asc' } },
        teams: { include: { members: { include: { student: true } } } },
        _count: { select: { registrations: true } },
      },
    });
    if (!event) return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    res.json(event);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.put('/events/:id', async (req: Request, res: Response) => {
  try {
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

    const parsed = parseEventPayload(req.body, { partial: true });
    if (!parsed.ok) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.message });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'No fields to update.' });
    }

    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });

    // Validate against the merged row, not just the payload. A request that
    // sends only `teamMin` cannot be checked inside the parser (the other bound
    // is not there yet), so `teamMin: 10` on an event whose max is 4 would pass
    // both here and in Prisma.
    const mergedMin = parsed.data.teamMin ?? existing.teamMin;
    const mergedMax = parsed.data.teamMax ?? existing.teamMax;
    if (mergedMin > mergedMax) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Maximum team members cannot be lower than the minimum.',
      });
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: parsed.data as any,
    });
    invalidateStudentEventsCache();
    res.json(event);
  } catch (err: any) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the event.' });
  }
});

/**
 * Sets an event's status.
 *
 * Existence is checked before the update because Prisma raises P2025 for an
 * unknown id, which used to surface as a 500 carrying the raw driver message to
 * the client. Distinguishing "no such event" from a real failure also stops the
 * error handler from leaking internals in production.
 */
async function setEventStatus(req: Request, res: Response, status: 'OPEN' | 'CLOSED' | 'ARCHIVED') {
  try {
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }
    const existing = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found.' });
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status },
    });
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

    res.json(event);
  } catch (err: any) {
    console.error(`Error setting event ${req.params.id} to ${status}:`, err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the event.' });
  }
}

router.post('/events/:id/publish', (req: Request, res: Response) => setEventStatus(req, res, 'OPEN'));

router.post('/events/:id/close', (req: Request, res: Response) => setEventStatus(req, res, 'CLOSED'));

router.post('/events/:id/archive', (req: Request, res: Response) => setEventStatus(req, res, 'ARCHIVED'));
router.delete('/events/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Submission.eventId defaults to this row — deleting it would strand every
    // submission in the portal.
    if (isInternalEvent(id)) {
      return res.status(403).json({
        error: 'PROTECTED_EVENT',
        message: 'The internal submission event cannot be deleted.',
      });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!event) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    }

    const [registrations, submissions, formFields, teams, votes, emailLogs] = await Promise.all([
      prisma.eventRegistration.count({ where: { eventId: id } }),
      prisma.submission.count({ where: { eventId: id } }),
      prisma.registrationFormField.count({ where: { eventId: id } }),
      prisma.team.count({ where: { eventId: id } }),
      prisma.vote.count({ where: { campaign: { eventId: id } } }),
      prisma.emailLog.count({ where: { eventId: id } }),
    ]);

    const dependents = { registrations, submissions, formFields, teams, votes, emailLogs };
    const totalDependents = Object.values(dependents).reduce((sum, n) => sum + n, 0);

    if (totalDependents > 0 && !req.body?.force) {
      return res.status(409).json({
        error: 'CONFIRMATION_REQUIRED',
        message: `This event has ${totalDependents} dependent record(s). Resend with { "force": true } to delete them.`,
        dependents,
      });
    }

    // Child-first: answers hang off both registrations and form fields, team rows
    // hang off teams, and votes hang off candidates.
    const deleted = await prisma.$transaction(async (tx) => {
      if (registrations > 0 || formFields > 0) {
        await tx.registrationAnswer.deleteMany({
          where: { OR: [{ registration: { eventId: id } }, { field: { eventId: id } }] },
        });
      }
      if (teams > 0) {
        await tx.teamMember.deleteMany({ where: { team: { eventId: id } } });
        await tx.teamInvitation.deleteMany({ where: { team: { eventId: id } } });
      }
      if (votes > 0) {
        await tx.vote.deleteMany({ where: { campaign: { eventId: id } } });
        await tx.votingCandidate.deleteMany({ where: { campaign: { eventId: id } } });
        await tx.votingCampaign.deleteMany({ where: { eventId: id } });
      }
      if (registrations > 0) {
        await tx.eventRegistration.deleteMany({ where: { eventId: id } });
      }
      if (formFields > 0) {
        await tx.registrationFormField.deleteMany({ where: { eventId: id } });
      }
      if (teams > 0) {
        await tx.team.deleteMany({ where: { eventId: id } });
      }
      if (submissions > 0) {
        await tx.submission.deleteMany({ where: { eventId: id } });
      }
      if (emailLogs > 0) {
        await tx.emailLog.deleteMany({ where: { eventId: id } });
      }
      return tx.event.delete({ where: { id } });
    }, { timeout: 20000, maxWait: 10000 });
    invalidateStudentEventsCache();

    await ActivityService.log({
      category: 'ADMIN',
      action: 'EVENT_DELETE',
      details: `Deleted event "${event.name}" (${id}) plus ${totalDependents} dependent records: ${JSON.stringify(dependents)}`,
      userEmail: req.adminUser?.email,
    });

    res.json({ success: true, deleted, dependents });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.get('/events/:id/registrations', async (req: Request, res: Response) => {
  try {
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId: req.params.id },
      include: {
        student: true,
        event: true,
        team: {
          include: {
            members: {
              include: {
                student: {
                  select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, status: true, graduatedAt: true },
                },
              },
            },
          },
        },
        answers: { include: { field: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
    res.json({ registrations });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/events/:id/form-fields', async (req: Request, res: Response) => {
  try {
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

    const { label, fieldType, isRequired, options, displayOrder } = req.body;
    const field = await prisma.registrationFormField.create({
      data: {
        eventId: req.params.id,
        label: label || 'Field',
        fieldType: fieldType || 'text',
        isRequired: Boolean(isRequired),
        options: options || [],
        displayOrder: displayOrder || 0,
      },
    });
    res.status(201).json(field);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.put('/events/:id/form-fields/:fieldId', async (req: Request, res: Response) => {
  try {
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

    const { label, fieldType, isRequired, options, displayOrder } = req.body;
    const field = await prisma.registrationFormField.update({
      where: { id: req.params.fieldId },
      data: {
        label,
        fieldType,
        isRequired: isRequired !== undefined ? Boolean(isRequired) : undefined,
        options,
        displayOrder,
      },
    });
    res.json(field);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.delete('/events/:id/form-fields/:fieldId', async (req: Request, res: Response) => {
  try {
    if (isInternalEvent(req.params.id)) {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: 'This is a system record, not an event.' });
    }

    await prisma.registrationFormField.delete({ where: { id: req.params.fieldId } });
    res.json({ success: true, message: 'Form field deleted' });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});


export default router;
