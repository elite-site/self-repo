import React from 'react';
import { Play, FileText, HelpCircle, ExternalLink, CheckCircle2, ChevronRight } from 'lucide-react';
import { LessonSummary, LessonType } from '../types';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

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

function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return '';
  const mins = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  if (mins === 0) return `${remainingSec}s`;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hours}h ${m}m`;
  }
  return `${mins}m`;
}

export const LessonSidebar: React.FC<LessonSidebarProps> = ({
  lessons,
  currentLessonId,
  onSelectLesson,
  courseTitle,
  className,
}) => {
  const currentIndex = lessons.findIndex((l) => l.id === currentLessonId);
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  return (
    <aside
      className={cn(
        'flex flex-col rounded-xl border border-edge bg-surface shadow-xs',
        className,
      )}
      aria-label="Course lessons"
    >
      <div className="border-b border-edge p-4">
        {courseTitle && (
          <h2 className="line-clamp-1 text-sm font-bold text-ink mb-1">
            {courseTitle}
          </h2>
        )}
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span>{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}</span>
          <span>{lessons.filter((l) => l.completed).length} completed</span>
        </div>

        {nextLesson && (
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectLesson(nextLesson.id)}
              className="w-full justify-between text-xs"
            >
              <span>Next lesson</span>
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {lessons.map((lesson) => {
          const isActive = lesson.id === currentLessonId;
          const Icon = TYPE_ICONS[lesson.type] || FileText;
          const durationStr = formatDuration(lesson.durationSec);

          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => onSelectLesson(lesson.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                isActive
                  ? 'border border-brand/40 bg-brand-soft/20 text-ink font-semibold'
                  : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-ink-muted group-hover:text-ink">
                {lesson.order}
              </span>

              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                <Icon className={cn('size-4 shrink-0', isActive ? 'text-brand' : 'text-ink-muted')} aria-hidden="true" />
                <span className="truncate text-xs">{lesson.title}</span>
              </div>

              {durationStr && (
                <span className="shrink-0 text-[11px] text-ink-muted">{durationStr}</span>
              )}

              {lesson.completed && (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Completed" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default LessonSidebar;
