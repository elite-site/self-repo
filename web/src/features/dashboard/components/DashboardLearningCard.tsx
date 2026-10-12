import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Play, ArrowRight, BookOpen, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useLearningHomeQuery } from '@/features/learning/hooks/useLearningHome';
import { cn } from '@/shared/lib/cn';

const isLearningHubEnabled =
  (import.meta as any).env?.VITE_FEATURE_LEARNINGHUB !== 'false' &&
  (import.meta as any).env?.FEATURE_LEARNINGHUB !== 'false';

export interface DashboardLearningCardProps {
  className?: string;
}

export const DashboardLearningCard: React.FC<DashboardLearningCardProps> = ({ className }) => {
  const [imageError, setImageError] = useState(false);

  if (!isLearningHubEnabled) {
    return null;
  }

  const { data, isLoading, isError } = useLearningHomeQuery();

  if (isLoading) {
    return (
      <Card className={cn('p-5 sm:p-6', className)} aria-busy="true">
        <div className="flex items-center justify-between pb-4 border-b border-edge">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-4 items-start">
          <Skeleton className="aspect-video w-full sm:w-48 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2 w-full">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-9 w-32 rounded-lg mt-3" />
          </div>
        </div>
      </Card>
    );
  }

  if (isError || !data) {
    return null;
  }

  // 1. Determine if student has content to resume
  const continueList = data.rows?.continueLearning || [];
  const historyList = data.rows?.history || [];
  const hasInProgress = continueList.length > 0 || historyList.length > 0;

  const inProgressCourse = continueList[0] || null;
  const historyItem = historyList[0] || null;

  // 2. Determine target recommended course if never watched
  const recommendedCourse =
    data.hero ||
    data.rows?.assignedToYou?.[0] ||
    data.rows?.topCourses?.[0] ||
    data.rows?.newCourses?.[0] ||
    null;

  // If there are no courses at all, display a clean prompt to explore
  if (!hasInProgress && !recommendedCourse) {
    return (
      <Card className={cn('p-5 sm:p-6', className)} aria-labelledby="learninghub-dashboard-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-brand" aria-hidden="true" />
            <h2 id="learninghub-dashboard-heading" className="font-heading text-headline-sm text-ink font-bold">
              LearningHub
            </h2>
          </div>
          <Link
            to="/learning"
            className="flex items-center gap-1 text-label-sm font-semibold text-brand hover:underline"
          >
            <span>Browse courses</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-2 text-body-sm text-ink-secondary">
          Boost your technical skills with department-curated video courses, interactive transcripts, and quizzes.
        </p>
      </Card>
    );
  }

  if (hasInProgress) {
    const courseTitle = inProgressCourse?.title || historyItem?.courseTitle || 'Your Course';
    const courseSlug = inProgressCourse?.slug || historyItem?.courseSlug || inProgressCourse?.id || '';
    const lastLessonTitle = historyItem?.lastLessonTitle || null;
    const lastLessonId = historyItem?.lastLessonId || null;
    const progressPercent = inProgressCourse?.progressPercent ?? (historyItem?.completedAt ? 100 : 35);
    const thumbnailUrl = inProgressCourse?.thumbnailUrl || historyItem?.thumbnailUrl || null;

    const resumeLink = lastLessonId
      ? `/learning/lessons/${lastLessonId}`
      : `/learning/courses/${courseSlug}`;

    return (
      <Card
        className={cn('p-5 sm:p-6 transition-all duration-normal border border-edge bg-surface shadow-xs', className)}
        aria-labelledby="learninghub-dashboard-heading"
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-edge">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <GraduationCap className="size-4" aria-hidden="true" />
            </div>
            <h2 id="learninghub-dashboard-heading" className="font-heading text-headline-sm text-ink font-bold">
              Resume Learning
            </h2>
            <Badge label="In progress" variant="info" dot />
          </div>

          <Link
            to="/learning"
            className="flex items-center gap-1 text-label-sm font-semibold text-brand hover:underline shrink-0"
          >
            <span>All courses</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
          <div className="relative aspect-video w-full sm:w-44 lg:w-48 rounded-lg overflow-hidden bg-surface-sunken shrink-0 border border-edge">
            {thumbnailUrl && !imageError ? (
              <img
                src={thumbnailUrl}
                alt={courseTitle}
                loading="lazy"
                onError={() => setImageError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-soft/20 text-brand">
                <GraduationCap className="size-8 opacity-70" aria-hidden="true" />
              </div>
            )}
            <div className="absolute inset-0 bg-ink/10 flex items-center justify-center pointer-events-none">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand text-on-brand shadow-raised">
                <Play className="size-4 fill-current translate-x-0.5" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2.5 w-full">
            <div>
              <h3 className="font-heading text-headline-sm font-bold text-ink truncate">
                {courseTitle}
              </h3>
              {lastLessonTitle ? (
                <p className="text-body-xs text-ink-secondary mt-0.5 flex items-center gap-1.5">
                  <span className="font-medium text-brand">Next up:</span>
                  <span className="truncate">{lastLessonTitle}</span>
                </p>
              ) : (
                <p className="text-body-xs text-ink-muted mt-0.5">Pick up where you left off</p>
              )}
            </div>

            <ProgressBar
              value={progressPercent}
              label={`${courseTitle} progress`}
              showValue
              className="max-w-md"
            />

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Link to={resumeLink} className="btn btn-primary text-xs sm:text-sm px-4 py-2 gap-1.5 shrink-0">
                <Play className="size-3.5 fill-current" aria-hidden="true" />
                <span>Resume lesson</span>
              </Link>
              <Link
                to={`/learning/courses/${courseSlug}`}
                className="btn btn-secondary text-xs sm:text-sm px-3.5 py-2 shrink-0"
              >
                Course syllabus
              </Link>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // 3. Fallback: Student has NEVER watched anything — show one to try!
  const course = recommendedCourse;
  const coursePath = `/learning/courses/${course.slug || course.id}`;

  return (
    <Card
      className={cn('p-5 sm:p-6 transition-all duration-normal border border-edge bg-surface shadow-xs', className)}
      aria-labelledby="learninghub-dashboard-heading"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-edge">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <h2 id="learninghub-dashboard-heading" className="font-heading text-headline-sm text-ink font-bold">
            Explore LearningHub
          </h2>
          <Badge label={course.isAssigned ? 'Assigned to you' : 'Featured course'} variant={course.isAssigned ? 'warning' : 'neutral'} dot={false} />
        </div>

        <Link
          to="/learning"
          className="flex items-center gap-1 text-label-sm font-semibold text-brand hover:underline shrink-0"
        >
          <span>View all</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        <div className="relative aspect-video w-full sm:w-44 lg:w-48 rounded-lg overflow-hidden bg-surface-sunken shrink-0 border border-edge">
          {course.thumbnailUrl && !imageError ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              loading="lazy"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-soft/20 text-brand">
              <GraduationCap className="size-8 opacity-70" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2 w-full">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {course.category && <span className="text-label-xs uppercase font-semibold text-brand tracking-wider">{course.category}</span>}
              {course.level && <Badge label={course.level} variant="neutral" dot={false} />}
            </div>
            <h3 className="font-heading text-headline-sm font-bold text-ink">
              {course.title}
            </h3>
            {course.description && (
              <p className="mt-1 text-body-xs text-ink-secondary line-clamp-2">
                {course.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <BookOpen className="size-3.5" aria-hidden="true" />
              {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
            </span>
            {course.estimatedHours !== null && course.estimatedHours !== undefined && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {course.estimatedHours}h
              </span>
            )}
            {course.instructor && (
              <span className="truncate">By {course.instructor}</span>
            )}
          </div>

          <div className="pt-2">
            <Link to={coursePath} className="btn btn-primary text-xs sm:text-sm px-4 py-2 gap-1.5 shrink-0">
              <Play className="size-3.5 fill-current" aria-hidden="true" />
              <span>Try this course</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DashboardLearningCard;
