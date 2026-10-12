import { prisma } from '../../infrastructure/prisma';
import { EnrollmentSource, EnrollmentStatus, CourseTargetType, Prisma } from '@prisma/client';

export class CoursesRepository {
  async findManyCourses(params: { skip: number; take: number; where: Prisma.CourseWhereInput; orderBy?: Prisma.CourseOrderByWithRelationInput }) {
    return prisma.course.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy || { createdAt: 'desc' },
      include: {
        lessons: { select: { id: true, durationSec: true } },
        _count: { select: { enrollments: true, lessons: true } },
      },
    });
  }

  async countCourses(where: Prisma.CourseWhereInput): Promise<number> {
    return prisma.course.count({ where });
  }

  async findCourseById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { order: 'asc' }, include: { quiz: { select: { id: true } } } },
        targets: true,
        quizzes: { select: { id: true, lessonId: true } },
        _count: { select: { enrollments: true, lessons: true } },
      },
    });
  }

  async findCourseBySlugOrId(slugOrId: string) {
    return prisma.course.findFirst({
      where: { OR: [{ id: slugOrId }, { slug: slugOrId }] },
      include: {
        lessons: { orderBy: { order: 'asc' }, include: { quiz: { select: { id: true } } } },
        _count: { select: { enrollments: true, lessons: true } },
      },
    });
  }

  async createCourse(data: Prisma.CourseCreateInput) {
    return prisma.course.create({ data });
  }

  async updateCourse(id: string, data: Prisma.CourseUpdateInput) {
    return prisma.course.update({ where: { id }, data });
  }

  async deleteCourse(id: string) {
    return prisma.course.delete({ where: { id } });
  }

  async createLesson(data: Prisma.LessonUncheckedCreateInput) {
    return prisma.lesson.create({ data });
  }

  async createLessonsBulk(lessons: Prisma.LessonUncheckedCreateInput[]) {
    return prisma.lesson.createMany({ data: lessons });
  }

  async updateLesson(id: string, data: Prisma.LessonUpdateInput) {
    return prisma.lesson.update({ where: { id }, data });
  }

  async deleteLesson(id: string) {
    return prisma.lesson.delete({ where: { id } });
  }

  async findLessonById(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
    });
  }

  async reorderLessons(lessonIds: string[]) {
    return prisma.$transaction(
      lessonIds.map((id, index) =>
        prisma.lesson.update({ where: { id }, data: { order: index } })
      )
    );
  }

  async getLessonMaxOrder(courseId: string): Promise<number> {
    const last = await prisma.lesson.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return last ? last.order : -1;
  }

  async findEnrollment(studentId: string, courseId: string) {
    return prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
  }

  async createEnrollment(data: { studentId: string; courseId: string; source?: EnrollmentSource }) {
    return prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: data.studentId, courseId: data.courseId } },
      create: {
        studentId: data.studentId,
        courseId: data.courseId,
        source: data.source || EnrollmentSource.SELF,
        status: EnrollmentStatus.ACTIVE,
      },
      update: {},
    });
  }

  async findEnrollmentsByCourse(courseId: string, params: { skip: number; take: number; status?: EnrollmentStatus; search?: string }) {
    const where: Prisma.EnrollmentWhereInput = {
      courseId,
      ...(params.status && { status: params.status }),
      ...(params.search && {
        student: {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { rollNo: { contains: params.search, mode: 'insensitive' } },
          ],
        },
      }),
    };
    return prisma.enrollment.findMany({
      skip: params.skip,
      take: params.take,
      where,
      include: {
        student: { select: { id: true, name: true, rollNo: true, email: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async countEnrollmentsByCourse(courseId: string, params: { status?: EnrollmentStatus; search?: string }): Promise<number> {
    const where: Prisma.EnrollmentWhereInput = {
      courseId,
      ...(params.status && { status: params.status }),
      ...(params.search && {
        student: {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { rollNo: { contains: params.search, mode: 'insensitive' } },
          ],
        },
      }),
    };
    return prisma.enrollment.count({ where });
  }

  async createCourseTargets(courseId: string, targetType: CourseTargetType, targets: { studentId?: string; year?: number; section?: string }[]) {
    return prisma.courseTarget.createMany({
      data: targets.map((t) => ({
        courseId,
        targetType,
        studentId: t.studentId || null,
        year: t.year || null,
        section: t.section || null,
      })),
    });
  }

  async findStudentIdsForTarget(targetType: CourseTargetType, studentIds?: string[], year?: number, section?: string): Promise<string[]> {
    if (targetType === 'STUDENT' && studentIds) return studentIds;
    if (targetType === 'BATCH') {
      const students = await prisma.student.findMany({
        where: {
          ...(year ? { year } : {}),
          ...(section ? { section: { equals: section, mode: 'insensitive' } } : {}),
        },
        select: { id: true },
      });
      return students.map((s) => s.id);
    }
    const all = await prisma.student.findMany({ select: { id: true } });
    return all.map((s) => s.id);
  }

  async bulkEnrollStudents(courseId: string, studentIds: string[]) {
    return prisma.$transaction(
      studentIds.map((studentId) =>
        prisma.enrollment.upsert({
          where: { studentId_courseId: { studentId, courseId } },
          create: { studentId, courseId, source: EnrollmentSource.ASSIGNED, status: EnrollmentStatus.ACTIVE },
          update: {},
        })
      )
    );
  }

  async getStudentProgressForLessons(studentId: string, lessonIds: string[]) {
    return prisma.lessonProgress.findMany({
      where: { studentId, lessonId: { in: lessonIds } },
    });
  }
}

export const coursesRepository = new CoursesRepository();
