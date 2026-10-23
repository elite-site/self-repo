export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type EnrolmentType = 'OPEN' | 'ASSIGNED_ONLY';
export type LessonType = 'YOUTUBE' | 'LINK' | 'NOTES' | 'QUIZ';
export type TargetType = 'ALL' | 'STUDENT' | 'BATCH';
export type EnrollmentSource = 'SELF' | 'ASSIGNED';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED';
export type QuizShowAnswers = 'NEVER' | 'AFTER_SUBMIT' | 'AFTER_DEADLINE';
export type QuizQuestionType = 'SINGLE' | 'MULTI' | 'TRUE_FALSE';

export interface AdminCourseItem {
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
  instructor?: string | null;
  prerequisites?: string | null;
  outcomes?: string | null;
  skills?: string[];
  lessonCount: number;
  enrollmentCount: number;
  completionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLessonItem {
  id: string;
  courseId: string;
  title: string;
  order: number;
  type: LessonType;
  youtubeVideoId: string | null;
  url: string | null;
  notes: string | null;
  durationSec: number | null;
  quiz?: AdminQuizItem | null;
}

export interface YouTubePlaylistItem {
  videoId: string;
  title: string;
  durationSec: number | null;
  durationText?: string | null;
  thumbnailUrl: string;
}

export interface YouTubePreviewResult {
  videoId: string;
  title: string | null;
  description?: string | null;
  thumbnailUrl: string | null;
  embeddable: boolean;
  authorName?: string | null;
  durationSec?: number | null;
}

export interface YouTubePlaylistResult {
  playlistId: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  videoCount: number;
  videos: YouTubePlaylistItem[];
}

export interface AdminQuizOptionItem {
  id?: string;
  order: number;
  text: string;
  isCorrect: boolean;
}

export interface AdminQuizQuestionItem {
  id?: string;
  order: number;
  type: QuizQuestionType;
  text: string;
  explanation?: string | null;
  points: number;
  options: AdminQuizOptionItem[];
}

export interface AdminQuizItem {
  id?: string;
  courseId: string;
  lessonId: string;
  opensAt?: string | null;
  dueAt?: string | null;
  maxAttempts: number;
  timeLimitMin?: number | null;
  passPercent: number;
  showAnswers: QuizShowAnswers;
  questions: AdminQuizQuestionItem[];
}

export interface AdminCourseDetail extends AdminCourseItem {
  lessons: AdminLessonItem[];
  targets: Array<{
    id: string;
    targetType: TargetType;
    studentId?: string | null;
    year?: number | null;
    section?: string | null;
  }>;
}

export interface AdminEnrollmentItem {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNo: string;
  studentEmail?: string | null;
  source: EnrollmentSource;
  status: EnrollmentStatus;
  progressPercent: number;
  enrolledAt: string;
  completedAt?: string | null;
  lastAccessedAt: string;
}

export interface AdminLearningReport {
  courseId: string;
  courseTitle: string;
  totalEnrolled: number;
  completedCount: number;
  completionRate: number;
  averageProgress: number;
  quizStats?: {
    totalAttempts: number;
    averageScore: number;
    passRate: number;
  };
  studentProgress: AdminEnrollmentItem[];
}
