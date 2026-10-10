import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import adminPortalRouter from '../src/routes/admin.portal.routes';
import { env } from '../src/config/env';
import { INTERNAL_EVENT_ID } from '../src/config/constants';
import { prisma } from '../src/lib/prisma';
import { ActivityService } from '../src/services/activity.service';

/**
 * Deleting an Event has to clear every table that hangs off it, because each of
 * those foreign keys is declared ON DELETE RESTRICT:
 *
 *   Submission.eventId            -> Event
 *   EventRegistration.eventId     -> Event
 *   RegistrationFormField.eventId -> Event
 *   Team.eventId                  -> Event
 *   EmailLog.eventId              -> Event
 *
 * plus the transitive children (RegistrationAnswer off registrations AND form
 * fields, TeamMember/TeamInvitation off teams, Vote off candidates). A bare
 * prisma.event.delete() therefore dies with P2003 as soon as the event has any
 * history, which is exactly the bug that shipped: there was no DELETE route at all.
 *
 * Two behaviours are load-bearing and asserted below:
 *   1. Deletion order is child-first. Getting it wrong reintroduces P2003.
 *   2. Dependents are never destroyed on the first call — the API answers 409 with
 *      a per-table tally and only cascades once the caller resends force:true.
 */
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    event: { findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
    eventRegistration: { count: vi.fn(), deleteMany: vi.fn() },
    submission: { count: vi.fn(), deleteMany: vi.fn() },
    registrationFormField: { count: vi.fn(), deleteMany: vi.fn() },
    registrationAnswer: { deleteMany: vi.fn() },
    team: { count: vi.fn(), deleteMany: vi.fn() },
    teamMember: { deleteMany: vi.fn() },
    teamInvitation: { deleteMany: vi.fn() },
    votingCampaign: { deleteMany: vi.fn() },
    votingCandidate: { deleteMany: vi.fn() },
    vote: { count: vi.fn(), deleteMany: vi.fn() },
    emailLog: { count: vi.fn(), deleteMany: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../src/services/activity.service', () => ({
  ActivityService: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../src/services/announcement.service', () => ({
  deliverAnnouncementNotifications: vi.fn(),
}));

vi.mock('../src/services/notification.service', () => ({
  notifyStudent: vi.fn(),
  notifyVideoChangeRequested: vi.fn(),
}));

const activityLog = ActivityService.log as unknown as ReturnType<typeof vi.fn>;
const transaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const eventDelete = prisma.event.delete as unknown as ReturnType<typeof vi.fn>;
const eventFindUnique = prisma.event.findUnique as unknown as ReturnType<typeof vi.fn>;

/**
 * The callback form of $transaction resolves to whatever the callback returns.
 * Handing the callback a client whose deleteMany mocks are the same objects the
 * assertions inspect keeps call ordering observable via invocationCallOrder.
 */
const transactionClient = {
  event: prisma.event,
  eventRegistration: prisma.eventRegistration,
  submission: prisma.submission,
  registrationFormField: prisma.registrationFormField,
  registrationAnswer: prisma.registrationAnswer,
  team: prisma.team,
  teamMember: prisma.teamMember,
  teamInvitation: prisma.teamInvitation,
  votingCampaign: prisma.votingCampaign,
  votingCandidate: prisma.votingCandidate,
  vote: prisma.vote,
  emailLog: prisma.emailLog,
};

const EVENT_ID = 'hackathon-2026';
const mockEvent = { id: EVENT_ID, name: 'Campus Hackathon 2026' };

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use('/admin/api/portal', adminPortalRouter);

const adminToken = jwt.sign(
  { userId: 'admin-1', email: 'admin@example.com', username: 'admin' },
  env.JWT_SECRET,
  { expiresIn: '1h' },
);

const authed = (req: request.Test) =>
  req.set('Cookie', [`${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`]);

const countMock = (model: 'eventRegistration' | 'submission' | 'registrationFormField' | 'team' | 'vote' | 'emailLog') =>
  prisma[model].count as unknown as ReturnType<typeof vi.fn>;

const deleteManyMock = (
  model:
    | 'eventRegistration'
    | 'submission'
    | 'registrationFormField'
    | 'registrationAnswer'
    | 'team'
    | 'teamMember'
    | 'teamInvitation'
    | 'votingCampaign'
    | 'votingCandidate'
    | 'vote'
    | 'emailLog',
) => prisma[model].deleteMany as unknown as ReturnType<typeof vi.fn>;

const COUNT_MODELS = [
  'eventRegistration',
  'submission',
  'registrationFormField',
  'team',
  'vote',
  'emailLog',
] as const;

/** Seed the six count queries with a realistic spread of dependents. */
const withDependents = (overrides: Partial<Record<(typeof COUNT_MODELS)[number], number>> = {}) => {
  const values = {
    eventRegistration: 12,
    submission: 3,
    registrationFormField: 4,
    team: 2,
    vote: 30,
    emailLog: 25,
    ...overrides,
  };
  COUNT_MODELS.forEach((model) => countMock(model).mockResolvedValue(values[model]));
};

const withNoDependents = () => {
  COUNT_MODELS.forEach((model) => countMock(model).mockResolvedValue(0));
};

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (cb: (tx: typeof transactionClient) => Promise<unknown>) =>
    cb(transactionClient),
  );
  eventFindUnique.mockResolvedValue(mockEvent);
  eventDelete.mockResolvedValue(mockEvent);
  withNoDependents();
});

describe('Event deletion — guards', () => {  it('requires an authenticated admin session', async () => {
    const response = await request(app).delete(`/admin/api/portal/events/${EVENT_ID}`);

    expect(response.status).toBe(401);
    expect(eventDelete).not.toHaveBeenCalled();
  });

  it('refuses to delete the internal submission event', async () => {
    // INTERNAL_EVENT_ID is the default target of Submission.eventId; removing it
    // would strand every submission row in the portal.
    const response = await authed(request(app).delete(`/admin/api/portal/events/${INTERNAL_EVENT_ID}`));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('PROTECTED_EVENT');
    expect(eventDelete).not.toHaveBeenCalled();
    // The guard runs before any lookup, so the internal event is never even read.
    expect(eventFindUnique).not.toHaveBeenCalled();
  });

  it('returns 404 and deletes nothing when the event does not exist', async () => {
    eventFindUnique.mockResolvedValue(null);

    const response = await authed(request(app).delete(`/admin/api/portal/events/ghost-2026`));

    expect(response.status).toBe(404);
    expect(eventDelete).not.toHaveBeenCalled();
    expect(deleteManyMock('eventRegistration')).not.toHaveBeenCalled();
  });
});

describe('Event deletion — confirmation gate', () => {
  it('refuses to destroy dependents on the first call and returns a per-table tally', async () => {
    withDependents();

    const response = await authed(request(app).delete(`/admin/api/portal/events/${EVENT_ID}`));

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('CONFIRMATION_REQUIRED');
    expect(response.body.dependents).toEqual({
      registrations: 12,
      submissions: 3,
      formFields: 4,
      teams: 2,
      votes: 30,
      emailLogs: 25,
    });

    // The whole point of the gate: not one row destroyed yet.
    expect(eventDelete).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(deleteManyMock('eventRegistration')).not.toHaveBeenCalled();
    expect(deleteManyMock('submission')).not.toHaveBeenCalled();
  });

  it('does not write an activity log for a refused delete', async () => {
    withDependents();

    await authed(request(app).delete(`/admin/api/portal/events/${EVENT_ID}`));

    expect(activityLog).not.toHaveBeenCalled();
  });

  it('scopes each tally to this event, and reaches votes through the campaign', async () => {
    withDependents();

    await authed(request(app).delete(`/admin/api/portal/events/${EVENT_ID}`));

    expect(countMock('eventRegistration')).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(countMock('submission')).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(countMock('team')).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    // Vote has no eventId column — the filter has to traverse campaign.eventId.
    expect(countMock('vote')).toHaveBeenCalledWith({ where: { campaign: { eventId: EVENT_ID } } });
  });

  it('deletes immediately with no confirmation step when the event has no history', async () => {
    withNoDependents();

    const response = await authed(request(app).delete(`/admin/api/portal/events/${EVENT_ID}`));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(eventDelete).toHaveBeenCalledWith({ where: { id: EVENT_ID } });
  });
});

describe('Event deletion — confirmed cascade', () => {
  it('cascades every dependent table and the event in one transaction', async () => {
    withDependents();

    const response = await authed(
      request(app).delete(`/admin/api/portal/events/${EVENT_ID}`).send({ force: true }),
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(eventDelete).toHaveBeenCalledWith({ where: { id: EVENT_ID } });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(deleteManyMock('eventRegistration')).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(deleteManyMock('submission')).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(deleteManyMock('registrationFormField')).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(deleteManyMock('team')).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(deleteManyMock('emailLog')).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(deleteManyMock('votingCampaign')).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
  });

  it('removes answers that hang off either a registration or a form field', async () => {
    withDependents();

    await authed(request(app).delete(`/admin/api/portal/events/${EVENT_ID}`).send({ force: true }));

    // Both branches matter: an orphaned field can outlive its registrations, and a
    // withdrawn registration leaves answers behind that still pin the field row.
    expect(deleteManyMock('registrationAnswer')).toHaveBeenCalledWith({
      where: {
        OR: [{ registration: { eventId: EVENT_ID } }, { field: { eventId: EVENT_ID } }],
      },
    });
  });

  it('clears team members and invitations before their team row', async () => {
    withDependents();

    await authed(request(app).delete(`/admin/api/portal/events/${EVENT_ID}`).send({ force: true }));

    expect(deleteManyMock('teamMember')).toHaveBeenCalledWith({ where: { team: { eventId: EVENT_ID } } });
    expect(deleteManyMock('teamInvitation')).toHaveBeenCalledWith({ where: { team: { eventId: EVENT_ID } } });
  });

  it('deletes children strictly before their parents so RESTRICT never fires', async () => {
    // This is the regression guard. Order is enforced by the real FK graph:
    //   answers  -> registrations, form fields
    //   members  -> teams
    //   votes    -> candidates -> campaigns
    //   event    -> everything above
    withDependents();

    await authed(request(app).delete(`/admin/api/portal/events/${EVENT_ID}`).send({ force: true }));

    const before = (fn: ReturnType<typeof vi.fn>, model: string) => {
      expect(fn, `${model} was never called`).toHaveBeenCalled();
      return fn.mock.invocationCallOrder[0];
    };

    const answers = before(deleteManyMock('registrationAnswer'), 'registrationAnswer');
    const registrations = before(deleteManyMock('eventRegistration'), 'eventRegistration');
    const fields = before(deleteManyMock('registrationFormField'), 'registrationFormField');
    const members = before(deleteManyMock('teamMember'), 'teamMember');
    const invitations = before(deleteManyMock('teamInvitation'), 'teamInvitation');
    const teams = before(deleteManyMock('team'), 'team');
    const votes = before(deleteManyMock('vote'), 'vote');
    const candidates = before(deleteManyMock('votingCandidate'), 'votingCandidate');
    const campaigns = before(deleteManyMock('votingCampaign'), 'votingCampaign');
    const submissions = before(deleteManyMock('submission'), 'submission');
    const emailLogs = before(deleteManyMock('emailLog'), 'emailLog');
    const event = before(eventDelete, 'event');

    // Answers precede both of the tables that reference them.
    expect(answers).toBeLessThan(registrations);
    expect(answers).toBeLessThan(fields);
    expect(answers).toBeLessThan(event);

    // Team children precede teams.
    expect(members).toBeLessThan(teams);
    expect(invitations).toBeLessThan(teams);
    expect(teams).toBeLessThan(event);

    // Votes precede candidates, candidates precede campaigns.
    expect(votes).toBeLessThan(candidates);
    expect(candidates).toBeLessThan(campaigns);
    expect(campaigns).toBeLessThan(event);

    // Every direct child of Event is gone before Event itself goes.
    expect(registrations).toBeLessThan(event);
    expect(fields).toBeLessThan(event);
    expect(submissions).toBeLessThan(event);
    expect(emailLogs).toBeLessThan(event);
  });

  it('records the deletion and how much it destroyed', async () => {
    withDependents();

    await authed(request(app).delete(`/admin/api/portal/events/${EVENT_ID}`).send({ force: true }));

    expect(activityLog).toHaveBeenCalledTimes(1);
    const entry = activityLog.mock.calls[0][0];
    expect(entry.category).toBe('ADMIN');
    expect(entry.action).toBe('EVENT_DELETE');
    expect(entry.userEmail).toBe('admin@example.com');
    expect(entry.details).toContain('Campus Hackathon 2026');
    // 12 + 3 + 4 + 2 + 30 + 25
    expect(entry.details).toContain('76 dependent records');
  });

  it('surfaces a server error without pretending the delete succeeded', async () => {
    withDependents();
    // Stands in for the P2003 FK violation this whole cascade exists to prevent.
    eventDelete.mockRejectedValue(new Error('Foreign key constraint failed on the field: eventId'));

    const response = await authed(
      request(app).delete(`/admin/api/portal/events/${EVENT_ID}`).send({ force: true }),
    );

    expect(response.status).toBe(500);
    expect(response.body.success).toBeUndefined();
    expect(activityLog).not.toHaveBeenCalled();
  });
});

/**
 * Archive is the non-destructive counterpart to delete and the action the SRS
 * actually wants for retired events ("archivable rather than indiscriminately
 * deleted"). It must never touch dependent rows, which is precisely what makes it
 * safe to expose as a one-click alternative to the delete dialog.
 */
describe('Event archive', () => {
  const eventUpdate = prisma.event.update as unknown as ReturnType<typeof vi.fn>;

  it('requires an authenticated admin session', async () => {
    const response = await request(app).post(`/admin/api/portal/events/${EVENT_ID}/archive`);

    expect(response.status).toBe(401);
    expect(eventUpdate).not.toHaveBeenCalled();
  });

  it('flips the status to ARCHIVED', async () => {
    eventUpdate.mockResolvedValue({ ...mockEvent, status: 'ARCHIVED' });

    const response = await authed(request(app).post(`/admin/api/portal/events/${EVENT_ID}/archive`));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ARCHIVED');
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      data: { status: 'ARCHIVED' },
    });
  });

  it('leaves every dependent row alone', async () => {
    withDependents();
    eventUpdate.mockResolvedValue({ ...mockEvent, status: 'ARCHIVED' });

    await authed(request(app).post(`/admin/api/portal/events/${EVENT_ID}/archive`));

    // The whole safety argument for archive: a status write cannot trip the
    // ON DELETE RESTRICT graph, so it must not attempt any delete.
    expect(transaction).not.toHaveBeenCalled();
    expect(eventDelete).not.toHaveBeenCalled();
    expect(deleteManyMock('eventRegistration')).not.toHaveBeenCalled();
    expect(deleteManyMock('submission')).not.toHaveBeenCalled();
  });
});
