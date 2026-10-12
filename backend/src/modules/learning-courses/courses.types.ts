import { CourseLevel, CourseStatus, EnrolmentType, LessonType, CourseTargetType, EnrollmentSource, EnrollmentStatus } from '@prisma/client';

export interface CourseCardSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  category: string | null;
  level: CourseLevel | null;
  estimatedHours: number | null;
  status: CourseStatus;
  enrolment: EnrolmentType;
  featured: boolean;
  dueAt: string | null;
  lessonCount: number;
  totalDurationSec: number;
  isEnrolled?: boolean;
  progressPercent?: number;
  enrollmentStatus?: EnrollmentStatus;
  isAssigned?: boolean;
}

export interface LessonSummary {
  id: string;
  courseId: string;
  title: string;
  order: number;
  type: LessonType;
  durationSec?: number | null;
  completed?: boolean;
  secondsWatched?: number;
}

export interface CourseDetailResponse {
  course: CourseCardSummary & {
    lessons: LessonSummary[];
    createdAt: string;
    updatedAt: string;
  };
  enrollment: {
    enrolled: boolean;
    source?: EnrollmentSource;
    status?: EnrollmentStatus;
    completedAt?: string | null;
    progressPercent: number;
  };
}

export interface YouTubePreviewResult {
  videoId: string;
  title: string | null;
  thumbnailUrl: string | null;
  embeddable: boolean;
}

export interface AssignCoursePayload {
  targetType: CourseTargetType;
  studentIds?: string[];
  year?: number;
  section?: string;
}
