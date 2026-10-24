import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Hourglass, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { cn } from '@/shared/lib/cn';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import type { DashboardTask, DashboardTaskState } from '../types';

const COLUMNS: ReadonlyArray<{ id: DashboardTaskState; title: string; empty: string }> = [
  { id: 'todo', title: 'To Do', empty: 'Nothing left to do 🎉' },
  { id: 'progress', title: 'In Progress', empty: 'Nothing is waiting on review' },
  { id: 'done', title: 'Done', empty: 'Finished sections land here' },
];

/** Icon tile behind each card's status. Token-only, and mirrored by the badge. */
const TILE: Record<DashboardTaskState, string> = {
  todo: 'bg-surface-inset text-ink-secondary',
  progress: 'bg-status-bg-pending text-status-pending',
  done: 'bg-status-bg-approved text-status-approved',
};

/** The glyph in that tile — a second, non-colour signal for the same state. */
const STATE_ICON: Record<DashboardTaskState, LucideIcon> = {
  todo: Hourglass,
  progress: Hourglass,
  done: CheckCircle2,
};

const TaskCard: React.FC<{ task: DashboardTask }> = ({ task }) => {
  const navigate = useNavigate();
  const StateIcon = STATE_ICON[task.state];
  const Icon = task.icon;
  const action = task.state === 'todo' ? task.cta : task.state === 'progress' ? 'Check status' : 'View';

  return (
    <Card
      variant="interactive"
      className="p-3.5 sm:p-4 h-full flex flex-col justify-between"
      onClick={() => navigate(task.to)}
    >
      <div>
        <div className="flex items-start gap-2.5 sm:gap-3">
          <span
            className={cn(
              'flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg',
              TILE[task.state],
            )}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="font-heading text-label-md sm:text-headline-sm font-bold text-ink leading-snug">
              {task.title}
              <span className="sr-only">{` — opens ${task.destination}`}</span>
            </h4>
            <p className="mt-0.5 text-body-xs sm:text-body-sm text-ink-secondary line-clamp-2">
              {task.hint}
            </p>
          </div>
          <StateIcon
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-ink-muted"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-edge/50">
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className={cn('badge text-xs', task.tone)}>{task.badge}</span>
          {task.dateChip && (
            <span className="inline-flex items-center rounded-full bg-surface-inset px-2 py-0.5 text-label-sm text-ink-secondary">
              {task.dateChip}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'btn pointer-events-none text-xs px-2.5 py-1',
            task.state === 'todo' ? 'btn-primary' : 'btn-secondary',
          )}
        >
          {action}
        </span>
      </div>
    </Card>
  );
};

interface TaskRowCarouselProps {
  tasks: DashboardTask[];
  title: string;
}

const TaskRowCarousel: React.FC<TaskRowCarouselProps> = ({ tasks, title }) => {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const shouldReduce = useReducedMotion();

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => checkScroll());
      ro.observe(el);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [checkScroll, tasks]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === 'left' ? -300 : 300;
    el.scrollBy({
      left: offset,
      behavior: shouldReduce ? 'auto' : 'smooth',
    });
  };

  return (
    <div className="relative group">
      {/* Visual overflow indicator & navigation: Left */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none">
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-surface via-surface/80 to-transparent"
          />
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label={`Scroll ${title} tasks left`}
            className="pointer-events-auto ml-1 flex size-8 items-center justify-center rounded-full border border-edge bg-surface/90 backdrop-blur text-ink-secondary hover:text-ink hover:border-brand shadow-md transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-focus"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Side-scrolling row of cards */}
      <ul
        ref={scrollRef}
        onScroll={checkScroll}
        tabIndex={0}
        role="region"
        aria-label={`${title} tasks`}
        className="flex items-stretch gap-3 overflow-x-auto scroll-smooth py-1 px-0.5 snap-x snap-mandatory focus:outline-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tasks.map((task) => (
          <li
            key={task.id}
            className="w-[270px] sm:w-[310px] shrink-0 snap-start flex"
          >
            <div className="w-full">
              <TaskCard task={task} />
            </div>
          </li>
        ))}
      </ul>

      {/* Visual overflow indicator & navigation: Right */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end pointer-events-none">
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-surface via-surface/80 to-transparent"
          />
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label={`Scroll ${title} tasks right`}
            className="pointer-events-auto mr-1 flex size-8 items-center justify-center rounded-full border border-edge bg-surface/90 backdrop-blur text-ink-secondary hover:text-ink hover:border-brand shadow-md transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-focus"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

export interface DashboardTaskBoardProps {
  tasks: DashboardTask[];
}

export const DashboardTaskBoard: React.FC<DashboardTaskBoardProps> = ({ tasks }) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | DashboardTaskState>('all');
  const doneCount = tasks.filter((task) => task.state === 'done').length;

  const visibleColumns = selectedFilter === 'all'
    ? COLUMNS
    : COLUMNS.filter((col) => col.id === selectedFilter);

  return (
    <section className="surface p-4 sm:p-5 lg:p-6" aria-labelledby="task-board-heading">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="task-board-heading" className="font-heading text-headline-md text-ink">
            Your setup
          </h2>
          <p className="text-label-sm text-ink-muted">
            {doneCount} of {tasks.length} done
          </p>
        </div>

        {/* Status filter pills */}
        <div
          className="flex items-center gap-1 rounded-lg border border-edge bg-surface-sunken/60 p-1 text-label-xs"
          role="tablist"
          aria-label="Filter tasks by status"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedFilter === 'all'}
            onClick={() => setSelectedFilter('all')}
            className={cn(
              'rounded-md px-2.5 py-1 font-medium transition-colors duration-fast',
              selectedFilter === 'all'
                ? 'bg-surface text-ink shadow-xs border border-edge font-semibold'
                : 'text-ink-secondary hover:text-ink'
            )}
          >
            All ({tasks.length})
          </button>
          {COLUMNS.map((col) => {
            const count = tasks.filter((t) => t.state === col.id).length;
            return (
              <button
                key={col.id}
                type="button"
                role="tab"
                aria-selected={selectedFilter === col.id}
                onClick={() => setSelectedFilter(col.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors duration-fast',
                  selectedFilter === col.id
                    ? 'bg-surface text-ink shadow-xs border border-edge font-semibold'
                    : 'text-ink-secondary hover:text-ink'
                )}
              >
                {col.title} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {visibleColumns.map((column) => {
          const columnTasks = tasks.filter((task) => task.state === column.id);

          return (
            <div
              key={column.id}
              role="group"
              aria-label={`${column.title} tasks`}
              className="min-w-0"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-headline-sm text-ink">{column.title}</h3>
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-surface-inset px-1.5 py-0.5 text-label-sm tabular-nums text-ink-secondary">
                  {columnTasks.length}
                </span>
              </div>

              {columnTasks.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-edge/70 bg-surface-sunken/30 px-3.5 py-2.5 text-body-xs sm:text-body-sm text-ink-muted">
                  {column.empty}
                </p>
              ) : (
                <div className="mt-2.5">
                  <TaskRowCarousel tasks={columnTasks} title={column.title} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const DashboardTaskBoardSkeleton: React.FC = () => (
  <div className="surface p-4 sm:p-5 lg:p-6 space-y-5" aria-hidden="true">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-24" />
    </div>
    {[0, 1].map((row) => (
      <div key={row} className="space-y-2.5">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((card) => (
            <Skeleton key={card} className="h-28 w-72 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default DashboardTaskBoard;