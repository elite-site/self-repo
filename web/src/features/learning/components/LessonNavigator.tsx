import React from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, SkipForward } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { cn } from '@/shared/lib/cn';
import { formatDuration } from '../lib/timecode';
import type { LessonDetailResponse, LessonSummary } from '../types';

export interface LessonNavigatorProps {
  lesson: LessonDetailResponse;
  lessons: LessonSummary[];
  courseProgressPercent: number;
  onPrevious: () => void;
  onNext: () => void;
  onMarkAsCompleted: () => void;
  className?: string;
}

/**
 * Under-player navigator strip.
 *
 * Renders lesson metadata (title, position, duration, completion badge),
 * course-progress bar, Previous/Next navigation, an "Up next" hint,
 * and a "Mark as Completed" button for non-video lessons.
 *
 * Keyboard navigation via Shift+N / Shift+P is handled by useLessonShortcuts
 * in LessonPlayerPage; this component exposes the same callbacks via buttons
 * with full accessible names.
 */
export const LessonNavigator: React.FC<LessonNavigatorProps> = ({
  lesson,
  lessons,
  courseProgressPercent,
  onPrevious,
  onNext,
  onMarkAsCompleted,
  className,
}) => {
  const totalLessons = lessons.length;
  const currentIndex = lessons.findIndex((l) => l.id === lesson.id);

  const prevLesson =
    lesson.prevLessonId && currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    lesson.nextLessonId && currentIndex >= 0 && currentIndex < totalLessons - 1
      ? lessons[currentIndex + 1]
      : null;

  const durationStr = formatDuration(lesson.durationSec ?? undefined);

  // "Mark as Completed" only appears for non-video lessons that aren't yet done.
  const showMarkCompleted =
    lesson.type !== 'YOUTUBE' && !lesson.progress.completed;

  return (
    <div
      className={cn(
        'rounded-xl border border-edge bg-surface p-4 shadow-xs sm:p-5',
        className,
      )}
    >
      {/* ── Lesson identity ─────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-label-md font-semibold text-brand">
            Lesson {lesson.order} of {totalLessons}
          </span>

          {lesson.progress.completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle/30 px-2 py-0.5 text-label-sm font-semibold text-success">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Completed
            </span>
          )}
        </div>

        <h2 className="text-headline-sm font-bold tracking-tight text-ink line-clamp-2">
          {lesson.title}
        </h2>

        {durationStr && (
          <span className="mt-1 inline-flex items-center gap-1 text-label-sm text-ink-muted">
            <Clock className="size-3.5" aria-hidden="true" />
            {durationStr}
          </span>
        )}
      </div>

      {/* ── Course progress ─────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-label-sm text-ink-muted">Course progress</span>
          <span className="text-label-sm font-semibold tabular-nums text-ink-secondary">
            {Math.round(courseProgressPercent)}%
          </span>
        </div>
        <ProgressBar
          label="Course completion progress"
          value={courseProgressPercent}
        />
      </div>

      {/* ── Previous / Next navigation ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-t border-edge pt-4">
        <Button
          variant="secondary"
          size="sm"
          disabled={!lesson.prevLessonId}
          onClick={onPrevious}
          aria-label={
            prevLesson
              ? `Previous lesson: ${prevLesson.title}`
              : 'Previous lesson (none)'
          }
          className="gap-1.5 text-xs"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>Previous</span>
        </Button>

        {showMarkCompleted && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onMarkAsCompleted}
            className="text-xs"
          >
            Mark as Completed
          </Button>
        )}

        <Button
          variant="primary"
          size="sm"
          disabled={!lesson.nextLessonId}
          onClick={onNext}
          aria-label={
            nextLesson ? `Next lesson: ${nextLesson.title}` : 'Next lesson (none)'
          }
          className="gap-1.5 text-xs"
        >
          <span>Next</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* ── "Up next" hint ──────────────────────────────────────────────── */}
      {nextLesson && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-2">
          <SkipForward className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
          <p className="truncate text-label-sm text-ink-secondary">
            <span className="font-medium text-ink-muted">Up next:</span>{' '}
            {nextLesson.title}
          </p>
        </div>
      )}
    </div>
  );
};

export default LessonNavigator;
