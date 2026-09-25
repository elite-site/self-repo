import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import adminAcademicYearRouter from '../src/routes/admin.academic-year.routes';
import { ActivityService } from '../src/services/activity.service';
import { promoteAcademicYear } from '../src/services/academicYear.service';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    student: {
      aggregate: vi.fn(),
      updateMany: vi.fn(),
    },
    portalSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../src/services/activity.service', () => ({
  ActivityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

const studentAggregate = prisma.student.aggregate as unknown as ReturnType<typeof vi.fn>;
const studentUpdateMany = prisma.student.updateMany as unknown as ReturnType<typeof vi.fn>;
const portalSettingsFindUnique = prisma.portalSettings.findUnique as unknown as ReturnType<typeof vi.fn>;
const portalSettingsUpsert = prisma.portalSettings.upsert as unknown as ReturnType<typeof vi.fn>;
const transaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const activityLog = ActivityService.log as unknown as ReturnType<typeof vi.fn>;

const transactionClient = {
  student: prisma.student,
  portalSettings: prisma.portalSettings,
};

const promotedSetting = {
  id: 'setting-promoted-year',
  key: 'promoted_academic_year',
  value: '5',
  group: 'academic_year',
  updatedAt: new Date('2026-09-25T00:00:00.000Z'),
  updatedBy: 'admin@example.com',
};

const routeApp = express();
routeApp.use(express.json());
routeApp.use('/api/admin/academic-year', adminAcademicYearRouter);

const adminToken = jwt.sign(
  { userId: 'admin-1', email: 'admin@example.com', username: 'admin' },
  env.JWT_SECRET
);

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
    callback(transactionClient)
  );
  studentAggregate.mockResolvedValue({ _max: { year: 4 } });
  portalSettingsFindUnique.mockResolvedValue(null);
  studentUpdateMany.mockResolvedValue({ count: 0 });
  portalSettingsUpsert.mockResolvedValue(promotedSetting);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('promoteAcademicYear', () => {
  it('returns promotion counts while graduating year 4+, incrementing years 1-3, and leaving year 0 unmatched', async () => {
    vi.useFakeTimers();
    const graduatedAt = new Date('2026-09-25T10:00:00.000Z');
    vi.setSystemTime(graduatedAt);
    studentUpdateMany.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 6 });

    await expect(promoteAcademicYear({ adminEmail: 'admin@example.com' })).resolves.toEqual({
      graduated: 2,
      promoted: 6,
      targetYear: 5,
    });

    expect(studentAggregate).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      _max: { year: true },
    });
    expect(studentUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { status: 'ACTIVE', year: { gte: 4 } },
      data: { status: 'GRADUATED', graduatedAt },
    });
    expect(studentUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { status: 'ACTIVE', year: { gte: 1, lt: 4 } },
      data: { year: { increment: 1 } },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a repeat promotion for the stored target year when force is not set', async () => {
    portalSettingsFindUnique.mockResolvedValue({ ...promotedSetting, value: '5' });

    await expect(promoteAcademicYear({ adminEmail: 'admin@example.com' })).rejects.toMatchObject({
      code: 'ALREADY_PROMOTED',
      targetYear: 5,
    });

    expect(studentUpdateMany).not.toHaveBeenCalled();
    expect(portalSettingsUpsert).not.toHaveBeenCalled();
    expect(activityLog).not.toHaveBeenCalled();
  });

  it('re-runs a previously promoted target year when force is true', async () => {
    portalSettingsFindUnique.mockResolvedValue({ ...promotedSetting, value: '5' });
    studentUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 3 });

    await expect(
      promoteAcademicYear({ adminEmail: 'admin@example.com', force: true })
    ).resolves.toEqual({
      graduated: 1,
      promoted: 3,
      targetYear: 5,
    });

    expect(studentUpdateMany).toHaveBeenCalledTimes(2);
    expect(portalSettingsUpsert).toHaveBeenCalledTimes(1);
    expect(activityLog).toHaveBeenCalledTimes(1);
  });

  it('rejects when no active students have a year to promote', async () => {
    studentAggregate.mockResolvedValue({ _max: { year: null } });

    await expect(promoteAcademicYear({ adminEmail: 'admin@example.com' })).rejects.toMatchObject({
      code: 'NO_ACTIVE_STUDENTS',
    });

    expect(portalSettingsFindUnique).not.toHaveBeenCalled();
    expect(studentUpdateMany).not.toHaveBeenCalled();
    expect(portalSettingsUpsert).not.toHaveBeenCalled();
    expect(activityLog).not.toHaveBeenCalled();
  });

  it('upserts the promotion guard and writes the admin audit entry', async () => {
    studentUpdateMany.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 6 });

    await promoteAcademicYear({ adminEmail: 'admin@example.com' });

    expect(portalSettingsUpsert).toHaveBeenCalledWith({
      where: { key: 'promoted_academic_year' },
      update: {
        value: '5',
        group: 'academic_year',
        updatedBy: 'admin@example.com',
      },
      create: {
        key: 'promoted_academic_year',
        value: '5',
        group: 'academic_year',
        updatedBy: 'admin@example.com',
      },
    });
    expect(activityLog).toHaveBeenCalledWith({
      category: 'ADMIN',
      action: 'PROMOTE_ACADEMIC_YEAR',
      details: 'Graduated 2 students; promoted 6 students; target year: 5.',
      userEmail: 'admin@example.com',
      status: 'SUCCESS',
    });
  });
});

describe('POST /api/admin/academic-year/promote', () => {
  it('requires admin authentication', async () => {
    const response = await request(routeApp).post('/api/admin/academic-year/promote');

    expect(response.status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns the promotion result with status 200', async () => {
    studentUpdateMany.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 6 });

    const response = await request(routeApp)
      .post('/api/admin/academic-year/promote')
      .set('Cookie', `${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ graduated: 2, promoted: 6, targetYear: 5 });
  });

  it('maps an already-promoted guard error to the documented 409 response', async () => {
    portalSettingsFindUnique.mockResolvedValue({ ...promotedSetting, value: '5' });

    const response = await request(routeApp)
      .post('/api/admin/academic-year/promote')
      .set('Cookie', `${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`)
      .send({});

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'ALREADY_PROMOTED',
      message: 'Already promoted for academic year 5 — run again anyway?',
      alreadyPromoted: true,
    });
  });

  it('maps an empty active roster to the documented 409 response', async () => {
    studentAggregate.mockResolvedValue({ _max: { year: null } });

    const response = await request(routeApp)
      .post('/api/admin/academic-year/promote')
      .set('Cookie', `${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`)
      .send({});

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'NO_ACTIVE_STUDENTS',
      message: 'No active students to promote.',
    });
  });

  it('logs unexpected failures without leaking their message', async () => {
    const sensitiveError = new Error('database password leaked here');
    studentAggregate.mockRejectedValue(sensitiveError);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await request(routeApp)
      .post('/api/admin/academic-year/promote')
      .set('Cookie', `${env.ADMIN_SESSION_COOKIE_NAME}=${adminToken}`)
      .send({ force: true });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'SERVER_ERROR',
      message: 'Internal server error',
    });
    expect(consoleError).toHaveBeenCalledWith('Error promoting academic year:', sensitiveError);
    consoleError.mockRestore();
  });
});
