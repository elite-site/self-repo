import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/prisma', () => {
  return {
    prisma: {
      student: {
        findUnique: vi.fn(),
      },
      studentProfile: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      skill: {
        findMany: vi.fn(),
        createMany: vi.fn(),
      },
      studentSkill: {
        findMany: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      submission: {
        findFirst: vi.fn(),
      },
      changeRequest: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      skillRequest: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      achievement: {
        create: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

const studentPayload = {
  studentId: 'stud_123',
  rollNo: '23K61A1201',
  name: 'Test Student',
  email: 'test@sasi.ac.in',
};

const token = jwt.sign(studentPayload, env.STUDENT_JWT_SECRET);

vi.mock('../src/services/drive.service', () => ({
  driveService: {
    uploadFile: vi.fn(),
  },
}));

import { driveService } from '../src/services/drive.service';

describe('Student Profile Data Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Profile Fields (Bio, LinkedIn, GitHub, Portfolio)', () => {
    it('persists bio and linkedinUrl without being overwritten by old biography in spread', async () => {
      (prisma.studentProfile.upsert as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'prof_1',
        studentId: 'stud_123',
        biography: 'Newly edited bio',
        linkedinUrl: 'https://linkedin.com/in/teststudent',
        githubUrl: 'https://github.com/teststudent',
        portfolioUrl: 'https://teststudent.dev',
      });

      // Simulate the payload sent from frontend with new bio and linkedinUrl
      const res = await request(app)
        .put('/api/student/profile')
        .set('Cookie', `pc_student_session=${token}`)
        .send({
          biography: 'Old bio that was in profile', // from stale spread
          bio: 'Newly edited bio', // user edited field
          linkedinUrl: 'https://linkedin.com/in/teststudent',
          githubUrl: 'https://github.com/teststudent',
          portfolioUrl: 'https://teststudent.dev',
        });

      expect(res.status).toBe(200);
      expect(prisma.studentProfile.upsert).toHaveBeenCalledWith({
        where: { studentId: 'stud_123' },
        update: {
          biography: 'Newly edited bio',
          linkedinUrl: 'https://linkedin.com/in/teststudent',
          githubUrl: 'https://github.com/teststudent',
          portfolioUrl: 'https://teststudent.dev',
        },
        create: expect.objectContaining({
          studentId: 'stud_123',
          biography: 'Newly edited bio',
          linkedinUrl: 'https://linkedin.com/in/teststudent',
        }),
      });
    });

    it('returns persisted bio, linkedinUrl, and photo crop coordinates in GET /api/student/profile', async () => {
      (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'stud_123',
        rollNo: '23K61A1201',
        name: 'Test Student',
        year: 3,
        section: 'A',
        branch: 'IT',
        email: 'test@sasi.ac.in',
        profile: {
          id: 'prof_1',
          biography: 'Newly edited bio',
          photoUrl: '/api/public/media/photo/mock_drive_id',
          photoDriveId: 'mock_drive_id',
          photoOffsetX: 25.5,
          photoOffsetY: -10.2,
          photoZoom: 1.5,
          githubUrl: 'https://github.com/teststudent',
          linkedinUrl: 'https://linkedin.com/in/teststudent',
          portfolioUrl: 'https://teststudent.dev',
          skills: [
            { skill: { id: 'sk_1', name: 'TypeScript' } },
            { skill: { id: 'sk_2', name: 'React' } },
          ],
          isPublic: true,
        },
        changeRequests: [],
      });
      (prisma.submission.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/student/profile')
        .set('Cookie', `pc_student_session=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.bio).toBe('Newly edited bio');
      expect(res.body.linkedinUrl).toBe('https://linkedin.com/in/teststudent');
      expect(res.body.photoOffsetX).toBe(25.5);
      expect(res.body.photoOffsetY).toBe(-10.2);
      expect(res.body.photoZoom).toBe(1.5);
      expect(res.body.skills).toEqual(['TypeScript', 'React']);
    });
  });

  describe('2. Technical Skills Persistence (PUT /skills)', () => {
    it('accepts skill names, resolves existing and auto-creates missing skills in join table', async () => {
      (prisma.studentProfile.upsert as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'prof_1',
        studentId: 'stud_123',
      });

      // 'TypeScript' exists, 'Next.js' is new
      (prisma.skill.findMany as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ id: 'sk_1', name: 'TypeScript' }]) // initial find
        .mockResolvedValueOnce([{ id: 'sk_2', name: 'Next.js' }]); // find after creation

      (prisma.skill.createMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.studentSkill.deleteMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (prisma.studentSkill.createMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });
      (prisma.studentSkill.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
        { skill: { id: 'sk_1', name: 'TypeScript' } },
        { skill: { id: 'sk_2', name: 'Next.js' } },
      ]);

      const res = await request(app)
        .put('/api/student/profile/skills')
        .set('Cookie', `pc_student_session=${token}`)
        .send({
          skillNames: ['TypeScript', 'Next.js'],
        });

      expect(res.status).toBe(200);
      expect(prisma.studentSkill.deleteMany).toHaveBeenCalledWith({ where: { profileId: 'prof_1' } });
      expect(prisma.studentSkill.createMany).toHaveBeenCalledWith({
        data: [
          { profileId: 'prof_1', skillId: 'sk_1' },
          { profileId: 'prof_1', skillId: 'sk_2' },
        ],
        skipDuplicates: true,
      });
      expect(res.body.skills).toHaveLength(2);
    });
  });

  describe('3. Honors & Achievements Persistence', () => {
    it('creates an achievement with organization, date, and default PENDING status', async () => {
      const now = new Date('2026-09-01T00:00:00.000Z');
      (prisma.achievement.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ach_1',
        studentId: 'stud_123',
        title: 'Smart India Hackathon 1st Place',
        description: 'Built AI-powered drone vision system',
        organization: 'Ministry of Education',
        achievedAt: now,
        status: 'APPROVED',
      });

      const res = await request(app)
        .post('/api/student/portfolio/achievements')
        .set('Cookie', `pc_student_session=${token}`)
        .send({
          title: 'Smart India Hackathon 1st Place',
          description: 'Built AI-powered drone vision system',
          organization: 'Ministry of Education',
          date: '2026-09-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Smart India Hackathon 1st Place');
      expect(res.body.organizationName).toBe('Ministry of Education');
      expect(res.body.status).toBe('APPROVED');
      expect(prisma.achievement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: 'stud_123',
          title: 'Smart India Hackathon 1st Place',
          organization: 'Ministry of Education',
          status: 'APPROVED',
        }),
      });
    });
  });

  describe('4. Profile Photo Storage', () => {
    it('stores the photo in Drive and returns a resolvable media path', async () => {
      (driveService.uploadFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('drive_photo_1');
      (prisma.studentProfile.upsert as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'prof_1',
        studentId: 'stud_123',
        photoDriveId: 'drive_photo_1',
        photoUrl: '/api/public/media/photo/drive_photo_1',
        photoOffsetX: 0,
        photoOffsetY: 0,
        photoZoom: 1,
      });

      const res = await request(app)
        .post('/api/student/profile/photo')
        .set('Cookie', `pc_student_session=${token}`)
        .attach('photo', Buffer.from('fake-jpeg-bytes'), 'me.jpg');

      expect(res.status).toBe(200);
      expect(driveService.uploadFile).toHaveBeenCalled();
      expect(res.body.photoUrl).toBe('/api/public/media/photo/drive_photo_1');
    });

    it('reports a storage failure instead of silently saving a placeholder photoUrl', async () => {
      // The route used to swallow this error and persist photoUrl: 'mock_url',
      // which left the student with a permanently broken avatar and no clue why.
      (driveService.uploadFile as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Drive unavailable'),
      );

      const res = await request(app)
        .post('/api/student/profile/photo')
        .set('Cookie', `pc_student_session=${token}`)
        .attach('photo', Buffer.from('fake-jpeg-bytes'), 'me.jpg');

      expect(res.status).toBe(502);
      expect(res.body.photoUrl).toBeUndefined();
      expect(res.body.message).toBeTruthy();
      expect(prisma.studentProfile.upsert).not.toHaveBeenCalled();
    });
  });
});
