import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { asyncHandler } from '../src/utils/asyncHandler';
import { errorHandler } from '../src/middleware/errorHandler';
import { NotFoundError } from '../src/utils/appError';

vi.mock('../src/modules/events/events.service', () => ({
  getAdminEventsList: vi.fn(),
  getStudentEventById: vi.fn(),
  createPortalEvent: vi.fn(),
  deletePortalEvent: vi.fn(),
}));

vi.mock('../src/modules/public/public.repository', () => ({
  findSubmissionByEventAndStudent: vi.fn(),
  findEventById: vi.fn(),
  createEventRecord: vi.fn(),
}));

vi.mock('../src/modules/public/public.service', () => ({
  getPublicEventsList: vi.fn(),
  getPublicEventDetail: vi.fn(),
}));

vi.mock('../src/modules/media/drive', () => ({
  driveService: {
    uploadSubmissionFiles: vi.fn(),
    generateThumbnail: vi.fn(),
  },
}));

vi.mock('../src/modules/admin', () => ({
  ActivityService: { logNonBlocking: vi.fn(), log: vi.fn() },
}));

vi.mock('../src/services/validation.service', () => ({
  ValidationService: { validateVideo: vi.fn() },
}));

import * as eventsService from '../src/modules/events/events.service';
import {
  getAdminEvents,
  getStudentEventById,
  createPortalEvent,
  deletePortalEvent,
} from '../src/modules/events/events.controller';
import { submitLegacyApplication } from '../src/modules/public/controllers/public.meta.controller';

const listEvents = eventsService.getAdminEventsList as unknown as ReturnType<typeof vi.fn>;
const getEventById = eventsService.getStudentEventById as unknown as ReturnType<typeof vi.fn>;
const createEvent = eventsService.createPortalEvent as unknown as ReturnType<typeof vi.fn>;
const deleteEvent = eventsService.deletePortalEvent as unknown as ReturnType<typeof vi.fn>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/admin/api/events', asyncHandler(getAdminEvents));
  app.get('/api/student/events/:id', asyncHandler(getStudentEventById));
  app.post('/admin/portal/events', asyncHandler(createPortalEvent));
  app.delete('/admin/portal/events/:id', asyncHandler(deletePortalEvent));
  app.post('/api/submissions', asyncHandler(submitLegacyApplication));
  app.use(errorHandler);
  return app;
}

const app = buildApp();
const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe('controller failures reach the central error handler', () => {
  it('returns a 500 for a failed admin events list instead of hanging', async () => {
    listEvents.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432'));

    const res = await request(app).get('/admin/api/events');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.requestId).toBeDefined();
  });

  it('does not leak internal error text for an unknown failure', async () => {
    // Production is where the generic message is required; the handler reads
    // NODE_ENV per request, so this exercises the deployed behaviour.
    process.env.NODE_ENV = 'production';
    listEvents.mockRejectedValue(
      new Error('PrismaClientKnownRequestError: relation "Student" does not exist at /srv/app/src/db.ts:42'),
    );

    const res = await request(app).get('/admin/api/events');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.message).toBe('An unexpected error occurred. Please try again later.');
    expect(JSON.stringify(res.body)).not.toContain('PrismaClientKnownRequestError');
    expect(JSON.stringify(res.body)).not.toContain('/srv/app');
    expect(res.body.stack).toBeUndefined();
  });

  it('returns 404 with the standard envelope when the resource is missing', async () => {
    getEventById.mockRejectedValue(new NotFoundError('Event not found'));

    const res = await request(app).get('/api/student/events/missing-event');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      error: 'NOT_FOUND',
      message: 'Event not found',
    });
    expect(res.body.requestId).toBeDefined();
  });

  it('returns 400 with field details for invalid input', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .send({ email: 'student@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.message).toBe('Roll number is required.');
    expect(res.body.details).toEqual([
      { field: 'rollNo', message: 'Roll number is required.' },
    ]);
    expect(res.body.requestId).toBeDefined();
  });

  it('keeps the delete-confirmation conflict body the admin client reads', async () => {
    deleteEvent.mockResolvedValue({
      confirmationRequired: true,
      error: 'CONFIRMATION_REQUIRED',
      message: 'This event has 2 dependent record(s).',
      dependents: { registrations: 2 },
    });

    const res = await request(app).delete('/admin/portal/events/event-1');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFIRMATION_REQUIRED');
    expect(res.body.confirmationRequired).toBe(true);
    expect(res.body.dependents).toEqual({ registrations: 2 });
  });

  it('keeps the success body unchanged for the admin events list', async () => {
    listEvents.mockResolvedValue([{ id: 'event-1', name: 'Sample Event' }]);

    const res = await request(app).get('/admin/api/events');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ events: [{ id: 'event-1', name: 'Sample Event' }] });
  });

  it('still validates event payloads before calling the service', async () => {
    const res = await request(app)
      .post('/admin/portal/events')
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(createEvent).not.toHaveBeenCalled();
  });
});
