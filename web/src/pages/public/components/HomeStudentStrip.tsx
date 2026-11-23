/**
 * HomeStudentStrip
 *
 * A continuously scrolling strip of student avatar chips — the living proof
 * that the directory exists and is populated. The strip duplicates its content
 * so the CSS marquee loops seamlessly; it pauses via `prefers-reduced-motion`.
 *
 * Uses a pure-CSS marquee (tokens.css `@keyframes marquee`) rather than
 * Framer Motion because a JS-driven scroll at 60 fps is expensive on mobile
 * when it runs the whole time the page is visible. CSS animation runs on the
 * compositor thread and is free when the tab is hidden.
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { resolveMediaUrl } from '@/shared/api';
import { Skeleton } from '@/shared/ui';

interface StudentChip {
  id: string;
  name: string;
  rollNo?: string;
  year?: number;
  section?: string;
  profile?: { photoUrl?: string };
}

interface HomeStudentStripProps {
  students: StudentChip[];
  loading: boolean;
}

const PLACEHOLDER_COUNT = 10;

const AvatarChip: React.FC<{ student: StudentChip }> = ({ student }) => {
  const initials = student.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const photoUrl = student.profile?.photoUrl
    ? resolveMediaUrl(student.profile.photoUrl)
    : null;

  const target = `/students/${student.rollNo || student.id}`;

  return (
    <Link
      to={target}
      tabIndex={-1}             // strip is decorative — focus goes to the directory CTA
      aria-hidden="true"
      className="group flex shrink-0 items-center gap-2.5 rounded-full border border-edge bg-surface px-3.5 py-2 shadow-xs transition-shadow duration-quick hover:shadow-sm hover:-translate-y-px"
    >
      {/* Avatar */}
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-label-md font-semibold text-brand-soft-text">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </span>

      {/* Name */}
      <span className="max-w-[120px] truncate text-label-md font-semibold text-ink group-hover:text-brand-soft-text">
        {student.name.split(' ')[0]}
      </span>

      {/* Year tag */}
      {student.year && (
        <span className="text-label-sm text-ink-muted">Y{student.year}</span>
      )}
    </Link>
  );
};

export const HomeStudentStrip: React.FC<HomeStudentStripProps> = ({ students, loading }) => {
  // Duplicate the list so the CSS animation loops without a visible gap
  const doubled = useMemo(() => [...students, ...students], [students]);

  if (loading) {
    return (
      <div className="border-b border-edge bg-surface-sunken py-5" aria-hidden="true">
        <div className="flex gap-3 overflow-hidden px-6">
          {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
            <div key={i} className="flex shrink-0 items-center gap-2 rounded-full border border-edge bg-surface px-3.5 py-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3.5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (students.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden border-b border-edge bg-surface-sunken py-5"
      aria-hidden="true"
    >
      {/* Hard-cut edge overlays — solid background color, no gradient fade */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-surface-sunken"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-surface-sunken"
        aria-hidden="true"
      />

      <div
        className="flex gap-3"
        style={{
          width: 'max-content',
          animation: 'marquee 40s linear infinite',
          willChange: 'transform',
        }}
      >
        {doubled.map((student, i) => (
          <AvatarChip key={`${student.id}-${i}`} student={student} />
        ))}
      </div>
    </div>
  );
};
