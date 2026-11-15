import { LessonType, Lesson, Course, Quiz } from '@prisma/client';
import { CourseCardSummary } from '../learning-courses/courses.types';

export interface LessonProgressPayload {
  secondsWatched: number;
  maxPositionSec: number;
  completed?: boolean;
}

export type LessonWithCourse = Lesson & {
  course: Pick<Course, 'id' | 'title' | 'slug' | 'status' | 'enrolment'>;
  quiz: Pick<Quiz, 'id' | 'dueAt'> | null;
};

export type LessonPlaybackResponse =
  | {
      status: 'PREPARING';
      retryAfterSec: number;
    }
  | {
      status: 'READY';
      url: string;
      expiresAt: string;
      leaseId: string;
    };

export interface PlaybackHeartbeatResponse {
  url: string;
  expiresAt: string;
}

export interface PlaybackReleaseResponse {
  released: boolean;
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
  hasVideo?: boolean;
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
