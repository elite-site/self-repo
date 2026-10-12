import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, BookOpen, Play, CheckCircle2, FileText, HelpCircle, ExternalLink } from 'lucide-react';
import { useCourseDetailQuery, useEnrollCourseMutation } from '../hooks';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LessonType } from '../types';

const TYPE_ICONS: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  YOUTUBE: Play,
  NOTES: FileText,
  QUIZ: HelpCircle,
  LINK: ExternalLink,
};

export const CourseDetailPage: React.FC = () => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { data, isLoading } = useCourseDetailQuery(slugOrId || '');
  const enrollMutation = useEnrollCourseMutation(slugOrId);

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const { course, enrollment } = data;
  const firstUnfinishedLesson = course.lessons.find((l) => !l.completed) || course.lessons[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-edge bg-surface-raised p-6 shadow-xs sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {course.category && <Badge label={course.category} variant="neutral" dot={false} />}
          {course.level && <Badge label={course.level} variant="info" />}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{course.title}</h1>
        <p className="text-sm leading-relaxed text-ink-secondary">{course.description}</p>
        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
          {course.estimatedHours !== null && course.estimatedHours !== undefined && (
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> {course.estimatedHours}h total</span>
          )}
          <span className="flex items-center gap-1"><BookOpen className="size-3.5" /> {course.lessons.length} lessons</span>
        </div>
        <div className="pt-2">
          {enrollment.enrolled ? (
            <div className="space-y-3">
              <ProgressBar label="Your Course Progress" value={enrollment.progressPercent} showValue />
              {firstUnfinishedLesson && (
                <Link to={`/learning/lessons/${firstUnfinishedLesson.id}`}>
                  <Button variant="primary" size="md" className="gap-2">
                    <Play className="size-4 fill-current" />
                    <span>{enrollment.progressPercent > 0 ? 'Continue Learning' : 'Start Course'}</span>
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              disabled={enrollMutation.isPending}
              onClick={() => enrollMutation.mutate(course.id)}
            >
              {enrollMutation.isPending ? 'Enrolling...' : 'Enroll in Course'}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-ink">Course Syllabus</h2>
        {course.lessons.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No lessons published yet"
            description="The syllabus for this course is being prepared by faculty."
          />
        ) : (
          <div className="divide-y divide-edge rounded-xl border border-edge bg-surface">
            {course.lessons.map((lesson) => {
              const Icon = TYPE_ICONS[lesson.type] || FileText;
              return (
                <Link
                  key={lesson.id}
                  to={`/learning/lessons/${lesson.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-surface-sunken"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-ink-muted w-5">{lesson.order}.</span>
                    <Icon className="size-4 text-ink-muted" />
                    <span className="text-sm font-medium text-ink">{lesson.title}</span>
                  </div>
                  {lesson.completed && <CheckCircle2 className="size-4 text-success" />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetailPage;
