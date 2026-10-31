import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { asyncHandler } from '../src/utils/asyncHandler';
import { errorHandler } from '../src/middleware/errorHandler';
import { requestIdMiddleware } from '../src/middleware/requestId';
import { ConflictError, NotFoundError } from '../src/utils/appError';

// Stub the barrel the controllers call. Returning an explicit surface (rather
// than importOriginal) keeps every rejection below the controller.
vi.mock('../src/modules/admin/admin.service', () => ({
  ACTIVE_EVENT_ID: 'event-test',
  listSubmissions: vi.fn(),
  getSubmissionDetail: vi.fn(),
  updateStatus: vi.fn(),
  deleteSubmission: vi.fn(),
  getStudentRoster: vi.fn(),
  getPortalStudentDetail: vi.fn(),
  listRoles: vi.fn(),
  createRole: vi.fn(),
  assignRole: vi.fn(),
  getPortalSettings: vi.fn(),
  publishPortalAnnouncement: vi.fn(),
  getStorageInfo: vi.fn(),
  getAdminStats: vi.fn(),
  getActivityLogs: vi.fn(),
}));

vi.mock('../src/modules/admin/services/academicYear.service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/modules/admin/services/academicYear.service')>();
  return { ...actual, promoteAcademicYear: vi.fn() };
});

import * as adminService from '../src/modules/admin/admin.service';
import { promoteAcademicYear as runPromotion } from '../src/modules/admin/services/academicYear.service';
import { AcademicYearPromotionError } from '../src/modules/admin/admin.errors';
import {
  deleteSubmission,
  getSubmissionDetail,
  listSubmissions,
  updateStatus,
} from '../src/modules/admin/controllers/submissions.controller';
import {
  getPortalStudentDetail,
  getRoster,
  promoteAcademicYear,
} from '../src/modules/admin/controllers/students.controller';
import {
  assignRole,
  createRole,
  listRoles,
} from '../src/modules/admin/controllers/roles.controller';
import {
  getPortalSettings,
  publishPortalAnnouncement,
} from '../src/modules/admin/controllers/settings.controller';
import { getStorage } from '../src/modules/admin/controllers/storage.controller';
import { getStats } from '../src/modules/admin/controllers/stats.controller';
import { getActivityLogs } from '../src/modules/admin/controllers/activity-log.controller';

type MockFn = ReturnType<typeof vi.fn>;

const listSubmissionsMock = adminService.listSubmissions as unknown as MockFn;
const getSubmissionDetailMock = adminService.getSubmissionDetail as unknown as MockFn;
const updateStatusMock = adminService.updateStatus as unknown as MockFn;
const deleteSubmissionMock = adminService.deleteSubmission as unknown as MockFn;
const getStudentRosterMock = adminService.getStudentRoster as unknown as MockFn;
const getPortalStudentDetailMock = adminService.getPortalStudentDetail as unknown as MockFn;
const listRolesMock = adminService.listRoles as unknown as MockFn;
const createRoleMock = adminService.createRole as unknown as MockFn;
const assignRoleMock = adminService.assignRole as unknown as MockFn;
const getPortalSettingsMock = adminService.getPortalSettings as unknown as MockFn;
const publishAnnouncementMock = adminService.publishPortalAnnouncement as unknown as MockFn;
const getStorageInfoMock = adminService.getStorageInfo as unknown as MockFn;
const getAdminStatsMock = adminService.getAdminStats as unknown as MockFn;
const getActivityLogsMock = adminService.getActivityLogs as unknown as MockFn;
const promoteMock = runPromotion as unknown as MockFn;

const INTERNAL_TEXT = 'PrismaClientKnownRequestError: relation "Student" does not exist at /srv/app/src/db.ts:42';
const GENERIC_MESSAGE = 'An unexpected error occurred. Please try again later.';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);

  app.get('/submissions', asyncHandler(listSubmissions));
  app.get('/submissions/:id', asyncHandler(getSubmissionDetail));
  app.patch('/submissions/:id/status', asyncHandler(updateStatus));
  app.delete('/submissions/:id', asyncHandler(deleteSubmission));

  app.get('/students', asyncHandler(getRoster));
  app.get('/students/:id', asyncHandler(getPortalStudentDetail));
  app.post('/academic-year/promote', asyncHandler(promoteAcademicYear));

  app.get('/roles', asyncHandler(listRoles));
  app.post('/roles', asyncHandler(createRole));
  app.post('/roles/assign', asyncHandler(assignRole));

  app.get('/settings', asyncHandler(getPortalSettings));
  app.post('/announcements/:id/publish', asyncHandler(publishPortalAnnouncement));
  app.get('/storage', asyncHandler(getStorage));
  app.get('/stats', asyncHandler(getStats));
  app.get('/activity-logs', asyncHandler(getActivityLogs));

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

describe('admin controller failures use the central error envelope', () => {
  const genericFailureCases: Array<[string, string, () => void]> = [
    ['submissions list', '/submissions', () => listSubmissionsMock.mockRejectedValue(new Error(INTERNAL_TEXT))],
    ['student roster', '/students', () => getStudentRosterMock.mockRejectedValue(new Error(INTERNAL_TEXT))],
    ['roles list', '/roles', () => listRolesMock.mockRejectedValue(new Error(INTERNAL_TEXT))],
    ['portal settings', '/settings', () => getPortalSettingsMock.mockRejectedValue(new Error(INTERNAL_TEXT))],
    ['storage info', '/storage', () => getStorageInfoMock.mockRejectedValue(new Error(INTERNAL_TEXT))],
    ['admin stats', '/stats', () => getAdminStatsMock.mockRejectedValue(new Error(INTERNAL_TEXT))],
    ['activity log', '/activity-logs', () => getActivityLogsMock.mockRejectedValue(new Error(INTERNAL_TEXT))],
  ];

  it.each(genericFailureCases)(
    'returns a generic 500 for an unexpected %s failure',
    async (_label, path, arrange) => {
      process.env.NODE_ENV = 'production';
      arrange();

      const res = await request(app).get(path);

      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({ error: 'INTERNAL_SERVER_ERROR', message: GENERIC_MESSAGE });
      expect(res.body.requestId).toMatch(/^req_/);
      expect(JSON.stringify(res.body)).not.toContain('PrismaClientKnownRequestError');
      expect(JSON.stringify(res.body)).not.toContain('/srv/app');
      expect(res.body.stack).toBeUndefined();
    }
  );

  it('returns 404 with the standard envelope when a submission is missing', async () => {
    getSubmissionDetailMock.mockResolvedValue(null);

    const res = await request(app).get('/submissions/missing');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND', message: 'Submission not found' });
    expect(res.body.requestId).toMatch(/^req_/);
  });

  it('propagates a service not-found error unchanged', async () => {
    updateStatusMock.mockRejectedValue(new NotFoundError('Submission not found'));

    const res = await request(app).patch('/submissions/missing/status').send({ status: 'REVIEWED' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND', message: 'Submission not found' });
    expect(res.body.requestId).toMatch(/^req_/);
  });

  it('keeps the domain conflict code for a refused submission delete', async () => {
    deleteSubmissionMock.mockRejectedValue(
      new ConflictError('This submission already has a published video.', 'DELETE_BLOCKED')
    );

    const res = await request(app).delete('/submissions/sub-1');

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      error: 'DELETE_BLOCKED',
      message: 'This submission already has a published video.',
    });
    expect(res.body.requestId).toMatch(/^req_/);
  });

  it('maps the academic-year guard to a 409 with the forced re-run flag', async () => {
    promoteMock.mockRejectedValue(new AcademicYearPromotionError('ALREADY_PROMOTED', '2026'));

    const res = await request(app).post('/academic-year/promote').send({});

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      error: 'ALREADY_PROMOTED',
      message: 'Already promoted for academic year 2026 — run again anyway?',
      alreadyPromoted: true,
    });
    expect(res.body.requestId).toMatch(/^req_/);
  });

  it('maps an empty academic-year roster to a 409', async () => {
    promoteMock.mockRejectedValue(new AcademicYearPromotionError('NO_ACTIVE_STUDENTS'));

    const res = await request(app).post('/academic-year/promote').send({});

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      error: 'NO_ACTIVE_STUDENTS',
      message: 'No active students to promote.',
    });
    expect(res.body.requestId).toMatch(/^req_/);
  });

  it('propagates a missing student as a 404', async () => {
    getPortalStudentDetailMock.mockRejectedValue(new NotFoundError('Student not found'));

    const res = await request(app).get('/students/missing');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND', message: 'Student not found' });
    expect(res.body.requestId).toMatch(/^req_/);
  });

  it('returns 400 with field details for an invalid role assignment', async () => {
    const res = await request(app).post('/roles/assign').send({ adminId: 'admin-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual([{ field: 'roleId', message: expect.any(String) }]);
    expect(res.body.requestId).toMatch(/^req_/);
    expect(assignRoleMock).not.toHaveBeenCalled();
  });

  it('reports a duplicate role as a conflict through the Prisma mapping', async () => {
    createRoleMock.mockRejectedValue({ code: 'P2002' });

    const res = await request(app).post('/roles').send({ name: 'Reviewer' });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: 'CONFLICT' });
    expect(res.body.requestId).toMatch(/^req_/);
  });

  it('propagates a missing announcement as a 404', async () => {
    publishAnnouncementMock.mockRejectedValue(new NotFoundError('Announcement not found'));

    const res = await request(app).post('/announcements/missing/publish');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND', message: 'Announcement not found' });
    expect(res.body.requestId).toMatch(/^req_/);
  });
});

describe('admin controller success bodies are unchanged', () => {
  it('returns the paginated submissions payload as-is', async () => {
    const payload = {
      eventId: 'event-1',
      data: [{ id: 'sub-1' }],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    };
    listSubmissionsMock.mockResolvedValue(payload);

    const res = await request(app).get('/submissions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(payload);
  });

  it('returns the stats payload as-is', async () => {
    const stats = { totalSubmissions: 3, pendingReviews: 1 };
    getAdminStatsMock.mockResolvedValue({ data: stats, cached: false });

    const res = await request(app).get('/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(stats);
  });
});
