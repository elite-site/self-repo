import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { driveService } from '../src/modules/media/drive';
import * as submissionsService from '../src/modules/admin/services/submissions.service';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    adminUser: { findUnique: vi.fn() },
    role: { findUnique: vi.fn() },
    roleAssignment: { create: vi.fn() },
  },
}));

vi.mock('../src/modules/media/drive', () => ({
  driveService: {
    ensureAllFilesViewerAccess: vi.fn(),
  },
}));

vi.mock('../src/modules/admin/services/submissions.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/modules/admin/services/submissions.service')>();
  return { ...actual, exportSubmissionsWorkbook: vi.fn() };
});

const adminToken = jwt.sign({ userId: 'admin-1', username: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function asAdmin<T extends { set(field: string, value: string): T }>(req: T): T {
  return req.set('Authorization', `Bearer ${adminToken}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /admin/api/roles/assign', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/admin/api/roles/assign').send({ adminId: 'a', roleId: 'r' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when the role id is missing', async () => {
    const res = await asAdmin(request(app).post('/admin/api/roles/assign').send({ adminId: 'admin-1' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual([{ field: 'roleId', message: expect.any(String) }]);
    expect(prisma.roleAssignment.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the admin does not exist', async () => {
    asMock(prisma.adminUser.findUnique).mockResolvedValue(null);
    asMock(prisma.role.findUnique).mockResolvedValue({ id: 'role-1' });

    const res = await asAdmin(
      request(app).post('/admin/api/roles/assign').send({ adminId: 'missing', roleId: 'role-1' })
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(prisma.roleAssignment.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the role does not exist', async () => {
    asMock(prisma.adminUser.findUnique).mockResolvedValue({ id: 'admin-1' });
    asMock(prisma.role.findUnique).mockResolvedValue(null);

    const res = await asAdmin(
      request(app).post('/admin/api/roles/assign').send({ adminId: 'admin-1', roleId: 'missing' })
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(prisma.roleAssignment.create).not.toHaveBeenCalled();
  });

  it('creates the assignment and returns it', async () => {
    asMock(prisma.adminUser.findUnique).mockResolvedValue({ id: 'admin-1' });
    asMock(prisma.role.findUnique).mockResolvedValue({ id: 'role-1', permissions: [] });
    asMock(prisma.roleAssignment.create).mockResolvedValue({ adminId: 'admin-1', roleId: 'role-1' });

    const res = await asAdmin(
      request(app).post('/admin/api/roles/assign').send({ adminId: 'admin-1', roleId: 'role-1' })
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      assignment: { adminId: 'admin-1', roleId: 'role-1' },
    });
    expect(prisma.roleAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { adminId: 'admin-1', roleId: 'role-1' } })
    );
  });

  it('reports an existing assignment as a conflict', async () => {
    asMock(prisma.adminUser.findUnique).mockResolvedValue({ id: 'admin-1' });
    asMock(prisma.role.findUnique).mockResolvedValue({ id: 'role-1', permissions: [] });
    asMock(prisma.roleAssignment.create).mockRejectedValue({ code: 'P2002' });

    const res = await asAdmin(
      request(app).post('/admin/api/roles/assign').send({ adminId: 'admin-1', roleId: 'role-1' })
    );

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
  });
});

describe('POST /admin/api/storage/ensure-viewer-permissions', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/admin/api/storage/ensure-viewer-permissions');
    expect(res.status).toBe(401);
  });

  it('returns the sweep counts', async () => {
    asMock(driveService.ensureAllFilesViewerAccess).mockResolvedValue({ count: 12, failed: 2 });

    const res = await asAdmin(request(app).post('/admin/api/storage/ensure-viewer-permissions'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: expect.stringContaining('12'),
      count: 12,
      failed: 2,
    });
  });

  it('wraps a Drive failure as an upstream error', async () => {
    asMock(driveService.ensureAllFilesViewerAccess).mockRejectedValue(new Error('drive token expired'));

    const res = await asAdmin(request(app).post('/admin/api/storage/ensure-viewer-permissions'));

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('UPSTREAM_FAILURE');
    expect(JSON.stringify(res.body)).not.toContain('drive token expired');
  });
});

describe('GET /admin/api/submissions/export', () => {
  const writeWorkbook = () => {
    const write = vi.fn((res: { end: () => void }) => {
      res.end();
      return Promise.resolve();
    });
    asMock(submissionsService.exportSubmissionsWorkbook).mockResolvedValue({
      workbook: { xlsx: { write } },
      filename: 'submissions.xlsx',
    });
    return write;
  };

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/admin/api/submissions/export');
    expect(res.status).toBe(401);
  });

  it('streams the xlsx for the requested event', async () => {
    const write = writeWorkbook();

    const res = await asAdmin(request(app).get('/admin/api/submissions/export?eventId=event-42'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(submissionsService.exportSubmissionsWorkbook).toHaveBeenCalledWith('event-42');
    expect(write).toHaveBeenCalled();
  });

  it('keeps /admin/api/export/excel working', async () => {
    writeWorkbook();

    const res = await asAdmin(request(app).get('/admin/api/export/excel'));

    expect(res.status).toBe(200);
    expect(submissionsService.exportSubmissionsWorkbook).toHaveBeenCalledWith(
      submissionsService.ACTIVE_EVENT_ID
    );
  });
});
