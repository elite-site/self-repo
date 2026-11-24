import { coursesRepository, CoursesRepository } from './courses.repository';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/appError';
import { CourseStatus, EnrolmentType, CourseTargetType, Prisma } from '@prisma/client';
import { ActivityService } from '../admin';
import { driveService, extractDriveFileId } from '../media';
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

  private async validateAndResolveDriveVideo(rawInput?: string | null): Promise<string> {
    const driveFileId = extractDriveFileId(rawInput);
    if (!driveFileId) {
      throw new ValidationError('Provided Drive file is not a valid video or is inaccessible');
    }

    try {
      let meta: { mimeType?: string; sizeBytes?: number } | null = null;
      if (typeof (driveService as any).getFileMetadata === 'function') {
        meta = await (driveService as any).getFileMetadata(driveFileId);
      } else if (typeof driveService.getFileStream === 'function') {
        const res = await driveService.getFileStream(driveFileId);
        if (res?.stream) res.stream.destroy();
        meta = res;
      }

      if (!meta || !meta.mimeType || !meta.mimeType.startsWith('video/')) {
        throw new ValidationError('Provided Drive file is not a valid video or is inaccessible');
      }
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError('Provided Drive file is not a valid video or is inaccessible');
    }

    return driveFileId;
  }

  private sanitizeLessonResponse<T extends { driveFileId?: string | null }>(lesson: T): Omit<T, 'driveFileId'> & { hasVideo: boolean } {
    const { driveFileId, ...rest } = lesson;
    return {
      ...rest,
      hasVideo: Boolean(driveFileId),
    };
  }

  async getAdminCourse(id: string) {
    const course = await this.repo.findCourseById(id);
    if (!course) throw new NotFoundError('Course not found');
    return {
      ...course,
      lessons: Array.isArray(course.lessons)
        ? course.lessons.map((l: any) => this.sanitizeLessonResponse(l))
        : [],
    };
  }

  async createCourse(data: any, adminUser?: { email?: string }) {
    const { target, lessons, ...courseData } = data;
    const created = await this.repo.createCourse(courseData);

    if (Array.isArray(lessons) && lessons.length > 0) {
      const records: any[] = [];
      for (let idx = 0; idx < lessons.length; idx++) {
        const l = lessons[idx];
        let driveFileId: string | null = null;
        let url = l.url || null;
        if (l.type === 'VIDEO') {
          const raw = l.driveFileId || l.driveUrl || l.driveVideoId || l.url;
          driveFileId = await this.validateAndResolveDriveVideo(raw);
          url = null;
        }
        records.push({
          courseId: created.id,
          title: l.title,
          type: l.type || 'YOUTUBE',
          youtubeVideoId: l.youtubeVideoId || null,
          url,
          driveFileId,
          notes: l.notes || null,
          durationSec: l.durationSec || null,
          order: l.order !== undefined ? l.order : idx + 1,
        });
      }
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
    let driveFileId: string | null = null;
    let url = data.url || null;
    if (data.type === 'VIDEO') {
      const raw = data.driveFileId || data.driveUrl || data.driveVideoId || data.url;
      driveFileId = await this.validateAndResolveDriveVideo(raw);
      url = null;
    }
    const order = data.order !== undefined ? data.order : (await this.repo.getLessonMaxOrder(courseId)) + 1;
    const { driveUrl, driveVideoId, ...payload } = data;
    const created = await this.repo.createLesson({
      ...payload,
      courseId,
      order,
      url,
      driveFileId,
    });
    return this.sanitizeLessonResponse(created);
  }

  async bulkCreateLessons(courseId: string, lessons: BulkLessonItem[]) {
    await this.getAdminCourse(courseId);
    const maxOrder = await this.repo.getLessonMaxOrder(courseId);
    const records: any[] = [];
    for (let idx = 0; idx < lessons.length; idx++) {
      const l = lessons[idx];
      let driveFileId: string | null = null;
      let url = l.url || null;
      if (l.type === 'VIDEO') {
        const raw = l.driveFileId || l.driveUrl || l.driveVideoId || l.url;
        driveFileId = await this.validateAndResolveDriveVideo(raw);
        url = null;
      }
      records.push({
        courseId,
        title: l.title,
        type: l.type || 'YOUTUBE',
        youtubeVideoId: l.youtubeVideoId || null,
        url,
        driveFileId,
        notes: l.notes || null,
        durationSec: l.durationSec || null,
        order: l.order !== undefined ? l.order : maxOrder + idx + 1,
      });
    }
    await this.repo.createLessonsBulk(records);
    return { success: true, count: records.length };
  }

  async updateLesson(lessonId: string, data: any) {
    const existing = await this.repo.findLessonById(lessonId);
    if (!existing) throw new NotFoundError('Lesson not found');

    const effectiveType = data.type || existing.type;
    let driveFileId = existing.driveFileId;
    let url = data.url !== undefined ? data.url : existing.url;

    if (effectiveType === 'VIDEO') {
      const raw = data.driveFileId || data.driveUrl || data.driveVideoId || data.url;
      if (raw !== undefined) {
        driveFileId = await this.validateAndResolveDriveVideo(raw);
        url = null;
      }
    } else if (data.type && data.type !== 'VIDEO') {
      driveFileId = null;
    }

    const { driveUrl, driveVideoId, ...payload } = data;
    const updated = await this.repo.updateLesson(lessonId, {
      ...payload,
      ...(url !== undefined && { url }),
      driveFileId,
    });
    return this.sanitizeLessonResponse(updated);
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
