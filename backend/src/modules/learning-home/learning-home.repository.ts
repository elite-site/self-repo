import { prisma } from '../../infrastructure/prisma';
import { CourseStatus } from '@prisma/client';

export const narrowCourseSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  thumbnailUrl: true,
  category: true,
  level: true,
  estimatedHours: true,
  status: true,
  enrolment: true,
  featured: true,
  dueAt: true,
  _count: { select: { lessons: true } },
  lessons: { select: { durationSec: true } },
} as const;

export class LearningHomeRepository {
  async getTopCourses(limit = 12) {
    return prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      select: narrowCourseSelect,
      orderBy: [{ featured: 'desc' }, { enrollments: { _count: 'desc' } }],
      take: limit,
    });
  }

  async getNewCourses(limit = 12) {
    return prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      select: narrowCourseSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getCategoriesWithCourses(limitPerCat = 12) {
    const courses = await prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED, category: { not: null } },
      select: narrowCourseSelect,
      orderBy: { createdAt: 'desc' },
    });

    const categoryMap = new Map<string, any[]>();
    for (const c of courses) {
      if (!c.category) continue;
      const list = categoryMap.get(c.category) || [];
      if (list.length < limitPerCat) {
        list.push(c);
        categoryMap.set(c.category, list);
      }
    }

    return Array.from(categoryMap.entries()).map(([category, courses]) => ({
      category,
      courses,
    }));
  }

  async getStudentEnrollments(studentId: string) {
    return prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: { select: narrowCourseSelect },
      },
      orderBy: { lastAccessedAt: 'desc' },
    });
  }

  async getStudentProgressSummary(studentId: string, courseIds: string[]) {
    if (courseIds.length === 0) return [];
    return prisma.lessonProgress.findMany({
      where: { studentId, courseId: { in: courseIds } },
      select: { courseId: true, completed: true, updatedAt: true, lessonId: true },
    });
  }

  async getStudentHistory(studentId: string, limit = 12) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      select: {
        courseId: true,
        completedAt: true,
        lastAccessedAt: true,
        course: {
          select: { id: true, title: true, slug: true, thumbnailUrl: true },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
      take: limit,
    });

    if (enrollments.length === 0) return [];

    const courseIds = enrollments.map((en) => en.courseId);
    const recentProgress = await prisma.lessonProgress.findMany({
      where: { studentId, courseId: { in: courseIds } },
      orderBy: { updatedAt: 'desc' },
      include: { lesson: { select: { id: true, title: true } } },
    });

    const lastProgressByCourse = new Map<string, typeof recentProgress[0]>();
    for (const p of recentProgress) {
      if (!lastProgressByCourse.has(p.courseId)) {
        lastProgressByCourse.set(p.courseId, p);
      }
    }

    return enrollments.map((en) => {
      const lastProgress = lastProgressByCourse.get(en.courseId);
      return {
        courseId: en.course.id,
        courseTitle: en.course.title,
        courseSlug: en.course.slug,
        thumbnailUrl: en.course.thumbnailUrl,
        completedAt: en.completedAt ? en.completedAt.toISOString() : null,
        lastLessonTitle: lastProgress?.lesson?.title,
        lastLessonId: lastProgress?.lesson?.id,
        lastAccessedAt: en.lastAccessedAt.toISOString(),
      };
    });
  }

  async getFeaturedCourse() {
    return prisma.course.findFirst({
      where: { status: CourseStatus.PUBLISHED, featured: true },
      select: narrowCourseSelect,
      orderBy: { updatedAt: 'desc' },
    });
  }
}

export const learningHomeRepository = new LearningHomeRepository();
