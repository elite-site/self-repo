import React from 'react';
import { Link } from 'react-router-dom';
import { Users, LogIn } from 'lucide-react';
import { motion, useReducedMotion as useFramerReducedMotion } from 'framer-motion';import { MOTION_DURATIONS, MOTION_EASINGS } from '@/shared/lib/motion';

interface HomeHeroProps {
  onSignIn: () => void;
  studentTotal: number | null;
}

/** Splits the headline into word spans that reveal one at a time. */
const HEADLINE_WORDS = [
  'Meet', 'the', 'department,', 'one', 'student', 'at', 'a', 'time.',
];

const wordVariants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      delay: 0.08 * i + 0.2,
      duration: MOTION_DURATIONS.slow,
      ease: MOTION_EASINGS.out,
    },
  }),
};

const reducedWordVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: 0.04 * i, duration: MOTION_DURATIONS.normal },
  }),
};

const subtitleVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.85, duration: MOTION_DURATIONS.slow, ease: MOTION_EASINGS.out },
  },
};

const ctaVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 1.05, duration: MOTION_DURATIONS.moderate, ease: MOTION_EASINGS.out },
  },
};

const statVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 1.3, duration: MOTION_DURATIONS.moderate },
  },
};

export const HomeHero: React.FC<HomeHeroProps> = ({ onSignIn, studentTotal }) => {
  const shouldReduce = (useFramerReducedMotion() ?? false);
  const wv = shouldReduce ? reducedWordVariants : wordVariants;

  return (
    <section
      className="relative overflow-hidden border-b border-edge bg-surface"
      aria-label="ELITE Student Portal — Department of Information Technology"
    >
      {/* Subtle grid texture — SVG lines, no gradient */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--border)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      <div className="relative mx-auto max-w-canvas px-6 pb-20 pt-24 sm:px-10 sm:pb-28 sm:pt-32 lg:pt-36">
        <div className="mx-auto max-w-3xl text-center">
          {/* Dept badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: MOTION_DURATIONS.moderate, ease: MOTION_EASINGS.out }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3.5 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            <span className="text-label-md font-semibold uppercase tracking-widest text-brand-soft-text">
              Department of Information Technology · SASI
            </span>
          </motion.div>

          {/* Headline — word-by-word reveal */}
          <h1
            className="font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl"
            aria-label="Meet the department, one student at a time."
          >
            {HEADLINE_WORDS.map((word, i) => (
              <motion.span
                key={i}
                custom={i}
                variants={wv}
                initial="hidden"
                animate="visible"
                className="mr-[0.3em] inline-block last:mr-0"
                aria-hidden="true"
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Subtitle */}
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, visible: subtitleVariants.visible }}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-6 max-w-[52ch] text-body-lg leading-relaxed text-ink-secondary"
          >
            Browse verified profiles, explore student portfolios, and register for
            department events. Sign in with your institutional credentials to publish your&nbsp;own.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: ctaVariants.visible }}
            initial="hidden"
            animate="visible"
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <motion.button
              type="button"
              onClick={onSignIn}
              className="btn btn-primary min-h-[48px] px-7 py-3 text-base"
              whileHover={shouldReduce ? undefined : { scale: 1.03 }}
              whileTap={shouldReduce ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <LogIn size={18} strokeWidth={2} aria-hidden="true" />
              <span>Student sign in</span>
            </motion.button>

            <Link
              to="/students"
              className="btn btn-secondary min-h-[48px] px-6 py-3 text-base"
            >
              <Users size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>Browse directory</span>
            </Link>
          </motion.div>

          {/* Hint + live stat */}
          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: statVariants.visible }}
            initial="hidden"
            animate="visible"
            className="mt-5 flex flex-col items-center gap-1"
          >
            <p className="text-label-md text-ink-muted">
              Sign in with your verified <code className="font-mono text-xs">@sasi.ac.in</code> Google account
            </p>
            {studentTotal !== null && studentTotal > 0 && (
              <p className="text-label-md font-semibold text-ink-secondary">
                <span className="tabular-nums text-brand">{studentTotal.toLocaleString()}</span>
                {' '}verified profiles in the directory
              </p>
            )}
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: MOTION_DURATIONS.moderate }}
          className="mt-16 flex justify-center"
          aria-hidden="true"
        >
          <motion.div
            animate={shouldReduce ? {} : { y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-8 w-5 items-start justify-center rounded-full border border-edge p-1"
          >
            <div className="h-1.5 w-1 rounded-full bg-ink-muted" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
