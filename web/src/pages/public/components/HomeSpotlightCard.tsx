import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap, CheckCircle2 } from 'lucide-react';
import { resolveMediaUrl } from '@/shared/api';

interface HomeSpotlightCardProps {
  loading: boolean;
  featuredStudents: any[];
}

export const HomeSpotlightCard: React.FC<HomeSpotlightCardProps> = ({
  loading,
  featuredStudents,
}) => {
  return (
    <div className="rounded-xl border border-edge bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-edge pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-text">
            <GraduationCap size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-label-lg font-semibold text-ink">
              Department Spotlight
            </h2>
            <p className="truncate text-label-md text-ink-muted">Information Technology · SASI</p>
          </div>
        </div>
        <span className="badge badge-approved shrink-0">
          <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
          Department directory
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-body-sm text-ink-secondary">
          Loading department profiles…
        </div>
      ) : featuredStudents.length > 0 ? (
        <div className="divide-y divide-edge pt-2">
          {featuredStudents.map((st) => (
            <div key={st.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-soft-text overflow-hidden">
                  {st.profile?.photoUrl ? (
                    <img
                      src={resolveMediaUrl(st.profile.photoUrl)}
                      alt={st.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    st.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 break-words font-heading text-label-lg font-semibold text-ink">
                    {st.name}
                  </p>
                  <p className="line-clamp-2 text-label-md text-ink-muted">
                    {st.rollNo} · Year {st.year} ({st.section})
                  </p>
                </div>
              </div>
              <Link
                to={`/students/${st.rollNo || st.id}`}
                className="inline-flex min-h-[44px] shrink-0 items-center py-2 px-1 text-label-md font-semibold text-ink-brand hover:text-brand-hover"
              >
                View profile
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-body-sm text-ink-secondary">
          Browse verified student profiles in the department directory.
        </p>
      )}

      <div className="mt-4 border-t border-edge pt-4">
        <Link
          to="/students"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-label-lg font-semibold text-ink-brand hover:text-brand-hover"
        >
          <span>Browse the directory</span>
          <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};
