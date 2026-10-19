import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { useSpotlight } from '@/hooks/useSpotlight';
import { DashboardTask, DashboardTaskState } from '../types';

interface ColumnDef { id: DashboardTaskState; title: string; emoji: string; empty: string; }

const COLUMNS: ColumnDef[] = [
  { id: 'todo', title: 'To Do', emoji: '⏳', empty: 'Nothing left to do 🎉' },
  { id: 'progress', title: 'In Progress', emoji: '🔧', empty: 'Nothing waiting on review' },
  { id: 'done', title: 'Done', emoji: '✅', empty: 'Finished sections land here' },
];

const SetupCard: React.FC<{ task: DashboardTask }> = ({ task }) => {
  const navigate = useNavigate();
  const { spotlightProps } = useSpotlight();
  const Icon = task.icon;
  const isVideo = task.id === 'video';
  const isDone = task.state === 'done';
  const action = task.state === 'todo' ? task.cta : task.state === 'progress' ? 'Check status' : 'View';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(task.to)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(task.to); } }}
      {...spotlightProps}
      className="glow-card group cursor-pointer p-3.5 sm:p-4 rounded-[16px] border border-white/10 bg-[#0a0a10] hover:border-purple-500/40 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-heading text-sm font-bold text-white flex items-center gap-1.5">
            <span>{task.title}</span>
            {isDone && <span aria-hidden="true" className="check-pop text-xs">✅</span>}
            {isVideo && task.state !== 'done' && (
              <span aria-hidden="true" className="hourglass-flip text-xs select-none">⏳</span>
            )}
            <span className="sr-only">{` — opens ${task.destination}`}</span>
          </h4>
          <p className="mt-0.5 text-xs text-white/50 line-clamp-1">{task.hint}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/5">
        <span className={cn(
          'text-[11px] px-2.5 py-0.5 rounded-full font-semibold border',
          isDone ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
          task.state === 'progress' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
          'bg-white/5 text-white/70 border-white/10',
          isVideo && task.state !== 'done' && 'badge-soft-pulse'
        )}>
          {task.badge}
        </span>
        <span className="glow-btn text-[11px] font-medium px-3 py-1 rounded-full border border-white/10 bg-[#11111a] text-white/80 group-hover:text-white group-hover:border-purple-500/30">
          {action}
        </span>
      </div>
    </div>
  );
};

export interface SetupBoardProps {
  tasks: DashboardTask[];
}

export const SetupBoard: React.FC<SetupBoardProps> = ({ tasks }) => {
  const [activeTab, setActiveTab] = useState<DashboardTaskState>('todo');
  const doneCount = tasks.filter((t) => t.state === 'done').length;

  return (
    <section className="glow-card p-5 sm:p-6 rounded-[16px] border border-white/10 bg-[#0a0a10]" aria-labelledby="setup-board-heading">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 id="setup-board-heading" className="font-heading text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
          <span>Your setup</span>
          <span aria-hidden="true">🧩</span>
        </h2>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
          {doneCount} of {tasks.length} done
        </span>
      </div>

      {/* Mobile swipeable/clickable tab selector */}
      <div className="flex sm:hidden gap-1.5 p-1 rounded-full bg-[#11111a] border border-white/5 mb-4">
        {COLUMNS.map((col) => {
          const count = tasks.filter((t) => t.state === col.id).length;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setActiveTab(col.id)}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-full text-xs font-medium transition-all text-center flex items-center justify-center gap-1',
                activeTab === col.id
                  ? 'bg-purple-600 text-white shadow-sm font-semibold'
                  : 'text-white/60 hover:text-white'
              )}
            >
              <span>{col.title}</span>
              <span aria-hidden="true">{col.emoji}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Columns grid: equal height on desktop, tabbed on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.state === col.id);
          const isHiddenOnMobile = activeTab !== col.id;

          return (
            <div
              key={col.id}
              role="group"
              aria-label={`${col.title} tasks`}
              className={cn('flex flex-col min-w-0', isHiddenOnMobile && 'hidden sm:flex')}
            >
              <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
                <span className="font-heading text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{col.title}</span>
                  <span aria-hidden="true">{col.emoji}</span>
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-bold text-white/60 border border-white/5">
                  {columnTasks.length}
                </span>
              </div>

              {columnTasks.length === 0 ? (
                <p className="mt-3 rounded-[12px] border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
                  {col.empty}
                </p>
              ) : (
                <ul className={cn('mt-3 space-y-3', col.id === 'done' && 'max-h-[380px] overflow-y-auto pr-1')}>
                  {columnTasks.map((task) => (
                    <li key={task.id}>
                      <SetupCard task={task} />
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

export default SetupBoard;
