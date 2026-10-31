import React, { useEffect, useRef } from 'react';
import {
  Play,
  FileText,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { LessonSummary, LessonType } from '../types';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { cn } from '@/shared/lib/cn';
import { formatDuration } from '../lib/timecode';
import { scrollWithin } from '../lib/scrollWithin';

export interface LessonSidebarProps {
  lessons: LessonSummary[];
  currentLessonId: string;
  onSelectLesson: (lessonId: string) => void;
  courseTitle?: string;
  className?: string;
}

const TYPE_ICONS: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  YOUTUBE: Play,
  NOTES: FileText,
  QUIZ: HelpCircle,
  LINK: ExternalLink,
};

export const LessonSidebar: React.FC<LessonSidebarProps> = ({
  lessons,
  currentLessonId,
  onSelectLesson,
  courseTitle,
  className,
}) => {
  const navRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  const completedCount = lessons.filter((l) => l.completed).length;
  const totalLessons = lessons.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Scroll the current lesson into view within the nav list on mount and
  // whenever the current lesson changes. Uses scrollWithin so only the
  // sidebar panel scrolls, never the whole page (AGENTS task requirement).
  useEffect(() => {
    scrollWithin(navRef.current, activeItemRef.current, 'smooth');
  }, [currentLessonId]);

  return (
    <aside
      className={cn(
        'flex flex-col rounded-xl border border-edge bg-surface shadow-xs',
        className,
      )}
      aria-label="Course lessons"
    >
      {/* ── Header: title + progress ─────────────────────────────────── */}
      <div className="border-b border-edge p-4">
        {courseTitle && (
          <h2 className="mb-2 line-clamp-1 text-label-md font-bold text-ink">
            {courseTitle}
          </h2>
        )}

        <p className="mb-2 text-label-sm text-ink-muted">
          {completedCount} of {totalLessons}{' '}
          {totalLessons === 1 ? 'lesson' : 'lessons'} completed
        </p>

        <ProgressBar
          label="Lessons completed"
          value={progressPercent}
        />
      </div>

      {/* ── Lesson list ──────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        className="flex-1 overflow-y-auto p-2"
        aria-label="Lesson list"
      >
        <ul className="space-y-1" role="list">
          {lessons.map((lesson) => {
            const isActive = lesson.id === currentLessonId;
            const Icon = TYPE_ICONS[lesson.type] ?? FileText;
            const durationStr = formatDuration(lesson.durationSec ?? undefined);
            const isInProgress =
              !lesson.completed && (lesson.secondsWatched ?? 0) > 0;
            const watchedPercent =
              isInProgress && lesson.durationSec && lesson.durationSec > 0
                ? Math.min(
                    100,
                    Math.round(((lesson.secondsWatched ?? 0) / lesson.durationSec) * 100),
                  )
                : 0;

            return (
              <li key={lesson.id} role="listitem">
                <button
                  ref={isActive ? (el) => { activeItemRef.current = el; } : undefined}
                  type="button"
                  onClick={() => onSelectLesson(lesson.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'border border-brand/40 bg-brand-soft/20 text-ink font-semibold'
                      : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
                  )}
                >
                  <div className="flex w-full items-center gap-3">
                    {/* Order badge */}
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full text-label-sm font-semibold',
                        isActive
                          ? 'bg-brand text-on-brand'
                          : 'bg-surface-sunken text-ink-muted group-hover:text-ink',
                      )}
                      aria-hidden="true"
                    >
                      {lesson.order}
                    </span>

                    {/* Icon + title */}
                    <div className="flex flex-1 items-center gap-2 overflow-hidden">
                      <Icon
                        className={cn(
                          'size-4 shrink-0',
                          isActive ? 'text-brand' : 'text-ink-muted',
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate text-label-sm">{lesson.title}</span>
                    </div>

                    {/* Duration */}
                    {durationStr && (
                      <span className="shrink-0 text-label-xs text-ink-muted">
                        {durationStr}
                      </span>
                    )}

                    {/* Completed checkmark */}
                    {lesson.completed && (
                      <CheckCircle2
                        className="size-4 shrink-0 text-success"
                        aria-label="Completed"
                      />
                    )}
                  </div>

                  {/* In-progress thin bar */}
                  {isInProgress && watchedPercent > 0 && (
                    <div
                      className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-surface-inset"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${watchedPercent}%` }}
                      />
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default LessonSidebar;
