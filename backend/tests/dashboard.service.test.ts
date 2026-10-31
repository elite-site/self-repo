import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repo from '../src/modules/students/students.repository';
import { getStudentDashboardData } from '../src/modules/students/services/dashboard.service';

vi.mock('../src/modules/students/students.repository');

describe('dashboard.service: getStudentDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dynamic learning and github stats for student', async () => {
    vi.mocked(repo.findStudentDashboardDetails).mockResolvedValue({
      id: 'student-1',
      rollNo: '24K61A1259',
      name: 'Hemanth Naga Venkata Phanikumar',
      year: 3,
      githubReminderSnoozedUntil: null,
      githubAccount: { id: 'gh-1' },
      introVideos: [],
      resumes: [{ id: 'res-1', status: 'APPROVED', driveFileId: 'file-123' }],
      _count: { projects: 2, achievements: 1, certificates: 3 },
      profile: {
        id: 'prof-1',
        biography: 'Computer Science & IT',
        photoDriveId: null,
        photoUrl: 'https://example.com/photo.jpg',
        skills: [{ skill: { name: 'React' } }, { skill: { name: 'Node.js' } }],
      },
    } as any);

    vi.mocked(repo.findSubmissionReview).mockResolvedValue(null);
    vi.mocked(repo.findOpenEventsForDashboard).mockResolvedValue([]);
    vi.mocked(repo.findStudentRegistrations).mockResolvedValue([]);
    vi.mocked(repo.findActiveVotingCampaigns).mockResolvedValue([]);
    vi.mocked(repo.findDashboardNotifications).mockResolvedValue([]);
    vi.mocked(repo.countUnreadNotifications).mockResolvedValue(0);

    vi.mocked(repo.findStudentLearningStats).mockResolvedValue({
      activeCount: 3,
      completedCount: 2,
      totalCount: 5,
    });

    vi.mocked(repo.findStudentGithubStats).mockResolvedValue({
      totalCommits: 35,
      streakDays: 7,
      lastCommitAt: '2026-10-30T10:00:00.000Z',
    });

    const data = await getStudentDashboardData('student-1', '24K61A1259');

    expect(data.learning).toEqual({
      activeCount: 3,
      completedCount: 2,
      totalCount: 5,
    });

    expect(data.github).toEqual({
      connected: true,
      reminderSnoozedUntil: null,
      streakDays: 7,
      totalCommits: 35,
      lastCommitAt: '2026-10-30T10:00:00.000Z',
    });

    expect(data.profile.name).toBe('Hemanth Naga Venkata Phanikumar');
    expect(data.counts.projects).toBe(2);
    expect(data.resume.exists).toBe(true);
  });

  it('handles unlinked github account and zero course enrollments gracefully', async () => {
    vi.mocked(repo.findStudentDashboardDetails).mockResolvedValue({
      id: 'student-2',
      rollNo: '24K61A1260',
      name: 'Adabala Bhavitha',
      year: 2,
      githubReminderSnoozedUntil: null,
      githubAccount: null,
      introVideos: [],
      resumes: [],
      _count: { projects: 0, achievements: 0, certificates: 0 },
      profile: null,
    } as any);

    vi.mocked(repo.findSubmissionReview).mockResolvedValue(null);
    vi.mocked(repo.findOpenEventsForDashboard).mockResolvedValue([]);
    vi.mocked(repo.findStudentRegistrations).mockResolvedValue([]);
    vi.mocked(repo.findActiveVotingCampaigns).mockResolvedValue([]);
    vi.mocked(repo.findDashboardNotifications).mockResolvedValue([]);
    vi.mocked(repo.countUnreadNotifications).mockResolvedValue(0);

    vi.mocked(repo.findStudentLearningStats).mockResolvedValue({
      activeCount: 0,
      completedCount: 0,
      totalCount: 0,
    });

    vi.mocked(repo.findStudentGithubStats).mockResolvedValue({
      totalCommits: 0,
      streakDays: 0,
      lastCommitAt: null,
    });

    const data = await getStudentDashboardData('student-2', '24K61A1260');

    expect(data.learning).toEqual({
      activeCount: 0,
      completedCount: 0,
      totalCount: 0,
    });

    expect(data.github).toEqual({
      connected: false,
      reminderSnoozedUntil: null,
      streakDays: 0,
      totalCommits: 0,
      lastCommitAt: null,
    });
  });
});
