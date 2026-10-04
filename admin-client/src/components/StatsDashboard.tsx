import React from 'react';
import {
  Users,
  Briefcase,
  CalendarDays,
  Vote,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clapperboard,
} from 'lucide-react';
import { AdminStats } from '../types';
import { AdminTab } from './Sidebar';

interface StatsDashboardProps {
  stats: AdminStats | null;
  loading: boolean;
  onNavigateTab?: (tab: AdminTab) => void;
}

const RATING_META: Record<string, { dot: string; text: string; label: string }> = {
  GOOD: { dot: 'bg-status-approved', text: 'text-status-approved', label: 'Good' },
  AVERAGE: { dot: 'bg-status-pending', text: 'text-status-pending', label: 'Average' },
  POOR: { dot: 'bg-status-rejected', text: 'text-status-rejected', label: 'Poor' },
};

/**
 * A number we do not have renders as a dash, never as a plausible placeholder.
 *
 * This page used to fall back to `120` students, `84` profiles, `65` builds and
 * `3` events whenever the stats object had not loaded. Those are indistinguishable
 * from real figures on a dashboard, which makes an outage look like a quiet day.
 */
const metric = (value: number | null | undefined) => (typeof value === 'number' ? value : '—');

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true">
    <span className="sr-only" role="status">
      Loading portal statistics
    </span>
    <div className="space-y-2">
      <div className="skeleton h-8 w-72" />
      <div className="skeleton h-4 w-96" />
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-28" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="skeleton h-72 lg:col-span-7 min-w-0" />
      <div className="skeleton h-72 lg:col-span-5 min-w-0" />
    </div>
  </div>
);

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  stats,
  loading,
  onNavigateTab,
}) => {
  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  const portal = stats.portal;
  const submitted = stats.totalVideos;
  const rated = stats.totalRated;
  const ratedPct = submitted > 0 ? Math.round((rated / submitted) * 100) : 0;
  const maxSectionSubmitted = Math.max(1, ...stats.bySection.map((s) => s.submitted));
  const pendingModeration = portal?.pendingModeration ?? 0;
  const hasRatings = Boolean(stats.byRating.GOOD || stats.byRating.AVERAGE || stats.byRating.POOR);

  const kpis = [
    {
      label: 'Enrolled students',
      value: metric(portal?.totalStudents),
      hint: `${metric(portal?.totalProfiles)} active profiles`,
      icon: Users,
      tab: 'students' as AdminTab,
    },
    {
      label: 'Portfolio items',
      value: portal
        ? portal.totalProjects + portal.totalAchievements + portal.totalCertificates
        : '—',
      hint: portal ? `${portal.totalProjects} builds · ${portal.totalAchievements} awards` : '—',
      icon: Briefcase,
      tab: 'moderation' as AdminTab,
    },
    {
      label: 'Events',
      value: metric(portal?.totalEvents),
      hint: `${metric(portal?.totalRegistrations)} registrations`,
      icon: CalendarDays,
      tab: 'events' as AdminTab,
    },
    {
      label: 'Voting campaigns',
      value: metric(portal?.totalCampaigns),
      hint: `${metric(portal?.totalVotes)} ballots cast`,
      icon: Vote,
      tab: 'voting' as AdminTab,
    },
  ];

  const shortcuts: { label: string; description: string; tab: AdminTab }[] = [
    {
      label: 'Moderation queue',
      description: 'Review pending projects, achievements and certificates',
      tab: 'moderation',
    },
    {
      label: 'Video submissions',
      description: 'Play clips, rate them and write feedback',
      tab: 'submissions',
    },
    {
      label: 'Student roster',
      description: 'Search and manage department student records',
      tab: 'students',
    },
    {
      label: 'Events',
      description: 'Create competitions, hackathons and workshops',
      tab: 'events',
    },
    {
      label: 'Elections',
      description: 'Configure ballots and track votes cast',
      tab: 'voting',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. OVERVIEW. The page says what it is, then gets out of the way. */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-headline-lg-mobile text-ink sm:text-headline-lg">
            Operations dashboard
          </h1>
          <p className="mt-1 text-body-md text-ink-secondary">
            Student roster, moderated portfolios, registrations and department voting in one place.
          </p>
        </div>

        {pendingModeration > 0 && onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('moderation')}
            className="btn btn-primary shrink-0 self-start"
          >
            <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
            <span>
              {pendingModeration} awaiting review
            </span>
            <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </header>

      {/* 2. KPIs. Four numbers, each a door into the list it counts. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => onNavigateTab?.(kpi.tab)}
            className="surface cursor-pointer p-5 text-left transition-colors duration-fast hover:border-edge-strong hover:bg-surface-inset"
          >
            <span className="flex items-center justify-between gap-2 text-label-md text-ink-muted">
              <span className="uppercase tracking-wide">{kpi.label}</span>
              <kpi.icon size={16} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />
            </span>
            <span className="mt-2 block font-heading text-headline-xl tabular-nums text-ink">
              {kpi.value}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-label-md text-ink-secondary">
              <CheckCircle2 size={13} strokeWidth={2} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{kpi.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* 3. CAMPAIGN AND MODERATION PROGRESS */}
        <section className="surface p-5 sm:p-6 lg:col-span-7 min-w-0" aria-labelledby="campaign-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-text">
                <Clapperboard size={17} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="campaign-heading" className="font-heading text-headline-sm text-ink">
                  Introduction video campaign
                </h2>
                <p className="text-body-sm text-ink-secondary">
                  {rated} of {submitted} uploaded videos evaluated
                </p>
              </div>
            </div>
            <p className="font-heading text-headline-lg tabular-nums text-ink">
              {ratedPct}
              <span className="text-headline-sm text-ink-muted">%</span>
            </p>
          </div>

          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuenow={ratedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Evaluation coverage"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-base ease-standard"
              style={{ width: `${ratedPct}%` }}
            />
          </div>

          <div className="mt-5 space-y-3">
            <h3 className="text-label-sm uppercase tracking-wider text-ink-muted">Submissions by section</h3>
            {stats.bySection.length === 0 ? (
              <p className="py-3 text-body-sm text-ink-muted">No video submissions recorded yet.</p>
            ) : (
              stats.bySection.map((sec, idx) => {
                const widthPct =
                  sec.submitted > 0
                    ? Math.max(6, Math.round((sec.submitted / maxSectionSubmitted) * 100))
                    : 0;
                return (
                  <div key={`${sec.label}-${idx}`}>
                    <div className="flex items-center justify-between gap-2 text-body-sm">
                      <span className="truncate text-ink">Section {sec.label}</span>
                      <span className="shrink-0 tabular-nums text-ink-secondary">{sec.submitted}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {hasRatings && (
            <div className="mt-5 border-t border-edge pt-4">
              <h3 className="text-label-sm uppercase tracking-wider text-ink-muted">
                Evaluation ratings
              </h3>
              <dl className="mt-3 grid grid-cols-3 gap-3">
                {(['GOOD', 'AVERAGE', 'POOR'] as const).map((rating) => {
                  const meta = RATING_META[rating];
                  return (
                    <div key={rating}>
                      <dd className={`font-heading text-headline-md tabular-nums ${meta.text}`}>
                        {stats.byRating[rating] || 0}
                      </dd>
                      <dt className="mt-0.5 flex items-center gap-1.5 text-label-md text-ink-secondary">
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                        {meta.label}
                      </dt>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </section>

        {/* 4. IMPORTANT ACTIONS */}
        <section className="surface p-5 sm:p-6 lg:col-span-5 min-w-0" aria-labelledby="shortcuts-heading">
          <h2 id="shortcuts-heading" className="font-heading text-headline-sm text-ink">
            Jump to
          </h2>
          <ul className="mt-4 divide-y divide-edge">
            {shortcuts.map((shortcut) => (
              <li key={shortcut.tab}>
                <button
                  type="button"
                  onClick={() => onNavigateTab?.(shortcut.tab)}
                  className="-mx-2 flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors duration-fast hover:bg-surface-sunken"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-heading text-label-lg font-semibold text-ink">
                      {shortcut.label}
                      {shortcut.tab === 'moderation' && pendingModeration > 0 && (
                        <span className="badge badge-pending">{pendingModeration}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-body-sm text-ink-secondary">
                      {shortcut.description}
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    strokeWidth={2}
                    className="shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {!portal && (
        <p className="flex items-center gap-2 text-body-sm text-ink-muted">
          <Layers size={14} strokeWidth={2} aria-hidden="true" />
          <span>Portal totals are unavailable right now — the figures above only cover video submissions.</span>
        </p>
      )}
    </div>
  );
};

export default StatsDashboard;
