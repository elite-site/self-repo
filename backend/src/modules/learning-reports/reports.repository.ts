import { prisma } from '../../infrastructure/prisma';
import { CourseStatus, EnrollmentStatus } from '@prisma/client';

export class ReportsRepository {
  async getOverviewAggregates(since: Date) {
    const [
      totalCourses,
      publishedCourses,
      totalEnrolments,
      completedEnrolments,
      activeLearnersGroup,
    ] = await Promise.all([
      prisma.course.count(),
      prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { status: EnrollmentStatus.COMPLETED } }),
      prisma.enrollment.groupBy({
        by: ['studentId'],
        where: { lastAccessedAt: { gte: since } },
      }),
    ]);

    return {
      totalCourses,
      publishedCourses,
      totalEnrolments,
      completedEnrolments,
      activeLearnersLast7Days: activeLearnersGroup.length,
    };
  }

  async findCourseBasic(courseId: string) {
    return prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, slug: true },
    });
  }

  async getCourseReportAggregates(courseId: string) {
    const [totalEnrolled, completedCount, quizStats, lessonGroups, recentLearners] = await Promise.all([
      prisma.enrollment.count({ where: { courseId } }),
      prisma.enrollment.count({ where: { courseId, status: EnrollmentStatus.COMPLETED } }),
      prisma.quizAttempt.aggregate({
        where: { quiz: { courseId }, submittedAt: { not: null } },
        _avg: { score: true },
        _count: { id: true },
      }),
      prisma.lessonProgress.groupBy({
        by: ['lessonId'],
        where: { courseId, completed: true },
        _count: { studentId: true },
      }),
      prisma.enrollment.findMany({
        where: { courseId },
        take: 50,
        orderBy: { enrolledAt: 'desc' },
        include: {
          student: { select: { id: true, name: true, rollNo: true } },
        },
      }),
    ]);

    return {
      totalEnrolled,
      completedCount,
      quizAverageScore: quizStats._avg.score !== null ? Math.round(quizStats._avg.score * 10) / 10 : null,
      quizTotalAttempts: quizStats._count.id,
      lessonCompletions: lessonGroups.map((g) => ({
        lessonId: g.lessonId,
        completedCount: g._count.studentId,
      })),
      recentLearners: recentLearners.map((e) => ({
        studentId: e.student.id,
        studentName: e.student.name,
        rollNo: e.student.rollNo,
        enrolledAt: e.enrolledAt.toISOString(),
        status: e.status,
        completedAt: e.completedAt ? e.completedAt.toISOString() : null,
      })),
    };
  }

  async findEnrollmentsBatch(courseId: string, skip: number, take: number) {
    return prisma.enrollment.findMany({
      where: { courseId },
      skip,
      take,
      orderBy: { enrolledAt: 'asc' },
      include: {
        student: { select: { rollNo: true, name: true, email: true } },
      },
    });
  }
}

export const reportsRepository = new ReportsRepository();
