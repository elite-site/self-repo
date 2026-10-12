import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, BookOpen, AlertCircle } from 'lucide-react';
import { useCoursesQuery } from '../hooks';
import { CourseCard } from '../components';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { cn } from '@/shared/lib/cn';

const CATEGORIES = ['All', 'Web Development', 'Mobile', 'Data Science', 'AI & ML', 'DevOps'];
const LEVELS = ['All', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export const CoursesGridPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || 'All';
  const level = searchParams.get('level') || 'All';
  const page = Number(searchParams.get('page') || '1');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'All') next.delete(key);
    else next.set(key, val);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const { data, isLoading, error, refetch } = useCoursesQuery({
    page,
    limit: 12,
    category: category !== 'All' ? category : undefined,
    level: level !== 'All' ? level : undefined,
    search: searchParams.get('search') || undefined,
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Course Catalog</h1>
        <p className="text-sm text-ink-muted">Explore courses across technology domains.</p>
      </div>

      <div className="space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); updateParam('search', searchInput); }} className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search courses..."
            className="w-full rounded-lg border border-edge bg-surface py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-focus"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button" onClick={() => updateParam('category', cat)} className={cn('rounded-full px-3 py-1 text-xs font-semibold transition-colors', category === cat ? 'bg-brand text-on-brand' : 'border border-edge bg-surface text-ink-secondary hover:bg-surface-sunken')}>
              {cat}
            </button>
          ))}
          <div className="h-4 w-px bg-edge mx-1 hidden sm:block" />
          {LEVELS.map((lvl) => (
            <button key={lvl} type="button" onClick={() => updateParam('level', lvl)} className={cn('rounded-full px-3 py-1 text-xs font-semibold transition-colors', level === lvl ? 'bg-ink text-surface' : 'border border-edge bg-surface text-ink-secondary hover:bg-surface-sunken')}>
              {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-edge bg-surface p-3 space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="surface border border-edge rounded-2xl p-8 text-center space-y-3 max-w-md mx-auto" role="alert">
          <AlertCircle className="size-8 text-status-rejected mx-auto" />
          <h2 className="text-base font-bold text-ink">Failed to load courses</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            {(error as any)?.message || 'Database connection error. Please try again.'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data?.courses?.length ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description="Try loosening your filters or searching with different keywords."
        />
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-edge pt-4">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-xs text-ink-muted">Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => updateParam('page', String(page + 1))}>
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CoursesGridPage;
