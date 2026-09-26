import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import publicStudentsRouter from '../src/routes/public.students.routes';
import portfolioRouter from '../src/routes/student.portfolio.routes';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    skill: {
      findMany: vi.fn(),
    },
    certificate: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock requireStudentAuth / auth middleware for student routes
vi.mock('../src/middleware/studentAuth', () => ({
  requireStudentAuth: (req: any, _res: any, next: any) => {
    req.student = { studentId: 'student_123', rollNo: '23A91A1201' };
    req.studentId = 'student_123';
    next();
  },
}));

vi.mock('../src/services/drive.service', () => ({
  driveService: {
    uploadFile: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/public/students', publicStudentsRouter);
app.use('/api/student/portfolio', (req: any, _res: any, next: any) => {
  req.studentId = 'student_123';
  next();
}, portfolioRouter);

describe('Public Students Routes & Visibility Overhaul', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/public/students/:rollNo', () => {
    it('returns 200 with profile shell when student has no profile row (reachable and un-gated)', async () => {
      (prisma.student.findUnique as any).mockResolvedValue({
        id: 'student_empty',
        rollNo: '23A91A1200',
        name: 'Empty Profile Student',
        year: 2,
        section: 'A',
        status: 'ACTIVE',
        profile: null,
        projects: [],
        achievements: [],
        certificates: [],
        resumes: [],
        introVideos: [],
      });

      const res = await request(app).get('/api/public/students/23A91A1200');

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=60');
      expect(res.body.rollNo).toBe('23A91A1200');
      expect(res.body.name).toBe('Empty Profile Student');
      expect(res.body.profile).toBeNull();
      expect(res.body.certificates).toEqual([]);
    });

    it('returns 404 only when student is truly not in the roster', async () => {
      (prisma.student.findUnique as any).mockResolvedValue(null);

      const res = await request(app).get('/api/public/students/INVALID_ROLL');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('filters certificates to only approved AND isPublic=true', async () => {
      (prisma.student.findUnique as any).mockResolvedValue({
        id: 'student_with_certs',
        rollNo: '23A91A1205',
        name: 'Active Student',
        year: 3,
        section: 'B',
        profile: {
          id: 'prof_1',
          photoUrl: '/api/public/media/photo/prof_1',
          photoOffsetX: 45,
          photoOffsetY: 55,
          photoZoom: 1.2,
          skills: [],
        },
        projects: [],
        achievements: [],
        certificates: [
          {
            id: 'cert_pub_1',
            title: 'AWS Certified Cloud Practitioner',
            issuer: 'Amazon Web Services',
            fileDriveId: 'drive_cert_1',
            status: 'APPROVED',
            isPublic: true,
          },
        ],
        resumes: [],
        introVideos: [],
      });

      const res = await request(app).get('/api/public/students/23A91A1205');

      expect(res.status).toBe(200);
      expect(prisma.student.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            certificates: { where: { status: 'APPROVED', isPublic: true } },
          }),
        })
      );
      expect(res.body.certificates).toHaveLength(1);
      expect(res.body.certificates[0].id).toBe('cert_pub_1');
      expect(res.body.certificates[0].fileDriveId).toBeUndefined(); // Drive ID masked
      expect(res.body.certificates[0].viewUrl).toBe('/api/public/media/certificate/cert_pub_1');
      expect(res.body.profile.photoOffsetX).toBe(45);
      expect(res.body.profile.photoZoom).toBe(1.2);
    });
  });

  describe('GET /api/public/students (Unified Search & Pagination)', () => {
    it('sets Cache-Control: public, max-age=60 and performs unified search matching skill names', async () => {
      (prisma.student.count as any).mockResolvedValue(1);
      (prisma.student.findMany as any).mockResolvedValue([
        {
          id: 'student_react',
          rollNo: '23A91A1250',
          name: 'React Developer',
          year: 3,
          section: 'A',
          status: 'ACTIVE',
          profile: {
            id: 'prof_react',
            photoUrl: null,
            photoOffsetX: 50,
            photoOffsetY: 50,
            photoZoom: 1,
            biography: 'Loves frontend',
            skills: [{ skill: { name: 'React' } }],
          },
        },
      ]);

      const res = await request(app).get('/api/public/students?search=react&page=1&limit=20');

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=60');
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.totalPages).toBe(1);
      expect(res.body.students).toHaveLength(1);
      expect(res.body.students[0].name).toBe('React Developer');

      // Verify Prisma query checked name, rollNo, and skill name
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'react', mode: 'insensitive' } },
              { rollNo: { contains: 'react', mode: 'insensitive' } },
              {
                profile: {
                  skills: {
                    some: {
                      skill: { name: { contains: 'react', mode: 'insensitive' } },
                    },
                  },
                },
              },
            ]),
          }),
        })
      );
    });

    it('paginates results accurately with page and limit params', async () => {
      (prisma.student.count as any).mockResolvedValue(73);
      (prisma.student.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/public/students?page=2&limit=50');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(73);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(50);
      expect(res.body.totalPages).toBe(2);

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 50,
        })
      );
    });
  });

  describe('GET /api/public/students/skills', () => {
    it('returns active skills list with Cache-Control: public, max-age=300', async () => {
      (prisma.skill.findMany as any).mockResolvedValue([
        { id: 'sk_1', name: 'Python', category: 'Backend' },
        { id: 'sk_2', name: 'React', category: 'Frontend' },
      ]);

      const res = await request(app).get('/api/public/students/skills');

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=300');
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Python');
    });
  });

  describe('PATCH /api/student/portfolio/certificates/:id/visibility', () => {
    it('allows toggling isPublic for an approved certificate', async () => {
      (prisma.certificate.findFirst as any).mockResolvedValue({
        id: 'cert_1',
        studentId: 'student_123',
        status: 'APPROVED',
        isPublic: false,
      });
      (prisma.certificate.update as any).mockResolvedValue({
        id: 'cert_1',
        isPublic: true,
        status: 'APPROVED',
      });

      const res = await request(app)
        .patch('/api/student/portfolio/certificates/cert_1/visibility')
        .send({ isPublic: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isPublic).toBe(true);
    });

    it('rejects toggling isPublic on an unapproved certificate with 409 NOT_APPROVED', async () => {
      (prisma.certificate.findFirst as any).mockResolvedValue({
        id: 'cert_pending',
        studentId: 'student_123',
        status: 'PENDING',
        isPublic: false,
      });

      const res = await request(app)
        .patch('/api/student/portfolio/certificates/cert_pending/visibility')
        .send({ isPublic: true });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('NOT_APPROVED');
    });

    it('rejects invalid payload with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch('/api/student/portfolio/certificates/cert_1/visibility')
        .send({ isPublic: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });
});
