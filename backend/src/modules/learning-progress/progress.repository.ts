import { prisma } from '../../infrastructure/prisma';
import { EnrollmentStatus } from '@prisma/client';

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

  async findCourseLessons(courseId: string) {
    return prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true, type: true, durationSec: true },
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
}

export const progressRepository = new ProgressRepository();
