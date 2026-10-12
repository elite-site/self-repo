export interface CourseCardSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  category: string | null;
  level: any;
  estimatedHours: number | null;
  status: any;
  enrolment: any;
  featured: boolean;
  dueAt: string | null;
  lessonCount: number;
  totalDurationSec: number;
  isEnrolled?: boolean;
  progressPercent?: number;
  enrollmentStatus?: any;
  isAssigned?: boolean;
}

export interface StudentHistoryItem {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl: string | null;
  completedAt: string | null;
  lastLessonTitle?: string;
  lastLessonId?: string;
  lastAccessedAt: string;
}

export interface HomeFeedResponse {
  hero: CourseCardSummary | null;
  rows: {
    continueLearning: CourseCardSummary[];
    assignedToYou: CourseCardSummary[];
    topCourses: CourseCardSummary[];
    newCourses: CourseCardSummary[];
    categories: Array<{ category: string; courses: CourseCardSummary[] }>;
    history: StudentHistoryItem[];
  };
}
