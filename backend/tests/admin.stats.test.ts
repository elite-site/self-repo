import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/infrastructure/prisma';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    submission: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    student: {
      count: vi.fn(),
    },
    studentProfile: {
      count: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    achievement: {
      count: vi.fn(),
    },
    certificate: {
      count: vi.fn(),
    },
    resume: {
      count: vi.fn(),
    },
    event: {
      count: vi.fn(),
    },
    eventRegistration: {
      count: vi.fn(),
    },
    votingCampaign: {
      count: vi.fn(),
    },
    vote: {
      count: vi.fn(),
    },
  },
}));

const adminToken = jwt.sign(
  { userId: 'admin-1', username: 'admin' },
  env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Admin Stats API (GET /admin/api/stats)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/admin/api/stats');
    expect(res.status).toBe(401);
  });

  it('returns properly formatted stats payload including bySection, portal, and byRating', async () => {
    // Submissions
    (prisma.submission.count as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(10) // totalVideos
      .mockResolvedValueOnce(5); // totalRated

    (prisma.submission.groupBy as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { branch: 'IT', section: 'A', year: 3, _count: { _all: 6 } },
        { branch: 'IT', section: 'B', year: 3, _count: { _all: 4 } },
      ]) // videoGroups
      .mockResolvedValueOnce([
        { rating: 'GOOD', _count: { _all: 3 } },
        { rating: 'AVERAGE', _count: { _all: 2 } },
      ]); // ratingGroups

    (prisma.submission.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { submittedAt: new Date('2026-10-01T10:00:00Z') },
      { submittedAt: new Date('2026-10-01T12:00:00Z') },
    ]);

    // Portal counts
    (prisma.student.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(100);
    (prisma.studentProfile.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(80);
    (prisma.project.count as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(45) // totalProjects
      .mockResolvedValueOnce(2); // pendingProjects
    (prisma.achievement.count as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(20) // totalAchievements
      .mockResolvedValueOnce(1); // pendingAchievements
    (prisma.certificate.count as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(15) // totalCertificates
      .mockResolvedValueOnce(0); // pendingCertificates
    (prisma.resume.count as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(30) // totalResumes
      .mockResolvedValueOnce(3); // pendingResumes
    (prisma.event.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(5);
    (prisma.eventRegistration.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(150);
    (prisma.votingCampaign.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (prisma.vote.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(75);

    const res = await request(app)
      .get('/admin/api/stats?eventId=test-event')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalVideos', 10);
    expect(res.body).toHaveProperty('totalRated', 5);

    // Verify bySection is an array with expected structure
    expect(Array.isArray(res.body.bySection)).toBe(true);
    expect(res.body.bySection).toHaveLength(2);
    expect(res.body.bySection[0]).toEqual({
      label: '3rd Year · IT-A',
      year: 3,
      branch: 'IT',
      section: 'A',
      submitted: 6,
    });

    // Verify byYear and byRating maps
    expect(res.body.byYear).toEqual({ 'Year 3': 10 });
    expect(res.body.byRating).toEqual({ GOOD: 3, AVERAGE: 2 });

    // Verify overTime array
    expect(Array.isArray(res.body.overTime)).toBe(true);
    expect(res.body.overTime[0]).toEqual({ date: '2026-10-01', count: 2 });

    // Verify portal summary
    expect(res.body.portal).toEqual({
      totalStudents: 100,
      totalProfiles: 80,
      totalProjects: 45,
      totalAchievements: 20,
      totalCertificates: 15,
      totalResumes: 30,
      totalEvents: 5,
      totalRegistrations: 150,
      totalCampaigns: 2,
      totalVotes: 75,
      pendingModeration: 6, // 2 + 1 + 0 + 3
    });
  });
});
