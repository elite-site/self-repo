import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Hourglass, type LucideIcon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/cn';

/**
 * The Kanban task board — REDESIGN_PLAN §6.2 (3).
 *
 * The board has no endpoint of its own: §6.2 asks for "pending tasks" grouped by
 * status, and the tasks that already exist in the API are the six profile
 * sections the completion banner counts. The page derives one `DashboardTask`
 * per section and this file only decides how they are grouped, ranked and
 * drawn. Anything the board needed that no endpoint returns — a due date, a
 * "mark complete" mutation, a login streak — is deliberately absent rather than
 * invented (§2.4).
 */

/**
 * The `.badge-*` class names from `shared/tokens.css`, spelled out so a typo in
 * one of them is a compile error rather than a pill that renders with no
 * background. Moderation UI depends on these exact names.
 */
export type DashboardTone =
  | 'badge-draft'
  | 'badge-pending'
  | 'badge-review'
  | 'badge-approved'
  | 'badge-rejected'
  | 'badge-changes';

export type DashboardTaskState = 'todo' | 'progress' | 'done';

export interface DashboardTask {
  /** Stable across renders; used as the React key and the list label. */
  id: string;
  title: string;
  /** One line on why this section is worth filling in. */
  hint: string;
  /** A real date from the API, when the state has one (video submission date). */
  dateChip?: string;
  /** Where the card navigates. */
  to: string;
  /** What `to` is in words, so the card announces where it goes (§3.4). */
  destination: string;
  icon: LucideIcon;
  state: DashboardTaskState;
  /**
   * The state in words. §3.4 forbids colour as the only difference between two
   * states, so this badge is the carrier: it says "Under review", not "amber".
   */
  badge: string;
  tone: DashboardTone;
  /** The action label while the task is still open. */
  cta: string;
}

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

  /**
   * The whole card is one control: §6.2 "Clicking a Kanban card navigates", and
   * an activatable `Card` is a single tab stop rather than a link and a button
   * stacked on top of each other. `Card` supplies `role="button"`, `tabIndex`,
   * Enter/Space and the §4.8 focus ring. The button-looking chip in the corner
   * is therefore decorative — `pointer-events-none` so a click on it still lands
   * on the card, `aria-hidden` so it is not announced as a second control.
   */
  return (
    <Card variant="interactive" className="p-4" onClick={() => navigate(task.to)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            TILE[task.state],
          )}
        >
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-heading text-headline-sm text-ink">
            {task.title}
            {/* The destination is invisible — the whole card goes there. */}
            <span className="sr-only">{` — opens ${task.destination}`}</span>
          </h4>
          <p className="mt-0.5 text-body-sm text-ink-secondary">{task.hint}</p>
        </div>
        <StateIcon
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-ink-muted"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className={cn('badge', task.tone)}>{task.badge}</span>
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

export interface DashboardTaskBoardProps {
  tasks: DashboardTask[];
}

/**
 * Three columns: equal thirds on `sm` and up, one card-width per screen with
 * `snap-mandatory` below it. The scroll container carries `tabIndex` because a
 * region that scrolls has to be reachable from the keyboard — at `sm` and up
 * nothing overflows, so the extra tab stop is inert there.
 */
export const DashboardTaskBoard: React.FC<DashboardTaskBoardProps> = ({ tasks }) => {
  const doneCount = tasks.filter((task) => task.state === 'done').length;

  return (
    <section className="surface p-4 sm:p-5 lg:p-6" aria-labelledby="task-board-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="task-board-heading" className="font-heading text-headline-md text-ink">
          Your setup
        </h2>
        <p className="text-label-md text-ink-muted">
          {doneCount} of {tasks.length} done
        </p>
      </div>

      <div
        role="region"
        aria-label="Task board"
        tabIndex={0}
        className="-mx-4 sm:mx-0 mt-4 flex snap-x snap-mandatory gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-0 pb-2 sm:pb-0 sm:grid sm:grid-cols-3 sm:overflow-x-visible"
      >
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => task.state === column.id);

          return (
            <div
              key={column.id}
              role="group"
              aria-label={`${column.title} tasks`}
              className="min-w-[82vw] xs:min-w-[280px] snap-start sm:min-w-0"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-headline-sm text-ink">{column.title}</h3>
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-surface-inset px-1.5 py-0.5 text-label-sm tabular-nums text-ink-secondary">
                  {columnTasks.length}
                </span>
              </div>

              {columnTasks.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-edge px-3 py-6 text-center text-body-sm text-ink-muted">
                  {column.empty}
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {columnTasks.map((task) => (
                    <li key={task.id}>
                      <TaskCard task={task} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/** §6.2 "Loading State": three columns, two cards each, in the real shape. */
export const DashboardTaskBoardSkeleton: React.FC = () => (
  <div className="surface p-5 sm:p-6" aria-hidden="true">
    <Skeleton className="h-5 w-32" />
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((column) => (
        <div key={column}>
          <Skeleton className="h-4 w-24" />
          <div className="mt-3 space-y-3">
            {[0, 1].map((card) => (
              <Skeleton key={card} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default DashboardTaskBoard;