import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { useCoursesQuery } from '../hooks';
import { CourseCard } from '../components';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
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
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 page-enter max-w-7xl mx-auto text-left">
      {/* 1. ASYMMETRICAL CATALOG HERO BANNER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <div>
            <span className="badge badge-brand text-xs font-semibold">Course Catalog</span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-heading">
              Explore Engineering Courses
            </h1>
            <p className="mt-1 text-sm text-ink-muted max-w-xl">
              Curated masterclasses, hands-on tutorials, and project-based assignments across technology domains.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateParam('search', searchInput);
              }}
              className="relative max-w-lg"
            >
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search courses by topic, skill, or keyword..."
                className="input pl-10 min-h-[44px]"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => updateParam('category', cat)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors min-h-[36px]',
                    category === cat
                      ? 'bg-brand text-on-brand shadow-sm'
                      : 'border border-edge bg-surface text-ink-secondary hover:bg-surface-sunken hover:border-brand-ring'
                  )}
                >
                  {cat}
                </button>
              ))}
              <div className="h-4 w-px bg-edge mx-1 hidden sm:block" />
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => updateParam('level', lvl)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors min-h-[36px]',
                    level === lvl
                      ? 'bg-ink text-surface'
                      : 'border border-edge bg-surface text-ink-secondary hover:bg-surface-sunken'
                  )}
                >
                  {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                <Sparkles size={14} aria-hidden="true" />
                Continuous Learning
              </span>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Filter courses by difficulty level to match your current academic year and career trajectory.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between text-label-xs text-ink-muted">
              <span>{data?.pagination?.total ? `${data.pagination.total} total courses` : 'Curated catalog'}</span>
              <span className="font-semibold text-brand">Page {page} / {data?.pagination?.totalPages || 1}</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. MASONRY COURSE CARDS */}
      {isLoading ? (
        <MasonryGrid cols={3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <MasonryItem key={i}>
              <div className="rounded-2xl border border-edge bg-surface p-4 space-y-3">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </MasonryItem>
          ))}
        </MasonryGrid>
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
        <MasonryGrid cols={3}>
          {data.courses.map((course) => (
            <MasonryItem key={course.id}>
              <CourseCard course={course} className="card-lift" />
            </MasonryItem>
          ))}
        </MasonryGrid>
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
