import React from 'react';
import { cn } from '@/shared/lib/cn';

interface SemesterTabsProps {
  allowedSemesters: number[];
  selectedSemester: number;
  onSelectSemester: (semester: number) => void;
}

export const SemesterTabs: React.FC<SemesterTabsProps> = ({
  allowedSemesters,
  selectedSemester,
  onSelectSemester,
}) => {
  if (allowedSemesters.length <= 1) {
    return null;
  }

  return (
    <div className="w-full select-none" role="tablist" aria-label="Allowed Semesters">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {allowedSemesters.map((sem) => {
          const isSelected = sem === selectedSemester;
          const year = Math.ceil(sem / 2);
          return (
            <button
              key={sem}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectSemester(sem)}
              className={cn(
                'group shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-sm font-bold transition-all duration-150 cursor-pointer border',
                isSelected
                  ? 'bg-brand text-on-primary border-brand shadow-sm'
                  : 'bg-surface text-ink-secondary border-edge hover:text-ink hover:border-brand/40 hover:bg-surface-sunken'
              )}
            >
              <span>Semester {sem}</span>
              <span
                className={cn(
                  'text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md transition-colors',
                  isSelected
                    ? 'bg-black/20 text-white'
                    : 'bg-surface-sunken text-ink-muted group-hover:text-ink'
                )}
              >
                Year {year}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
