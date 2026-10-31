export const EVENT_TYPES = ['HACKATHON', 'WORKSHOP', 'COMPETITION', 'SEMINAR', 'OTHER'] as const;
export const EVENT_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'] as const;

export function parseEventPayload(rawBody: any, { partial }: { partial: boolean }) {
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
    if (type !== 'GENERAL' && !(EVENT_TYPES as readonly string[]).includes(type as any)) {
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
    if (!(EVENT_STATUSES as readonly string[]).includes(status as any)) {
      return { ok: false as const, message: `Unknown event status: ${body.status}` };
    }
    data.status = status;
  }

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
