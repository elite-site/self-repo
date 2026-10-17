import { describe, it, expect, vi, beforeEach } from 'vitest';
import { coursesRepository } from '../src/modules/learning-courses/courses.repository';
import { quizzesRepository } from '../src/modules/learning-quizzes/quizzes.repository';
import * as moderationRepo from '../src/modules/moderation/moderation.repository';
import * as studentRepo from '../src/modules/students/students.repository';
import { notifyAllStudentsAboutEvent } from '../src/modules/students/services/notification.service';
import { prisma } from '../src/infrastructure/prisma';

vi.mock('../src/infrastructure/prisma', () => ({
  prisma: {
    enrollment: {
      createMany: vi.fn(),
    },
    quizAttempt: {
      findMany: vi.fn(),
    },
    achievement: {
      findMany: vi.fn(),
    },
    certificate: {
      findMany: vi.fn(),
    },
    introVideo: {
      findMany: vi.fn(),
    },
    resume: {
      findMany: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
    },
    notification: {
      createMany: vi.fn(),
    },
  },
}));

describe('Unbounded and N+1 Queries Optimization (D4 & D5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('coursesRepository.bulkEnrollStudents (D4 batching)', () => {
    it('batches 1,200 enrollments into chunks of 500 using createMany with skipDuplicates', async () => {
      const studentIds = Array.from({ length: 1200 }, (_, i) => `s_${i + 1}`);
      (prisma.enrollment.createMany as any).mockResolvedValue({ count: 500 });

      const result = await coursesRepository.bulkEnrollStudents('course_101', studentIds);

      expect(prisma.enrollment.createMany).toHaveBeenCalledTimes(3);

      const call1 = (prisma.enrollment.createMany as any).mock.calls[0][0];
      const call2 = (prisma.enrollment.createMany as any).mock.calls[1][0];
      const call3 = (prisma.enrollment.createMany as any).mock.calls[2][0];

      expect(call1.data).toHaveLength(500);
      expect(call1.skipDuplicates).toBe(true);

      expect(call2.data).toHaveLength(500);
      expect(call2.skipDuplicates).toBe(true);

      expect(call3.data).toHaveLength(200);
      expect(call3.skipDuplicates).toBe(true);

      expect(result.count).toBe(1500); // 500 * 3 mock return sum
    });
  });

  describe('quizzesRepository.findStudentAttempts (D5 slimmer selects)', () => {
    it('excludes heavy answers JSON column and selects only necessary columns', async () => {
      (prisma.quizAttempt.findMany as any).mockResolvedValue([]);

      await quizzesRepository.findStudentAttempts('quiz_1', 'student_1');

      expect(prisma.quizAttempt.findMany).toHaveBeenCalledWith({
        where: { quizId: 'quiz_1', studentId: 'student_1' },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          quizId: true,
          studentId: true,
          startedAt: true,
          submittedAt: true,
          score: true,
          maxScore: true,
        },
      });
    });
  });

  describe('moderationRepository queue bounds (D4 bounds)', () => {
    it('applies take: 200 hard cap and slim student select to findAchievementsQueue', async () => {
      (prisma.achievement.findMany as any).mockResolvedValue([]);

      await moderationRepo.findAchievementsQueue();

      expect(prisma.achievement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 200,
          include: expect.objectContaining({
            student: {
              select: {
                name: true,
                rollNo: true,
                year: true,
                section: true,
                branch: true,
              },
            },
          }),
        })
      );
    });

    it('applies take: 200 hard cap to findCertificatesQueue', async () => {
      (prisma.certificate.findMany as any).mockResolvedValue([]);

      await moderationRepo.findCertificatesQueue();

      expect(prisma.certificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 200,
          include: expect.objectContaining({
            student: {
              select: {
                name: true,
                rollNo: true,
                year: true,
                section: true,
                branch: true,
              },
            },
          }),
        })
      );
    });
  });

  describe('notifyAllStudentsAboutEvent fan-out batching (D4 & D5)', () => {
    it('chunks 1,200 event notifications into batches of 500 with deterministic ids and skipDuplicates', async () => {
      const mockStudents = Array.from({ length: 1200 }, (_, i) => ({ id: `stud_${i + 1}` }));
      (prisma.student.findMany as any).mockResolvedValue(mockStudents);
      (prisma.notification.createMany as any).mockResolvedValue({ count: 500 });

      const count = await notifyAllStudentsAboutEvent({
        id: 'event_summit',
        name: 'Tech Summit 2026',
        description: 'Annual gathering',
        eligibilityYears: [],
      });

      expect(prisma.notification.createMany).toHaveBeenCalledTimes(3);

      const batch1 = (prisma.notification.createMany as any).mock.calls[0][0];
      const batch3 = (prisma.notification.createMany as any).mock.calls[2][0];

      expect(batch1.data).toHaveLength(500);
      expect(batch1.skipDuplicates).toBe(true);
      expect(batch1.data[0].id).toBe('notif_event_event_summit_stud_1');

      expect(batch3.data).toHaveLength(200);
      expect(batch3.skipDuplicates).toBe(true);
      expect(batch3.data[199].id).toBe('notif_event_event_summit_stud_1200');

      expect(count).toBe(1500);
    });
  });
});
