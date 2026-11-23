import React, { useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { motion, useInView, type Variants } from 'framer-motion';
import { MOTION_DURATIONS, MOTION_EASINGS } from '@/shared/lib/motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

interface HomeSearchBandProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onSearch: (e: React.FormEvent) => void;
}

const makeSlideVariants = (xOffset: number, delay = 0): Variants => ({
  hidden: { opacity: 0, x: xOffset },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: MOTION_DURATIONS.slow, ease: MOTION_EASINGS.out, delay },
  },
});

const makeFadeVariants = (delay = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: MOTION_DURATIONS.moderate, delay },
  },
});

export const HomeSearchBand: React.FC<HomeSearchBandProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
}) => {
  const shouldReduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px 0px' });

  const containerVariants = shouldReduce ? makeFadeVariants(0) : makeSlideVariants(-32, 0);
  const formVariants = shouldReduce ? makeFadeVariants(0.05) : makeSlideVariants(32, 0.1);

  const animateState = inView ? 'visible' : 'hidden';

  return (
    <section
      ref={ref}
      aria-labelledby="directory-search-title"
      className="border-b border-edge bg-surface"
    >
      <div className="mx-auto max-w-canvas px-6 py-16 sm:px-10 sm:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">

          {/* Copy */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={animateState}
            className="lg:col-span-5"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface-sunken px-3 py-1 text-label-md font-semibold text-ink-secondary">
              <Search size={12} strokeWidth={2} aria-hidden="true" />
              <span>Directory</span>
            </div>
            <h2
              id="directory-search-title"
              className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl"
            >
              Search the student directory
            </h2>
            <p className="mt-4 max-w-[44ch] text-body-lg leading-relaxed text-ink-secondary">
              Find students by name, roll number, or skill and open their
              verified profile, portfolio, and resume.
            </p>
          </motion.div>

          {/* Search form */}
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate={animateState}
            className="lg:col-span-7"
          >
            <form onSubmit={onSearch}>
              <label htmlFor="directory-search" className="label">
                Search students
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    strokeWidth={1.75}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <motion.input
                    id="directory-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name, roll number, or skill"
                    className="input min-h-[48px] pl-11 text-base transition-shadow duration-quick focus:shadow-sm"
                    whileFocus={shouldReduce ? undefined : { scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
                <motion.button
                  type="submit"
                  className="btn btn-primary min-h-[48px] shrink-0 px-6"
                  whileHover={shouldReduce ? undefined : { scale: 1.03 }}
                  whileTap={shouldReduce ? undefined : { scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <span>Search</span>
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </motion.button>
              </div>
              <p className="hint mt-2">Leave the field empty to browse all students.</p>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
