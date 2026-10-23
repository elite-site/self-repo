import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { ResourceType } from '@/shared/types';

interface ResourcesFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedType: ResourceType | 'ALL';
  onTypeChange: (type: ResourceType | 'ALL') => void;
}

const TYPE_OPTIONS: { id: ResourceType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Types' },
  { id: 'NOTES', label: 'Notes' },
  { id: 'PPT', label: 'PPT' },
  { id: 'QUESTION_PAPER', label: 'Question Paper' },
  { id: 'LAB_MANUAL', label: 'Lab Manual' },
  { id: 'SYLLABUS', label: 'Syllabus' },
  { id: 'OTHER', label: 'Other' },
];

export const ResourcesFilterBar: React.FC<ResourcesFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 select-none">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <label htmlFor="resource-search" className="sr-only">
          Search materials by title or subject
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-muted">
          <Search className="size-4" aria-hidden="true" />
        </div>
        <input
          id="resource-search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title or subject..."
          className="w-full rounded-xl border border-edge bg-surface pl-9 pr-9 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand caret-brand transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-muted hover:text-ink cursor-pointer"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Type Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TYPE_OPTIONS.map((opt) => {
          const isActive = selectedType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onTypeChange(opt.id)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border',
                isActive
                  ? 'bg-brand text-on-primary border-brand font-bold'
                  : 'bg-surface text-ink-secondary border-edge hover:text-ink hover:bg-surface-sunken'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
