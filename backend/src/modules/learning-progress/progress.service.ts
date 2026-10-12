import { progressRepository, ProgressRepository } from './progress.repository';
import { NotFoundError, ForbiddenError } from '../../utils/appError';
import { EnrollmentStatus, CourseStatus, EnrolmentType } from '@prisma/client';
import { LessonProgressPayload, LessonDetailResponse, MyLearningResponse, StudentDeadlineItem } from './progress.types';
import { mapCourseCard } from '../learning-courses/courses.mappers';

export class ProgressService {
  constructor(private repo: ProgressRepository = progressRepository) {}

  async getLessonDetail(lessonId: string, studentId: string): Promise<LessonDetailResponse> {
    const lesson = await this.repo.findLessonWithCourse(lessonId);
    if (!lesson || lesson.course.status === CourseStatus.DRAFT) throw new NotFoundError('Lesson not found');

    const enrollment = await this.repo.findEnrollment(studentId, lesson.course.id);
    if (!enrollment && lesson.course.enrolment === EnrolmentType.ASSIGNED_ONLY) {
      throw new ForbiddenError('You are not enrolled in this course');
    }

    const courseLessons = await this.repo.findCourseLessons(lesson.course.id);
    const currentIndex = courseLessons.findIndex((l) => l.id === lessonId);
    const prevLessonId = currentIndex > 0 ? courseLessons[currentIndex - 1].id : null;
    const nextLessonId = currentIndex >= 0 && currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1].id : null;

    let progress = await this.repo.findLessonProgress(studentId, lessonId);
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
      await this.repo.updateEnrollment(studentId, lesson.course.id, { lastAccessedAt: new Date() });
    }

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
    const lesson = await this.repo.findLessonWithCourse(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');

    const existing = await this.repo.findLessonProgress(studentId, lessonId);
    const secondsWatched = Math.max(existing?.secondsWatched || 0, payload.secondsWatched);
    const maxPositionSec = Math.max(existing?.maxPositionSec || 0, payload.maxPositionSec);

    const isVideoComplete = lesson.type === 'YOUTUBE' && !!lesson.durationSec && lesson.durationSec > 0 && secondsWatched / lesson.durationSec >= 0.9;
    const isCompleted = existing?.completed || isVideoComplete || Boolean(payload.completed);
    const completedAt = isCompleted ? (existing?.completedAt || new Date()) : null;

    await this.repo.upsertLessonProgress({
      studentId,
      lessonId,
      courseId: lesson.course.id,
      secondsWatched,
      maxPositionSec,
      completed: isCompleted,
      completedAt,
    });

    const [totalLessons, completedLessons] = await Promise.all([
      this.repo.countCourseLessons(lesson.course.id),
      this.repo.countCompletedLessons(studentId, lesson.course.id),
    ]);

    const courseProgressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    if (isCompleted && totalLessons > 0 && completedLessons >= totalLessons) {
      await this.repo.updateEnrollment(studentId, lesson.course.id, {
        status: EnrollmentStatus.COMPLETED,
        completedAt: new Date(),
        lastAccessedAt: new Date(),
      });
    } else {
      await this.repo.updateEnrollment(studentId, lesson.course.id, { lastAccessedAt: new Date() });
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
}

export const progressService = new ProgressService();
