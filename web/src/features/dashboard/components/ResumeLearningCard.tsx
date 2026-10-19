import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Play, ChevronRight } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useLearningHomeQuery } from '@/features/learning/hooks/useLearningHome';
import { cn } from '@/shared/lib/cn';
import { useSpotlight } from '@/hooks/useSpotlight';
import { GlowButton } from './GlowButton';

const isLearningHubEnabled =
  (import.meta as any).env?.VITE_FEATURE_LEARNINGHUB !== 'false' &&
  (import.meta as any).env?.FEATURE_LEARNINGHUB !== 'false';

export interface ResumeLearningCardProps {
  className?: string;
}

export const ResumeLearningCard: React.FC<ResumeLearningCardProps> = ({ className }) => {
  const [imageError, setImageError] = useState(false);
  const { data, isLoading, isError } = useLearningHomeQuery({ enabled: isLearningHubEnabled });
  const { spotlightProps } = useSpotlight();

  if (!isLearningHubEnabled || isError || (!isLoading && !data)) return null;

  if (isLoading) {
    return (
      <div className={cn('glow-card p-5 sm:p-6', className)} aria-busy="true">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <Skeleton className="h-5 w-36 rounded-md bg-white/10" />
          <Skeleton className="h-4 w-20 rounded-md bg-white/10" />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-4 items-start">
          <Skeleton className="aspect-video w-full sm:w-48 rounded-lg shrink-0 bg-white/10" />
          <div className="flex-1 space-y-2 w-full">
            <Skeleton className="h-5 w-3/4 rounded-md bg-white/10" />
            <Skeleton className="h-4 w-full rounded-md bg-white/10" />
            <Skeleton className="h-9 w-32 rounded-full mt-3 bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  const continueList = data?.rows?.continueLearning || [];
  const historyList = data?.rows?.history || [];
  const inProgressCourse = continueList[0] || null;
  const historyItem = historyList[0] || null;
  const hasInProgress = Boolean(inProgressCourse || historyItem);

  const recommendedCourse =
    data?.hero || data?.rows?.assignedToYou?.[0] || data?.rows?.topCourses?.[0] || data?.rows?.newCourses?.[0] || null;

  const courseTitle = inProgressCourse?.title || historyItem?.courseTitle || recommendedCourse?.title || 'Python for Data Science';
  const courseSlug = inProgressCourse?.slug || historyItem?.courseSlug || recommendedCourse?.slug || inProgressCourse?.id || 'python-data-science';
  const lastLessonTitle = historyItem?.lastLessonTitle || null;
  const lastLessonId = historyItem?.lastLessonId || null;
  const progressPercent = inProgressCourse?.progressPercent ?? (historyItem?.completedAt ? 100 : 45);
  const thumbnailUrl = inProgressCourse?.thumbnailUrl || historyItem?.thumbnailUrl || recommendedCourse?.thumbnailUrl || null;
  const isPython = /python/i.test(courseTitle);

  const resumeLink = lastLessonId ? `/learning/lessons/${lastLessonId}` : `/learning/courses/${courseSlug}`;

  return (
    <section
      {...spotlightProps}
      className={cn('glow-card python-card p-5 sm:p-6', className)}
      aria-labelledby="learninghub-dashboard-heading"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
            <GraduationCap className="size-4" aria-hidden="true" />
          </div>
          <h2 id="learninghub-dashboard-heading" className="font-heading text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
            <span>{hasInProgress ? 'Resume Learning' : 'Explore LearningHub'}</span>
            <span aria-hidden="true">{isPython ? '🐍' : '✨'}</span>
          </h2>
          <Badge label={hasInProgress ? 'In progress' : 'Featured'} variant="info" dot />
        </div>

        <Link to="/learning" className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-purple-400 hover:text-purple-300">
          <span>{hasInProgress ? 'All courses' : 'View all'}</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
        <div className="relative aspect-video w-full sm:w-44 lg:w-48 rounded-xl overflow-hidden bg-[#11111a] shrink-0 border border-white/10">
          {thumbnailUrl && !imageError ? (
            <img
              src={thumbnailUrl}
              alt={courseTitle}
              loading="lazy"
              onError={() => setImageError(true)}
              className="python-thumbnail h-full w-full object-cover"
            />
          ) : (
            <div className="python-thumbnail flex h-full w-full items-center justify-center bg-purple-950/40 text-purple-400">
              <GraduationCap className="size-8 opacity-70" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
            <span className="play-ring-pulse flex size-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg">
              <Play className="size-4 fill-current translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5 w-full">
          <div>
            <h3 className="font-heading text-base sm:text-lg font-bold text-white truncate">
              {courseTitle}
            </h3>
            {lastLessonTitle ? (
              <p className="text-xs text-white/60 mt-0.5 flex items-center gap-1.5">
                <span className="font-medium text-purple-400">Next up:</span>
                <span className="truncate">{lastLessonTitle}</span>
              </p>
            ) : (
              <p className="text-xs text-white/50 mt-0.5">Pick up where you left off</p>
            )}
          </div>

          <ProgressBar value={progressPercent} label={`${courseTitle} progress`} showValue className="max-w-md" />

          <div className="pt-1 flex flex-wrap items-center gap-2.5 sm:gap-3">
            <GlowButton to={resumeLink} variant="primary" breathing className="text-xs sm:text-sm px-4 py-2 gap-1.5 shrink-0">
              <Play className="size-3.5 fill-current" aria-hidden="true" />
              <span>{hasInProgress ? 'Resume lesson' : 'Try this course'}</span>
            </GlowButton>
            <Link
              to={`/learning/courses/${courseSlug}`}
              className="glow-btn text-xs sm:text-sm px-3.5 py-2 rounded-full border border-white/10 bg-[#11111a] text-white/80 hover:text-white shrink-0"
            >
              Course syllabus
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResumeLearningCard;
