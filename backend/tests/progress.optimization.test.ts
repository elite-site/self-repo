import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressService } from '../src/modules/learning-progress/progress.service';
import { ProgressRepository } from '../src/modules/learning-progress/progress.repository';
import { LessonType, EnrollmentStatus } from '@prisma/client';

describe('D1 Optimization: Lesson Progress Write Amplification & Query Counts', () => {
  let mockRepo: Partial<Record<keyof ProgressRepository, any>>;
  let service: ProgressService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      findLessonMetadata: vi.fn(),
      findLessonProgress: vi.fn(),
      findEnrollment: vi.fn(),
      upsertLessonProgress: vi.fn(),
      countCourseLessons: vi.fn(),
      countCompletedLessons: vi.fn(),
      updateEnrollment: vi.fn(),
      findLessonWithCourse: vi.fn(),
      findCourseLessons: vi.fn(),
    };

    service = new ProgressService(mockRepo as unknown as ProgressRepository);
  });

  it('normal heartbeat on an incomplete lesson makes no count queries when cached', async () => {
    const studentId = 'student_1';
    const lessonId = 'lesson_1';
    const courseId = 'course_1';

    mockRepo.findLessonMetadata.mockResolvedValue({
      id: lessonId,
      type: LessonType.YOUTUBE,
      durationSec: 1000,
      courseId,
    });

    mockRepo.findLessonProgress.mockResolvedValue({
      studentId,
      lessonId,
      courseId,
      secondsWatched: 100,
      maxPositionSec: 100,
      completed: false,
    });

    // Enrollment accessed 1 minute ago (within 5 minutes)
    mockRepo.findEnrollment.mockResolvedValue({
      id: 'enr_1',
      studentId,
      courseId,
      lastAccessedAt: new Date(Date.now() - 60 * 1000),
    });

    mockRepo.countCourseLessons.mockResolvedValue(10);
    mockRepo.countCompletedLessons.mockResolvedValue(2);
    mockRepo.upsertLessonProgress.mockResolvedValue({} as any);
    mockRepo.updateEnrollment.mockResolvedValue({} as any);

    // First call populates cache
    await service.updateProgress(lessonId, studentId, { secondsWatched: 130, maxPositionSec: 130 });

    expect(mockRepo.countCourseLessons).toHaveBeenCalledTimes(1);
    expect(mockRepo.countCompletedLessons).toHaveBeenCalledTimes(1);
    // lastAccessedAt was recent (< 5 min), so updateEnrollment should NOT have been called
    expect(mockRepo.updateEnrollment).not.toHaveBeenCalled();

    // Reset counts on spies
    mockRepo.countCourseLessons.mockClear();
    mockRepo.countCompletedLessons.mockClear();
    mockRepo.findLessonMetadata.mockClear();

    // Second heartbeat 30 seconds later (incomplete, secondsWatched: 160/1000)
    const res = await service.updateProgress(lessonId, studentId, { secondsWatched: 160, maxPositionSec: 160 });

    expect(res.completed).toBe(false);
    expect(res.courseProgressPercent).toBe(20);

    // Assert: metadata was served from cache
    expect(mockRepo.findLessonMetadata).not.toHaveBeenCalled();

    // Assert: normal heartbeat makes NO count queries!
    expect(mockRepo.countCourseLessons).not.toHaveBeenCalled();
    expect(mockRepo.countCompletedLessons).not.toHaveBeenCalled();

    // Assert: enrollment update was skipped because lastAccessedAt is < 5m old
    expect(mockRepo.updateEnrollment).not.toHaveBeenCalled();
  });

  it('completing heartbeat executes count queries and marks course completed if all done', async () => {
    const studentId = 'student_2';
    const lessonId = 'lesson_2';
    const courseId = 'course_2';

    mockRepo.findLessonMetadata.mockResolvedValue({
      id: lessonId,
      type: LessonType.YOUTUBE,
      durationSec: 100,
      courseId,
    });

    // Incomplete previously
    mockRepo.findLessonProgress.mockResolvedValue({
      studentId,
      lessonId,
      courseId,
      secondsWatched: 50,
      maxPositionSec: 50,
      completed: false,
    });

    mockRepo.findEnrollment.mockResolvedValue({
      id: 'enr_2',
      studentId,
      courseId,
      lastAccessedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
    });

    mockRepo.countCourseLessons.mockResolvedValue(1);
    mockRepo.countCompletedLessons.mockResolvedValue(1); // last lesson completing!
    mockRepo.upsertLessonProgress.mockResolvedValue({} as any);
    mockRepo.updateEnrollment.mockResolvedValue({} as any);

    // Viewer reaches 95s (>= 90% of 100s) -> triggers completion flip!
    const res = await service.updateProgress(lessonId, studentId, { secondsWatched: 95, maxPositionSec: 95 });

    expect(res.completed).toBe(true);
    expect(res.courseProgressPercent).toBe(100);

    // Count queries WERE called
    expect(mockRepo.countCourseLessons).toHaveBeenCalledTimes(1);
    expect(mockRepo.countCompletedLessons).toHaveBeenCalledTimes(1);

    // Enrollment updated to COMPLETED
    expect(mockRepo.updateEnrollment).toHaveBeenCalledWith(
      studentId,
      courseId,
      expect.objectContaining({
        status: EnrollmentStatus.COMPLETED,
      })
    );
  });
});
