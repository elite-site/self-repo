import React from 'react';
import { cn } from '@/shared/lib/cn';

interface SemesterTabsProps {
  allowedSemesters?: number[];
  selectedSemester: number;
  onSelectSemester: (semester: number) => void;
}

export const SemesterTabs: React.FC<SemesterTabsProps> = ({
  allowedSemesters,
  selectedSemester,
  onSelectSemester,
}) => {
  // Ensure the tabs include Semester 1 through 8, specifically adding the final
  // 4th-year semesters (Semester 7 & Semester 8) directly following Semester 6.
  const semesters = React.useMemo(() => {
    const base =
      allowedSemesters && allowedSemesters.length > 0
        ? [...allowedSemesters]
        : [1, 2, 3, 4, 5, 6];
    if (!base.includes(7)) {
      base.push(7);
    }
    if (!base.includes(8)) {
      base.push(8);
    }
    return base.sort((a, b) => a - b);
  }, [allowedSemesters]);

  if (semesters.length <= 1) {
    return null;
  }

  return (
    <div className="w-full min-w-0 select-none" role="tablist" aria-label="Allowed Semesters">
      <div className="flex items-center gap-2 overflow-x-auto scroll-smooth overscroll-x-contain pb-2 scrollbar-none">
        {semesters.map((sem) => {
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
                YEAR {year}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

