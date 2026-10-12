import { LessonType } from '@prisma/client';
import { CourseCardSummary } from '../learning-courses/courses.types';

export interface LessonProgressPayload {
  secondsWatched: number;
  maxPositionSec: number;
  completed?: boolean;
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

export interface MyLearningResponse {
  inProgress: CourseCardSummary[];
  completed: CourseCardSummary[];
  deadlines: StudentDeadlineItem[];
}
