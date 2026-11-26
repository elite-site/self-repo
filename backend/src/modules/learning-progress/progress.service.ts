import { progressRepository, ProgressRepository } from './progress.repository';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/appError';
import { EnrollmentStatus, CourseStatus, EnrolmentType, LessonType, Enrollment } from '@prisma/client';
import {
  LessonProgressPayload,
  LessonDetailResponse,
  MyLearningResponse,
  StudentDeadlineItem,
  LessonWithCourse,
  LessonPlaybackResponse,
  PlaybackHeartbeatResponse,
  PlaybackReleaseResponse,
} from './progress.types';
import { mapCourseCard } from '../learning-courses/courses.mappers';
import { TtlCache } from '../../utils/ttlCache';
import { cacheService } from '../video-cache';
import { r2Adapter } from '../../infrastructure/r2';
import { env } from '../../config/env';

/**
 * Access check helper: validates that lesson exists, course is published,
 * and if course is ASSIGNED_ONLY, student is enrolled.
 */
export async function assertLessonAccess(
  lessonId: string,
  studentId: string,
  repo: ProgressRepository = progressRepository,
): Promise<{ lesson: LessonWithCourse; enrollment: Enrollment | null }> {
  const lesson = await repo.findLessonWithCourse(lessonId);
  if (!lesson || lesson.course.status === CourseStatus.DRAFT) {
    throw new NotFoundError('Lesson not found');
  }

  const enrollment = await repo.findEnrollment(studentId, lesson.course.id);
  if (!enrollment && lesson.course.enrolment === EnrolmentType.ASSIGNED_ONLY) {
    throw new ForbiddenError('You are not enrolled in this course');
  }

  return { lesson, enrollment };
}

export class ProgressService {
  private readonly lessonMetadataCache = new TtlCache<{
    id: string;
    type: LessonType;
    durationSec: number | null;
    courseId: string;
  }>(5 * 60 * 1000, 500);

  private readonly courseProgressCache = new TtlCache<number>(60 * 1000, 1000);

  constructor(private repo: ProgressRepository = progressRepository) {}

  clearCaches(): void {
    this.lessonMetadataCache.clear();
    this.courseProgressCache.clear();
  }

  async assertLessonAccess(
    lessonId: string,
    studentId: string,
  ): Promise<{ lesson: LessonWithCourse; enrollment: Enrollment | null }> {
    return assertLessonAccess(lessonId, studentId, this.repo);
  }

  async getLessonDetail(lessonId: string, studentId: string): Promise<LessonDetailResponse> {
    const { lesson, enrollment } = await this.assertLessonAccess(lessonId, studentId);

    const [courseLessons, initialProgress] = await Promise.all([
      this.repo.findCourseLessons(lesson.course.id),
      this.repo.findLessonProgress(studentId, lessonId),
    ]);

    const currentIndex = courseLessons.findIndex((l) => l.id === lessonId);
    const prevLessonId = currentIndex > 0 ? courseLessons[currentIndex - 1].id : null;
    const nextLessonId = currentIndex >= 0 && currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1].id : null;

    let progress = initialProgress;
    const isAutoCompletedType = lesson.type === 'NOTES' || lesson.type === 'LINK';

    if (isAutoCompletedType && !progress?.completed) {
      progress = await this.repo.upsertLessonProgress({
        studentId,
        lessonId,
        courseId: lesson.course.id,
        secondsWatched: progress?.secondsWatched || 0,
        maxPositionSec: progress?.maxPositionSec || 0,
        completed: true,
        completedAt: new Date(),
      });
      await this.checkAndCompleteCourse(studentId, lesson.course.id);
    }

    if (enrollment) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (!enrollment.lastAccessedAt || enrollment.lastAccessedAt.getTime() < fiveMinutesAgo) {
        await this.repo.updateEnrollment(studentId, lesson.course.id, { lastAccessedAt: new Date() });
      }
    }

    this.lessonMetadataCache.set(lesson.id, {
      id: lesson.id,
      type: lesson.type,
      durationSec: lesson.durationSec,
      courseId: lesson.course.id,
    });

    return {
      id: lesson.id,
      courseId: lesson.course.id,
      courseTitle: lesson.course.title,
      courseSlug: lesson.course.slug,
      title: lesson.title,
      order: lesson.order,
      type: lesson.type,
      durationSec: lesson.durationSec,
      youtubeVideoId: lesson.youtubeVideoId,
      url: lesson.url,
      hasVideo: Boolean((lesson as any).driveFileId),
      notes: lesson.notes,
      quizId: lesson.quiz?.id || null,
      nextLessonId,
      prevLessonId,
      progress: {
        completed: progress?.completed || false,
        secondsWatched: progress?.secondsWatched || 0,
        maxPositionSec: progress?.maxPositionSec || 0,
      },
    };
  }

  async updateProgress(lessonId: string, studentId: string, payload: LessonProgressPayload) {
    const lesson = await this.lessonMetadataCache.wrap(lessonId, async () => {
      const meta = await this.repo.findLessonMetadata(lessonId);
      if (!meta) throw new NotFoundError('Lesson not found');
      return meta;
    });

    const [existing, enrollment] = await Promise.all([
      this.repo.findLessonProgress(studentId, lessonId),
      this.repo.findEnrollment(studentId, lesson.courseId),
    ]);

    const secondsWatched = Math.max(existing?.secondsWatched || 0, payload.secondsWatched);
    const maxPositionSec = Math.max(existing?.maxPositionSec || 0, payload.maxPositionSec);

    const isVideoComplete =
      (lesson.type === 'YOUTUBE' || lesson.type === 'VIDEO') &&
      !!lesson.durationSec &&
      lesson.durationSec > 0 &&
      secondsWatched / lesson.durationSec >= 0.9;
    const isCompleted = existing?.completed || isVideoComplete || Boolean(payload.completed);
    const completedAt = isCompleted ? (existing?.completedAt || new Date()) : null;
    const justCompleted = isCompleted && !existing?.completed;

    await this.repo.upsertLessonProgress({
      studentId,
      lessonId,
      courseId: lesson.courseId,
      secondsWatched,
      maxPositionSec,
      completed: isCompleted,
      completedAt,
    });

    const cacheKey = `${studentId}:${lesson.courseId}`;
    let courseProgressPercent: number;

    const shouldCheckCourseCompletion =
      justCompleted || (isCompleted && enrollment?.status !== EnrollmentStatus.COMPLETED);

    if (shouldCheckCourseCompletion) {
      const [totalLessons, completedLessons] = await Promise.all([
        this.repo.countCourseLessons(lesson.courseId),
        this.repo.countCompletedLessons(studentId, lesson.courseId),
      ]);

      courseProgressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      this.courseProgressCache.set(cacheKey, courseProgressPercent);

      if (enrollment) {
        if (totalLessons > 0 && completedLessons >= totalLessons) {
          await this.repo.updateEnrollment(studentId, lesson.courseId, {
            status: EnrollmentStatus.COMPLETED,
            completedAt: new Date(),
            lastAccessedAt: new Date(),
          });
        } else {
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          if (!enrollment.lastAccessedAt || enrollment.lastAccessedAt.getTime() < fiveMinutesAgo) {
            await this.repo.updateEnrollment(studentId, lesson.courseId, { lastAccessedAt: new Date() });
          }
        }
      }
    } else {
      const cached = this.courseProgressCache.get(cacheKey);
      if (cached !== undefined) {
        courseProgressPercent = cached;
      } else {
        const [totalLessons, completedLessons] = await Promise.all([
          this.repo.countCourseLessons(lesson.courseId),
          this.repo.countCompletedLessons(studentId, lesson.courseId),
        ]);
        courseProgressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        this.courseProgressCache.set(cacheKey, courseProgressPercent);
      }

      if (enrollment) {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (!enrollment.lastAccessedAt || enrollment.lastAccessedAt.getTime() < fiveMinutesAgo) {
          await this.repo.updateEnrollment(studentId, lesson.courseId, { lastAccessedAt: new Date() });
        }
      }
    }

    return { success: true, completed: isCompleted, courseProgressPercent };
  }

  private async checkAndCompleteCourse(studentId: string, courseId: string) {
    const [total, completed] = await Promise.all([
      this.repo.countCourseLessons(courseId),
      this.repo.countCompletedLessons(studentId, courseId),
    ]);
    if (total > 0 && completed >= total) {
      await this.repo.updateEnrollment(studentId, courseId, {
        status: EnrollmentStatus.COMPLETED,
        completedAt: new Date(),
      });
    }
  }

  async getMyLearning(studentId: string): Promise<MyLearningResponse> {
    const enrollments = await this.repo.findStudentEnrollmentsWithDetails(studentId);
    const inProgress: any[] = [];
    const completed: any[] = [];
    const deadlines: StudentDeadlineItem[] = [];

    const courseIds = enrollments.map((e) => e.courseId || e.course?.id).filter(Boolean) as string[];
    const allProgress = await this.repo.findStudentProgressForCourses(studentId, courseIds);
    const progressByCourse = new Map<string, Array<{ lessonId: string; completed: boolean; secondsWatched: number }>>();
    for (const p of allProgress) {
      const list = progressByCourse.get(p.courseId) || [];
      list.push(p);
      progressByCourse.set(p.courseId, list);
    }

    for (const enrollment of enrollments) {
      const course = enrollment.course;
      const progressList = progressByCourse.get(course.id) || [];
      const completedCount = progressList.filter((p) => p.completed).length;
      const totalLessons = course.lessons.length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      const card = {
        ...mapCourseCard(course, enrollment),
        progressPercent,
      };

      if (enrollment.status === EnrollmentStatus.COMPLETED) {
        completed.push(card);
      } else {
        inProgress.push(card);
      }

      if (course.dueAt && new Date(course.dueAt) > new Date()) {
        deadlines.push({
          courseId: course.id,
          courseTitle: course.title,
          courseSlug: course.slug,
          title: course.title,
          dueAt: new Date(course.dueAt).toISOString(),
          type: 'COURSE',
        });
      }

      for (const quiz of course.quizzes) {
        if (quiz.dueAt && new Date(quiz.dueAt) > new Date()) {
          deadlines.push({
            courseId: course.id,
            courseTitle: course.title,
            courseSlug: course.slug,
            lessonId: quiz.lessonId,
            quizId: quiz.id,
            title: `Quiz: ${course.title}`,
            dueAt: new Date(quiz.dueAt).toISOString(),
            type: 'QUIZ',
          });
        }
      }
    }

    deadlines.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    return { inProgress, completed, deadlines };
  }

  /**
   * Request video playback.
   * Ensures the video is cached in R2, creates/renews a VideoLease,
   * generates a presigned R2 GET URL, and touches lastUrlIssuedAt.
   */
  async getLessonPlayback(
    lessonId: string,
    studentId: string,
  ): Promise<LessonPlaybackResponse> {
    const { lesson } = await this.assertLessonAccess(lessonId, studentId);

    if (lesson.type !== 'VIDEO' || !lesson.driveFileId) {
      throw new ValidationError('Lesson is not a hosted video');
    }

    const cached = await cacheService.ensureCached(lesson.driveFileId);
    if (cached.status === 'PREPARING') {
      return { status: 'PREPARING', retryAfterSec: 3 };
    }

    const videoCache = await cacheService.findByDriveFileId(lesson.driveFileId);
    if (!videoCache) {
      return { status: 'PREPARING', retryAfterSec: 3 };
    }

    const now = Date.now();
    const expiresAt = new Date(now + env.VIDEO_LEASE_TTL_SEC * 1000);

    const lease = await cacheService.upsertLease({
      studentId,
      lessonId,
      cacheId: videoCache.id,
      expiresAt,
    });

    await cacheService.touchUrlIssued(videoCache.id);

    const url = await r2Adapter.presignGet(videoCache.r2Key, env.VIDEO_URL_TTL_SEC);

    return {
      status: 'READY',
      url,
      expiresAt: lease.expiresAt.toISOString(),
      leaseId: lease.id,
    };
  }

  /**
   * Playback heartbeat: extends active lease and issues fresh presigned URL.
   */
  async heartbeatPlayback(
    lessonId: string,
    studentId: string,
  ): Promise<PlaybackHeartbeatResponse> {
    const lease = await cacheService.findActiveLease(studentId, lessonId);
    if (!lease || lease.expiresAt <= new Date()) {
      throw new NotFoundError('Active playback lease not found');
    }

    const expiresAt = new Date(Date.now() + env.VIDEO_LEASE_TTL_SEC * 1000);
    const updated = await cacheService.extendLease(lease.id, expiresAt);

    await cacheService.touchUrlIssued(updated.cacheId);

    const url = await r2Adapter.presignGet(updated.cache.r2Key, env.VIDEO_URL_TTL_SEC);

    return {
      url,
      expiresAt: updated.expiresAt.toISOString(),
    };
  }

  /**
   * Release playback lease (on unload/stop or sendBeacon).
   */
  async releasePlayback(
    lessonId: string,
    studentId: string,
  ): Promise<PlaybackReleaseResponse> {
    await cacheService.deleteLease(studentId, lessonId);
    return { released: true };
  }
}

export const progressService = new ProgressService();
