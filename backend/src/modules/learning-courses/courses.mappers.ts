import { CourseCardSummary, CourseDetailResponse } from './courses.types';

export function mapCourseCard(c: any, enrollment?: any): CourseCardSummary {
  const totalDurationSec = c.lessons?.reduce((acc: number, l: any) => acc + (l.durationSec || 0), 0) || 0;
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    thumbnailUrl: c.thumbnailUrl,
    category: c.category,
    level: c.level,
    estimatedHours: c.estimatedHours,
    status: c.status,
    enrolment: c.enrolment,
    featured: c.featured,
    dueAt: c.dueAt ? new Date(c.dueAt).toISOString() : null,
    instructor: c.instructor || null,
    prerequisites: c.prerequisites || null,
    outcomes: c.outcomes || null,
    skills: c.skills || [],
    lessonCount: c.lessons?.length || c._count?.lessons || 0,
    totalDurationSec,
    isEnrolled: !!enrollment,
    enrollmentStatus: enrollment?.status,
    isAssigned: enrollment?.source === 'ASSIGNED',
  };
}

export function mapCourseDetail(course: any, enrollment: any, progressList: any[]): CourseDetailResponse {
  const progressMap = new Map(progressList.map((p) => [p.lessonId, p]));
  const completedCount = progressList.filter((p) => p.completed).length;
  const progressPercent = course.lessons.length > 0 ? Math.round((completedCount / course.lessons.length) * 100) : 0;
  const totalDurationSec = course.lessons.reduce((acc: number, l: any) => acc + (l.durationSec || 0), 0);

  const lessons = course.lessons.map((l: any) => ({
    id: l.id,
    courseId: l.courseId,
    title: l.title,
    order: l.order,
    type: l.type,
    durationSec: l.durationSec,
    completed: progressMap.get(l.id)?.completed || false,
    secondsWatched: progressMap.get(l.id)?.secondsWatched || 0,
  }));

  return {
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      category: course.category,
      level: course.level,
      estimatedHours: course.estimatedHours,
      status: course.status,
      enrolment: course.enrolment,
      featured: course.featured,
      dueAt: course.dueAt ? new Date(course.dueAt).toISOString() : null,
      instructor: course.instructor || null,
      prerequisites: course.prerequisites || null,
      outcomes: course.outcomes || null,
      skills: course.skills || [],
      lessonCount: course.lessons.length,
      totalDurationSec,
      lessons,
      createdAt: new Date(course.createdAt).toISOString(),
      updatedAt: new Date(course.updatedAt).toISOString(),
    },
    enrollment: {
      enrolled: !!enrollment,
      source: enrollment?.source,
      status: enrollment?.status,
      completedAt: enrollment?.completedAt ? new Date(enrollment.completedAt).toISOString() : null,
      progressPercent,
    },
  };
}
