/**
 * HomeSpotlightSection
 *
 * Three student cards in a staggered grid that reveals on scroll. Each card
 * lifts on hover. This replaces the old accent-block pattern — the spotlight
 * now has its own full section with breathing room.
 */
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap, ExternalLink } from 'lucide-react';
import { motion, useInView, type Variants } from 'framer-motion';
import { MOTION_DURATIONS, MOTION_EASINGS } from '@/shared/lib/motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { resolveMediaUrl } from '@/shared/api';
import { Skeleton } from '@/shared/ui';

interface Student {
  id: string;
  name: string;
  rollNo?: string;
  year?: number;
  section?: string;
  profile?: { photoUrl?: string; bio?: string };
}

interface HomeSpotlightSectionProps {
  loading: boolean;
  students: Student[];
  error?: string | null;
  onRetry?: () => void;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: MOTION_DURATIONS.slow,
      ease: MOTION_EASINGS.out,
    },
  }),
};

const reducedCardVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.06, duration: MOTION_DURATIONS.moderate },
  }),
};

const StudentCard: React.FC<{ student: Student; index: number; shouldReduce: boolean }> = ({
  student,
  index,
  shouldReduce,
}) => {
  const initials = student.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const photoUrl = student.profile?.photoUrl
    ? resolveMediaUrl(student.profile.photoUrl)
    : null;

  const cv = shouldReduce ? reducedCardVariants : cardVariants;

  return (
    <motion.article
      custom={index}
      variants={cv}
      whileHover={shouldReduce ? undefined : { y: -4, transition: { duration: 0.15, ease: 'easeOut' } }}
      className="group relative flex flex-col rounded-2xl border border-edge bg-surface p-6 shadow-xs transition-shadow duration-quick hover:shadow-md"
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-edge bg-brand-soft text-title font-bold text-brand-soft-text">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${student.name}'s photo`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-ui text-base font-semibold text-ink">{student.name}</p>
          <p className="truncate text-label-md text-ink-muted">
            {student.rollNo}
            {student.year ? ` · Year ${student.year}` : ''}
            {student.section ? ` (${student.section})` : ''}
          </p>
        </div>
      </div>

      {/* Bio preview */}
      {student.profile?.bio && (
        <p className="mt-4 line-clamp-2 text-body-sm leading-relaxed text-ink-secondary">
          {student.profile.bio}
        </p>
      )}

      {/* CTA */}
      <div className="mt-5 pt-4 border-t border-edge">
        <Link
          to={`/students/${student.rollNo || student.id}`}
          className="inline-flex min-h-[40px] items-center gap-1.5 text-label-md font-semibold text-brand hover:text-brand-hover"
        >
          View profile
          <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      {/* Hover accent line */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-brand opacity-0 transition-opacity duration-quick group-hover:opacity-100"
        aria-hidden="true"
      />
    </motion.article>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="flex flex-col rounded-2xl border border-edge bg-surface p-6 shadow-xs">
    <div className="flex items-center gap-4">
      <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded-full" />
        <Skeleton className="h-3 w-1/2 rounded-full" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-4/5 rounded" />
    </div>
    <div className="mt-5 border-t border-edge pt-4">
      <Skeleton className="h-4 w-24 rounded-full" />
    </div>
  </div>
);

export const HomeSpotlightSection: React.FC<HomeSpotlightSectionProps> = ({
  loading,
  students,
  error,
  onRetry,
}) => {
  const shouldReduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px 0px' });

  const headerVariants: Variants = shouldReduce
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: MOTION_DURATIONS.moderate } },
      }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: MOTION_DURATIONS.moderate, ease: MOTION_EASINGS.out },
        },
      };

  return (
    <section
      ref={ref}
      aria-labelledby="spotlight-title"
      className="border-b border-edge bg-surface-sunken"
    >
      <div className="mx-auto max-w-canvas px-6 py-16 sm:px-10 sm:py-20">

        {/* Section header */}
        <motion.div
          variants={headerVariants as any}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="mb-10 flex items-end justify-between gap-6"
        >
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1 text-label-md font-semibold text-ink-secondary">
                <GraduationCap size={12} strokeWidth={2} aria-hidden="true" />
                <span>Department Spotlight</span>
              </span>
              <span className="badge badge-approved text-label-xs">
                Department directory
              </span>
            </div>
            <h2
              id="spotlight-title"
              className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              Students making their mark
            </h2>
          </div>
          <Link
            to="/students"
            className="hidden shrink-0 items-center gap-1.5 text-label-md font-semibold text-brand hover:text-brand-hover sm:inline-flex"
          >
            <span>View all</span>
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </motion.div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-edge bg-surface p-10 text-center">
            <p className="text-body-md text-ink-secondary">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 text-label-md font-semibold text-brand hover:text-brand-hover"
              >
                Retry
              </button>
            )}
          </div>
        ) : students.length > 0 ? (
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {students.map((student, i) => (
              <StudentCard
                key={student.id}
                student={student}
                index={i}
                shouldReduce={shouldReduce}
              />
            ))}
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-dashed border-edge bg-surface p-12 text-center">
            <GraduationCap size={32} className="mx-auto mb-3 text-ink-muted" aria-hidden="true" />
            <p className="text-body-md text-ink-secondary">
              No spotlight profiles yet.{' '}
              <Link to="/students" className="font-semibold text-brand hover:text-brand-hover">
                Browse the full directory.
              </Link>
            </p>
          </div>
        )}

        {/* Section footer action */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/students"
            className="btn btn-secondary min-h-[44px] px-6 py-2.5 inline-flex items-center gap-2"
          >
            <span>Browse the directory</span>
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};
