export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type EnrolmentType = 'OPEN' | 'ASSIGNED_ONLY';
export type LessonType = 'YOUTUBE' | 'LINK' | 'NOTES' | 'QUIZ';
export type TargetType = 'ALL' | 'STUDENT' | 'BATCH';
export type EnrollmentSource = 'SELF' | 'ASSIGNED';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED';
export type QuizShowAnswers = 'NEVER' | 'AFTER_SUBMIT' | 'AFTER_DEADLINE';
export type QuizQuestionType = 'SINGLE' | 'MULTI' | 'TRUE_FALSE';

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
  progressPercent?: number; // 0 - 100
  enrollmentStatus?: EnrollmentStatus;
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

export interface StudentDeadlineItem {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  lessonId?: string;
  quizId?: string;
  title: string;
  dueAt: string;
  type: 'COURSE' | 'QUIZ';
}

export interface HomeFeedResponse {
  hero: CourseCardSummary | null;
  rows: {
    continueLearning: CourseCardSummary[];
    assignedToYou: CourseCardSummary[];
    topCourses: CourseCardSummary[];
    newCourses: CourseCardSummary[];
    categories: Array<{
      category: string;
      courses: CourseCardSummary[];
    }>;
    history: StudentHistoryItem[];
  };
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

export interface LessonDetailResponse {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  title: string;
  order: number;
  type: LessonType;
  durationSec: number | null;
  youtubeVideoId: string | null;
  url: string | null;
  notes: string | null;
  quizId: string | null;
  nextLessonId: string | null;
  prevLessonId: string | null;
  progress: {
    completed: boolean;
    secondsWatched: number;
    maxPositionSec: number;
  };
}

export interface QuizQuestionSummary {
  id: string;
  order: number;
  type: QuizQuestionType;
  text: string;
  points: number;
  options: Array<{
    id: string;
    order: number;
    text: string;
  }>;
}

export interface QuizDetailResponse {
  id: string;
  courseId: string;
  lessonId: string;
  opensAt: string | null;
  dueAt: string | null;
  maxAttempts: number;
  timeLimitMin: number | null;
  passPercent: number;
  showAnswers: QuizShowAnswers;
  totalPoints: number;
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  questions: QuizQuestionSummary[];
}

export interface QuizAttemptResult {
  attemptId: string;
  score: number;
  maxScore: number;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  answersReview?: Array<{
    questionId: string;
    selectedOptionIds: string[];
    isCorrect?: boolean;
    correctOptionIds?: string[];
    explanation?: string | null;
  }>;
}
