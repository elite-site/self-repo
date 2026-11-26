import { EnrolmentType } from '../types';

/**
 * Minimum number of lessons for a course to use the explicit Enroll workflow.
 * Shorter OPEN courses (such as single-video full courses) support Direct Play.
 */
export const ENROLL_MIN_LESSONS = 5;

export function requiresEnrollment(course: {
  enrolment?: EnrolmentType;
  lessonCount?: number;
  lessons?: unknown[];
}): boolean {
  if (course.enrolment === 'ASSIGNED_ONLY') {
    return true;
  }
  const count = course.lessons ? course.lessons.length : (course.lessonCount ?? 0);
  return count >= ENROLL_MIN_LESSONS;
}
