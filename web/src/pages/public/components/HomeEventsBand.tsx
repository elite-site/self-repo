import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { motion, useInView, type Variants } from 'framer-motion';
import { MOTION_DURATIONS, MOTION_EASINGS } from '@/shared/lib/motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const makeScaleVariants = (shouldReduce: boolean): Variants =>
  shouldReduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: MOTION_DURATIONS.moderate } } }
    : {
        hidden: { opacity: 0, scale: 0.97, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: MOTION_DURATIONS.slow, ease: MOTION_EASINGS.out } },
      };

const makeIconVariants = (shouldReduce: boolean): Variants =>
  shouldReduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: MOTION_DURATIONS.moderate, delay: 0.1 } } }
    : {
        hidden: { opacity: 0, scale: 0.5, rotate: -15 },
        visible: {
          opacity: 1, scale: 1, rotate: 0,
          transition: { delay: 0.2, duration: MOTION_DURATIONS.moderate, type: 'spring', stiffness: 300, damping: 20 },
        },
      };

const makeTextVariants = (shouldReduce: boolean): Variants =>
  shouldReduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: MOTION_DURATIONS.moderate, delay: 0.1 } } }
    : {
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { delay: 0.15, duration: MOTION_DURATIONS.moderate, ease: MOTION_EASINGS.out } },
      };

export const HomeEventsBand: React.FC = () => {
  const shouldReduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px 0px' });

  const panelVariants = makeScaleVariants(shouldReduce);
  const iconVariants = makeIconVariants(shouldReduce);
  const textVariants = makeTextVariants(shouldReduce);

  return (
    <section
      ref={ref}
      aria-labelledby="events-band-title"
      className="bg-surface-sunken py-16 sm:py-24"
    >
      <div className="mx-auto max-w-canvas px-6 sm:px-10">
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="relative overflow-hidden rounded-3xl border border-brand/20 bg-brand-soft px-8 py-14 text-center sm:px-16 sm:py-20"
        >
          {/* Background dot pattern — SVG, no gradient */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="events-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="var(--border-brand)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#events-dots)" />
          </svg>

          <div className="relative">
            {/* Icon */}
            <motion.div
              variants={iconVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-brand/20 bg-surface"
            >
              <Calendar size={28} strokeWidth={1.5} className="text-brand" aria-hidden="true" />
            </motion.div>

            {/* Text */}
            <motion.div
              variants={textVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
            >
              <h2
                id="events-band-title"
                className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl"
              >
                Department events are open to everyone
              </h2>
              <p className="mx-auto mt-4 max-w-[46ch] text-body-lg leading-relaxed text-ink-secondary">
                Browse the schedule, eligibility, and venue details before you sign in.
                Registration opens to students&nbsp;only.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <motion.div
                  whileHover={shouldReduce ? undefined : { scale: 1.03 }}
                  whileTap={shouldReduce ? undefined : { scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Link to="/events" className="btn btn-primary min-h-[48px] px-7 py-3 text-base">
                    <Calendar size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>Browse department events</span>
                  </Link>
                </motion.div>

                <Link
                  to="/students"
                  className="inline-flex min-h-[48px] items-center gap-1.5 px-2 text-label-lg font-semibold text-brand-soft-text hover:text-brand"
                >
                  <span>Or explore student profiles</span>
                  <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
