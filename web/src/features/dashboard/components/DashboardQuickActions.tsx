import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

export interface QuickActionItem {
  label: string;
  hint: string;
  to: string;
  icon: LucideIcon;
}

interface DashboardQuickActionsProps {
  actions: QuickActionItem[];
}

const SCROLL_OFFSET = 240;

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({ actions }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
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
  }, [checkScroll, actions]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === 'left' ? -SCROLL_OFFSET : SCROLL_OFFSET;
    el.scrollBy({
      left: offset,
      behavior: shouldReduce ? 'auto' : 'smooth',
    });
  };

  return (
    <section aria-labelledby="quick-actions-heading" className="relative group">
      <h2 id="quick-actions-heading" className="sr-only">
        Quick actions
      </h2>

      {/* Visual overflow indicator & navigation: Left */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none">
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-surface-canvas via-surface-canvas/80 to-transparent"
          />
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="Scroll quick actions left"
            className="pointer-events-auto ml-1 sm:ml-2 flex size-8 sm:size-9 items-center justify-center rounded-full border border-edge bg-surface/90 backdrop-blur text-ink-secondary hover:text-ink hover:border-brand shadow-md transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-focus"
          >
            <ChevronLeft className="size-4 sm:size-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Side-scrolling carousel: all items stay strictly on a single line */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        tabIndex={0}
        role="region"
        aria-label="Quick actions carousel"
        className="flex items-stretch gap-2 sm:gap-3 overflow-x-auto scroll-smooth py-1 px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {actions.map((action) => (
          <Link
            key={action.to + action.label}
            to={action.to}
            className="flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2 rounded-xl border border-edge bg-surface p-2.5 sm:p-4 transition-all duration-fast hover:-translate-y-1 hover:border-brand hover:shadow-md shrink-0 w-[120px] sm:w-[136px] md:w-[148px] xl:flex-1 min-w-[115px]"
          >
            <span className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-text">
              <action.icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0 w-full px-0.5">
              <span className="block font-heading text-label-xs sm:text-label-md font-bold leading-tight text-ink truncate">
                {action.label}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {/* Visual overflow indicator & navigation: Right */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end pointer-events-none">
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-surface-canvas via-surface-canvas/80 to-transparent"
          />
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="Scroll quick actions right"
            className="pointer-events-auto mr-1 sm:mr-2 flex size-8 sm:size-9 items-center justify-center rounded-full border border-edge bg-surface/90 backdrop-blur text-ink-secondary hover:text-ink hover:border-brand shadow-md transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-focus"
          >
            <ChevronRight className="size-4 sm:size-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
};
