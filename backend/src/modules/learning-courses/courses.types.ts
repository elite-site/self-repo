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
  instructor?: string | null;
  prerequisites?: string | null;
  outcomes?: string | null;
  skills?: string[];
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
  youtubeVideoId?: string | null;
  url?: string | null;
  notes?: string | null;
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

export interface YouTubePlaylistItem {
  videoId: string;
  title: string;
  durationSec: number | null;
  durationText?: string | null;
  thumbnailUrl: string;
}

export interface YouTubePlaylistResult {
  playlistId: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  videoCount: number;
  videos: YouTubePlaylistItem[];
}

export interface AssignCoursePayload {
  targetType: CourseTargetType;
  studentIds?: string[];
  year?: number;
  section?: string;
}

export interface BulkLessonItem {
  title: string;
  type?: LessonType;
  youtubeVideoId?: string | null;
  url?: string | null;
  notes?: string | null;
  durationSec?: number | null;
  order?: number;
}

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export interface YouTubeTranscriptResult {
  segments: TranscriptSegment[];
  language: string;
  available: boolean;
}

export interface LessonTranscriptResponse {
  lessonId?: string;
  videoId?: string;
  available: boolean;
  language?: string;
  segments: TranscriptSegment[];
  message?: string;
}
