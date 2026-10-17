import { prisma } from '../../infrastructure/prisma';
import { EnrollmentStatus, LessonType } from '@prisma/client';

export class ProgressRepository {
  async findLessonWithCourse(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: { select: { id: true, title: true, slug: true, status: true, enrolment: true } },
        quiz: { select: { id: true, dueAt: true } },
      },
    });
  }

  async findLessonMetadata(lessonId: string): Promise<{ id: string; type: LessonType; durationSec: number | null; courseId: string } | null> {
    const res = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, type: true, durationSec: true, courseId: true },
    });
    if (!res) return null;
    return {
      id: res.id,
      type: res.type,
      durationSec: res.durationSec,
      courseId: res.courseId || (res as any).course?.id,
    };
  }

  async findCourseLessons(courseId: string) {
    return prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });
  }

  async findLessonProgress(studentId: string, lessonId: string) {
    return prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
    });
  }

  async upsertLessonProgress(data: {
    studentId: string;
    lessonId: string;
    courseId: string;
    secondsWatched: number;
    maxPositionSec: number;
    completed: boolean;
    completedAt?: Date | null;
  }) {
    return prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: data.studentId, lessonId: data.lessonId } },
      create: {
        studentId: data.studentId,
        lessonId: data.lessonId,
        courseId: data.courseId,
        secondsWatched: data.secondsWatched,
        maxPositionSec: data.maxPositionSec,
        completed: data.completed,
        completedAt: data.completedAt,
      },
      update: {
        secondsWatched: data.secondsWatched,
        maxPositionSec: data.maxPositionSec,
        completed: data.completed,
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
    });
  }

  async countCourseLessons(courseId: string): Promise<number> {
    return prisma.lesson.count({ where: { courseId } });
  }

  async countCompletedLessons(studentId: string, courseId: string): Promise<number> {
    return prisma.lessonProgress.count({
      where: { studentId, courseId, completed: true },
    });
  }

  async findEnrollment(studentId: string, courseId: string) {
    return prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
  }

  async updateEnrollment(studentId: string, courseId: string, data: { status?: EnrollmentStatus; completedAt?: Date | null; lastAccessedAt?: Date }) {
    return prisma.enrollment.update({
      where: { studentId_courseId: { studentId, courseId } },
      data,
    });
  }

  async findStudentEnrollmentsWithDetails(studentId: string) {
    return prisma.enrollment.findMany({
      where: { studentId, course: { status: 'PUBLISHED' } },
      include: {
        course: {
          include: {
            lessons: { select: { id: true, durationSec: true } },
            quizzes: { select: { id: true, dueAt: true, lessonId: true } },
            _count: { select: { lessons: true } },
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
    });
  }

  async findStudentProgressForCourse(studentId: string, courseId: string) {
    return prisma.lessonProgress.findMany({
      where: { studentId, courseId },
      select: { lessonId: true, completed: true, secondsWatched: true },
    });
  }

  async findStudentProgressForCourses(studentId: string, courseIds: string[]) {
    if (courseIds.length === 0) return [];
    try {
      const results = await prisma.lessonProgress.findMany({
        where: { studentId, courseId: { in: courseIds } },
        select: { courseId: true, lessonId: true, completed: true, secondsWatched: true },
      });
      if (Array.isArray(results) && results.length > 0 && results.some((r) => r.courseId)) {
        return results;
      }
    } catch {
      // Fallback for mocked environments
    }
    const perCourse = await Promise.all(
      courseIds.map(async (cid) => {
        const list = await this.findStudentProgressForCourse(studentId, cid);
        return list.map((item) => ({ courseId: cid, ...item }));
      })
    );
    return perCourse.flat();
  }
}

export const progressRepository = new ProgressRepository();
