import { coursesRepository, CoursesRepository } from './courses.repository';
import { NotFoundError, ForbiddenError } from '../../utils/appError';
import { CourseStatus, EnrolmentType, CourseTargetType, Prisma } from '@prisma/client';
import { ActivityService } from '../admin';
import {
  AssignCoursePayload,
  YouTubePreviewResult,
  YouTubePlaylistResult,
  BulkLessonItem,
  LessonTranscriptResponse,
} from './courses.types';
import { fetchYouTubePreview, fetchYouTubePlaylist, fetchYouTubeTranscript } from './youtube';
import { mapCourseCard, mapCourseDetail } from './courses.mappers';

export class CoursesService {
  constructor(private repo: CoursesRepository = coursesRepository) {}

  async listStudentCourses(studentId: string, query: { page?: number; limit?: number; category?: string; level?: any; filter?: string; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.PUBLISHED,
      ...(query.category && { category: query.category }),
      ...(query.level && { level: query.level }),
      ...(query.search && { title: { contains: query.search, mode: 'insensitive' } }),
      ...(query.filter === 'assigned' && { enrollments: { some: { studentId, source: 'ASSIGNED' } } }),
      ...(query.filter === 'in_progress' && { enrollments: { some: { studentId, status: 'ACTIVE' } } }),
      ...(query.filter === 'completed' && { enrollments: { some: { studentId, status: 'COMPLETED' } } }),
    };

    const [courses, total] = await Promise.all([
      this.repo.findManyCourses({ skip: (page - 1) * limit, take: limit, where }),
      this.repo.countCourses(where),
    ]);

    const courseIds = courses.map((c) => c.id);
    const enrollments = studentId ? await this.repo.findEnrollmentsForCourses(studentId, courseIds) : [];
    const enMap = new Map(enrollments.map((e) => [e.courseId, e]));
    const mapped = courses.map((c) => mapCourseCard(c, enMap.get(c.id)));
    return { courses: mapped, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async getStudentCourse(slugOrId: string, studentId?: string) {
    const course = await this.repo.findCourseBySlugOrId(slugOrId);
    if (!course || course.status === CourseStatus.DRAFT) throw new NotFoundError('Course not found');
    const enrollment = studentId ? await this.repo.findEnrollment(studentId, course.id) : null;
    const progressList = studentId ? await this.repo.getStudentProgressForLessons(studentId, course.lessons.map((l) => l.id)) : [];
    return mapCourseDetail(course, enrollment, progressList);
  }

  async enrollStudent(courseId: string, studentId: string) {
    const course = await this.repo.findCourseById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.status !== CourseStatus.PUBLISHED) throw new ForbiddenError('Course is not available for enrollment');
    if (course.enrolment === EnrolmentType.ASSIGNED_ONLY) throw new ForbiddenError('This course is invite-only');
    const enrollment = await this.repo.createEnrollment({ studentId, courseId });
    return { success: true, enrolledAt: enrollment.enrolledAt.toISOString(), courseId };
  }

  async listAdminCourses(query: { page?: number; limit?: number; status?: any; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: Prisma.CourseWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.search && { title: { contains: query.search, mode: 'insensitive' } }),
    };

    const [courses, total] = await Promise.all([
      this.repo.findManyCourses({ skip: (page - 1) * limit, take: limit, where }),
      this.repo.countCourses(where),
    ]);

    const courseIds = courses.map((c) => c.id);
    const completedCounts = await this.repo.countCompletedEnrollmentsForCourses(courseIds);
    const completionMap = new Map(completedCounts.map((g) => [g.courseId, g._count.id]));

    const mapped = courses.map((c) => ({
      ...mapCourseCard(c),
      enrollmentCount: c._count.enrollments,
      completionCount: completionMap.get(c.id) || 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return { courses: mapped, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async getAdminCourse(id: string) {
    const course = await this.repo.findCourseById(id);
    if (!course) throw new NotFoundError('Course not found');
    return course;
  }

  async createCourse(data: any, adminUser?: { email?: string }) {
    const { target, lessons, ...courseData } = data;
    const created = await this.repo.createCourse(courseData);

    if (Array.isArray(lessons) && lessons.length > 0) {
      const records = lessons.map((l: BulkLessonItem, idx: number) => ({
        courseId: created.id,
        title: l.title,
        type: l.type || 'YOUTUBE',
        youtubeVideoId: l.youtubeVideoId || null,
        url: l.url || null,
        notes: l.notes || null,
        durationSec: l.durationSec || null,
        order: l.order !== undefined ? l.order : idx + 1,
      }));
      await this.repo.createLessonsBulk(records);
    }

    if (target) {
      await this.assignCourse(created.id, target, adminUser);
    }

    await ActivityService.log({ category: 'ADMIN', action: 'COURSE_CREATE', userEmail: adminUser?.email, details: `Created course ${created.id}` });
    return created;
  }

  async updateCourse(id: string, data: any, adminUser?: { email?: string }) {
    await this.getAdminCourse(id);
    const { target, lessons, ...courseData } = data;
    const updated = await this.repo.updateCourse(id, courseData);
    await ActivityService.log({ category: 'ADMIN', action: 'COURSE_UPDATE', userEmail: adminUser?.email, details: `Updated course ${id}` });
    return updated;
  }

  async deleteCourse(id: string, adminUser?: { email?: string }) {
    await this.getAdminCourse(id);
    await this.repo.deleteCourse(id);
    await ActivityService.log({ category: 'ADMIN', action: 'COURSE_DELETE', userEmail: adminUser?.email, details: `Deleted course ${id}` });
    return { success: true };
  }

  async createLesson(courseId: string, data: any) {
    await this.getAdminCourse(courseId);
    const order = data.order !== undefined ? data.order : (await this.repo.getLessonMaxOrder(courseId)) + 1;
    return this.repo.createLesson({ ...data, courseId, order });
  }

  async bulkCreateLessons(courseId: string, lessons: BulkLessonItem[]) {
    await this.getAdminCourse(courseId);
    const maxOrder = await this.repo.getLessonMaxOrder(courseId);
    const records = lessons.map((l, idx) => ({
      courseId,
      title: l.title,
      type: l.type || 'YOUTUBE',
      youtubeVideoId: l.youtubeVideoId || null,
      url: l.url || null,
      notes: l.notes || null,
      durationSec: l.durationSec || null,
      order: l.order !== undefined ? l.order : maxOrder + idx + 1,
    }));
    await this.repo.createLessonsBulk(records);
    return { success: true, count: records.length };
  }

  async updateLesson(lessonId: string, data: any) {
    return this.repo.updateLesson(lessonId, data);
  }

  async deleteLesson(lessonId: string) {
    await this.repo.deleteLesson(lessonId);
    return { success: true };
  }

  async reorderLessons(lessonIds: string[]) {
    await this.repo.reorderLessons(lessonIds);
    return { success: true };
  }

  async assignCourse(courseId: string, payload: AssignCoursePayload, adminUser?: { email?: string }) {
    await this.getAdminCourse(courseId);
    const studentIds = await this.repo.findStudentIdsForTarget(payload.targetType, payload.studentIds, payload.year, payload.section);
    if (payload.targetType === CourseTargetType.ALL) {
      await this.repo.createCourseTargets(courseId, CourseTargetType.ALL, [{}]);
    } else if (payload.targetType === CourseTargetType.BATCH) {
      await this.repo.createCourseTargets(courseId, CourseTargetType.BATCH, [{ year: payload.year, section: payload.section }]);
    } else {
      await this.repo.createCourseTargets(courseId, CourseTargetType.STUDENT, studentIds.map((id) => ({ studentId: id })));
    }
    await this.repo.bulkEnrollStudents(courseId, studentIds);
    await ActivityService.log({ category: 'ADMIN', action: 'COURSE_ASSIGN', userEmail: adminUser?.email, details: `Assigned course ${courseId} to ${studentIds.length} students` });
    return { success: true, count: studentIds.length };
  }

  async getCourseEnrollments(courseId: string, query: { page?: number; limit?: number; status?: any; search?: string }) {
    await this.getAdminCourse(courseId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const [enrollments, total] = await Promise.all([
      this.repo.findEnrollmentsByCourse(courseId, { skip: (page - 1) * limit, take: limit, status: query.status, search: query.search }),
      this.repo.countEnrollmentsByCourse(courseId, { status: query.status, search: query.search }),
    ]);
    return { enrollments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async getYouTubePreview(url: string): Promise<YouTubePreviewResult> {
    return fetchYouTubePreview(url);
  }

  async getYouTubePlaylist(urlOrId: string): Promise<YouTubePlaylistResult> {
    return fetchYouTubePlaylist(urlOrId);
  }

  async getLessonTranscript(lessonId: string, _studentId?: string): Promise<LessonTranscriptResponse> {
    const lesson = await this.repo.findLessonById(lessonId);
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    if (lesson.type !== 'YOUTUBE' || !lesson.youtubeVideoId) {
      return {
        available: false,
        segments: [],
        message: 'Lesson is not a YouTube video',
      };
    }

    const transcript = await fetchYouTubeTranscript(lesson.youtubeVideoId);
    return {
      lessonId: lesson.id,
      videoId: lesson.youtubeVideoId,
      available: transcript.available,
      language: transcript.language,
      segments: transcript.segments,
    };
  }
}

export const coursesService = new CoursesService();
