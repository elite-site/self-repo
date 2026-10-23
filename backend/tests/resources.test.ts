import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';
import { studentResourcesRouter, adminResourcesRouter } from '../src/modules/resources/resources.routes';
import {
  getAllowedSemesters,
  getCurrentSemester,
  isGoogleDriveUrl,
  formatDriveLinks,
  RESOURCE_SEMESTER_ACCESS_RULE,
} from '../src/modules/resources/resources.constants';
import {
  validateCreateResourceInput,
  validateUpdateResourceInput,
  validateStudentResourcesQuery,
} from '../src/modules/resources/resources.schemas';
import * as resourcesService from '../src/modules/resources/resources.service';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    resource: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
  },
}));

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use('/api/student/resources', studentResourcesRouter);
app.use('/admin/api/resources', adminResourcesRouter);

// Error handler middleware for testing
app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message,
    details: err.details,
  });
});

function createStudentToken(studentId: string, rollNo: string = '21IT001'): string {
  return jwt.sign(
    { studentId, rollNo, name: 'Test Student', email: 'student@gmrit.edu.in' },
    env.STUDENT_JWT_SECRET
  );
}

function createAdminToken(userId: string = 'admin-1'): string {
  return jwt.sign(
    { userId, username: 'ADMIN', email: 'admin@gmrit.edu.in' },
    env.JWT_SECRET
  );
}

describe('Resources Module — Step 1: Student year/semester logic', () => {
  it('correctly calculates allowed semesters for Year 1 student (Sem 1 and 2)', () => {
    const s1 = { year: 1, semester: 1 };
    expect(getAllowedSemesters(s1)).toEqual([1, 2]);
  });

  it('correctly calculates allowed semesters for Year 2 student (Sem 1 to 4)', () => {
    const s2 = { year: 2, semester: 4 };
    expect(getAllowedSemesters(s2)).toEqual([1, 2, 3, 4]);
  });

  it('correctly calculates allowed semesters for Year 3 student (Sem 1 to 6)', () => {
    const s3 = { year: 3, semester: 5 };
    expect(getAllowedSemesters(s3)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('correctly calculates allowed semesters for Year 4 student (Sem 1 to 8)', () => {
    const s4 = { year: 4, semester: 8 };
    expect(getAllowedSemesters(s4)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('calculates current semester correctly based on year or explicit semester', () => {
    expect(getCurrentSemester({ year: 1 })).toBe(1);
    expect(getCurrentSemester({ year: 2 })).toBe(3);
    expect(getCurrentSemester({ year: 3, semester: 6 })).toBe(6);
    expect(getCurrentSemester({ year: 4 })).toBe(7);
  });

  it('validates Google Drive URLs and parses preview and download links', () => {
    expect(isGoogleDriveUrl('https://drive.google.com/file/d/12345/view')).toBe(true);
    expect(isGoogleDriveUrl('https://docs.google.com/presentation/d/12345/edit')).toBe(true);
    expect(isGoogleDriveUrl('https://malicious-site.com/file.pdf')).toBe(false);
    expect(isGoogleDriveUrl('not-a-url')).toBe(false);

    const parsed = formatDriveLinks('https://drive.google.com/file/d/abc-123_xyz/view');
    expect(parsed.previewUrl).toBe('https://drive.google.com/file/d/abc-123_xyz/preview');
    expect(parsed.downloadUrl).toBe('https://drive.google.com/uc?export=download&id=abc-123_xyz');
  });
});

describe('Resources Module — Step 3: Backend data layer access enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a 3rd-year student to query Semesters 1 through 6', async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: 'student-3rd-year',
      year: 3,
      semester: 5,
      name: 'Third Year Student',
      rollNo: '22IT045',
    } as any);

    vi.mocked(prisma.resource.findMany).mockResolvedValue([
      {
        id: 'res-5',
        title: 'Computer Networks Notes',
        year: 3,
        semester: 5,
        subject: 'Computer Networks',
        type: 'NOTES',
        driveLink: 'https://drive.google.com/file/d/sample/view',
        uploadedBy: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const token = createStudentToken('student-3rd-year');
    const res = await request(app)
      .get('/api/student/resources?semester=5')
      .set('Cookie', [`pc_student_session=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(1);
    expect(res.body.allowedSemesters).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('strictly blocks a 3rd-year student from accessing Semester 7 (returns 403 Forbidden)', async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: 'student-3rd-year',
      year: 3,
      semester: 5,
      name: 'Third Year Student',
      rollNo: '22IT045',
    } as any);

    const token = createStudentToken('student-3rd-year');
    const res = await request(app)
      .get('/api/student/resources?semester=7')
      .set('Cookie', [`pc_student_session=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(res.body.message).toContain('Access denied');
    expect(prisma.resource.findMany).not.toHaveBeenCalled();
  });

  it('strictly blocks a 3rd-year student from accessing Semester 8 (returns 403 Forbidden)', async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: 'student-3rd-year',
      year: 3,
      semester: 6,
      name: 'Third Year Student',
      rollNo: '22IT045',
    } as any);

    const token = createStudentToken('student-3rd-year');
    const res = await request(app)
      .get('/api/student/resources?semester=8')
      .set('Cookie', [`pc_student_session=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(prisma.resource.findMany).not.toHaveBeenCalled();
  });

  it('strictly blocks a 2nd-year student from accessing Semester 5 (returns 403 Forbidden)', async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: 'student-2nd-year',
      year: 2,
      semester: 4,
      name: 'Second Year Student',
      rollNo: '23IT012',
    } as any);

    const token = createStudentToken('student-2nd-year');
    const res = await request(app)
      .get('/api/student/resources?semester=5')
      .set('Cookie', [`pc_student_session=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(prisma.resource.findMany).not.toHaveBeenCalled();
  });

  it('ensures unfiltered queries at the data layer never fetch future semesters', async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: 'student-3rd-year',
      year: 3,
      semester: 5,
      name: 'Third Year Student',
      rollNo: '22IT045',
    } as any);

    vi.mocked(prisma.resource.findMany).mockResolvedValue([]);

    const token = createStudentToken('student-3rd-year');
    const res = await request(app)
      .get('/api/student/resources')
      .set('Cookie', [`pc_student_session=${token}`]);

    expect(res.status).toBe(200);
    // Verify that Prisma findMany was called with semester IN [1, 2, 3, 4, 5, 6] only!
    expect(prisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          semester: { in: [1, 2, 3, 4, 5, 6] },
        }),
      })
    );
  });
});

describe('Resources Module — Step 5: Admin / coordinator upload and validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects resource creation if user is unauthenticated or not an admin', async () => {
    const res = await request(app)
      .post('/admin/api/resources')
      .send({
        title: 'Unauthorized Resource',
        year: 1,
        semester: 1,
        subject: 'Math',
        type: 'NOTES',
        drive_link: 'https://drive.google.com/file/d/test/view',
      });

    expect(res.status).toBe(401);
  });

  it('rejects resource creation when drive_link is not a valid Google Drive URL', async () => {
    const token = createAdminToken();
    const res = await request(app)
      .post('/admin/api/resources')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bad Link Resource',
        year: 1,
        semester: 1,
        subject: 'Math',
        type: 'NOTES',
        drive_link: 'https://dropbox.com/s/somefile.pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.message).toContain('Validation failed');
  });

  it('allows an authenticated admin to create a resource with a valid Google Drive link', async () => {
    vi.mocked(prisma.resource.create).mockResolvedValue({
      id: 'res-new-1',
      title: 'Valid Google Drive Notes',
      year: 2,
      semester: 3,
      subject: 'Data Structures',
      type: 'NOTES',
      driveLink: 'https://drive.google.com/file/d/1234567890/view',
      uploadedBy: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const token = createAdminToken();
    const res = await request(app)
      .post('/admin/api/resources')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Valid Google Drive Notes',
        year: 2,
        semester: 3,
        subject: 'Data Structures',
        type: 'NOTES',
        drive_link: 'https://drive.google.com/file/d/1234567890/view',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.resource.id).toBe('res-new-1');
    expect(res.body.resource.previewUrl).toContain('/preview');
  });

  it('allows an admin to update and delete a resource', async () => {
    vi.mocked(prisma.resource.findUnique).mockResolvedValue({
      id: 'res-1',
      title: 'Old Title',
    } as any);
    vi.mocked(prisma.resource.update).mockResolvedValue({
      id: 'res-1',
      title: 'Updated Title',
      year: 1,
      semester: 1,
      subject: 'Math',
      type: 'NOTES',
      driveLink: 'https://drive.google.com/file/d/abc/view',
      uploadedBy: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(prisma.resource.delete).mockResolvedValue({ id: 'res-1' } as any);

    const token = createAdminToken();
    const updateRes = await request(app)
      .put('/admin/api/resources/res-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.resource.title).toBe('Updated Title');

    const deleteRes = await request(app)
      .delete('/admin/api/resources/res-1')
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
