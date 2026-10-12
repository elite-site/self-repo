import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CourseCardSummary } from '../types';
import { CourseCard } from './CourseCard';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { cn } from '@/shared/lib/cn';

export interface CourseRowProps {
  title: string;
  courses: CourseCardSummary[];
  seeAllHref?: string;
  className?: string;
}

const SCROLL_OFFSET = 320;

export const CourseRow: React.FC<CourseRowProps> = ({
  title,
  courses,
  seeAllHref,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();
  const displayCourses = courses.slice(0, 12);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -SCROLL_OFFSET : SCROLL_OFFSET;
    scrollRef.current.scrollBy({
      left: offset,
      behavior: shouldReduce ? 'auto' : 'smooth',
    });
  };

  if (displayCourses.length === 0) return null;

  return (
    <section className={cn('relative space-y-3', className)} aria-label={title}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>

        <div className="flex items-center gap-2">
          {seeAllHref && (
            <Link
              to={seeAllHref}
              className="text-sm font-semibold text-brand hover:text-brand-hover hover:underline"
            >
              See all
            </Link>
          )}

          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              aria-label="Scroll left"
              className="flex size-8 items-center justify-center rounded-full border border-edge bg-surface text-ink-secondary shadow-xs hover:bg-surface-raised hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              aria-label="Scroll right"
              className="flex size-8 items-center justify-center rounded-full border border-edge bg-surface text-ink-secondary shadow-xs hover:bg-surface-raised hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label={`${title} carousel`}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-3 pt-1 snap-x snap-mandatory focus:outline-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {displayCourses.map((course) => (
          <div
            key={course.id}
            className="w-72 shrink-0 snap-start sm:w-80"
          >
            <CourseCard course={course} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default CourseRow;
