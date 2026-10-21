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
  ShieldCheck,
} from 'lucide-react';
import { AdminStats } from '../types';
import { AdminTab } from '@/shared/layout/Sidebar';

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
      <div className="skeleton h-72 lg:col-span-7" />
      <div className="skeleton h-72 lg:col-span-5" />
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
  const submitted = stats.totalVideos ?? 0;
  const rated = stats.totalRated ?? 0;
  const ratedPct = submitted > 0 ? Math.round((rated / submitted) * 100) : 0;
  const bySection = Array.isArray(stats.bySection) ? stats.bySection : [];
  const maxSectionSubmitted = Math.max(1, ...bySection.map((s) => s.submitted ?? 0));
  const pendingModeration = portal?.pendingModeration ?? 0;
  const byRating = stats.byRating || {};
  const hasRatings = Boolean(byRating.GOOD || byRating.AVERAGE || byRating.POOR);

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

  const shortcuts: {
    label: string;
    description: string;
    tab: AdminTab;
    icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
  }[] = [
    {
      label: 'Moderation queue',
      description: 'Review pending projects, achievements and certificates',
      tab: 'moderation',
      icon: ShieldCheck,
    },
    {
      label: 'Video submissions',
      description: 'Play clips, rate them and write feedback',
      tab: 'submissions',
      icon: Clapperboard,
    },
    {
      label: 'Student roster',
      description: 'Search and manage department student records',
      tab: 'students',
      icon: Users,
    },
    {
      label: 'Events',
      description: 'Create competitions, hackathons and workshops',
      tab: 'events',
      icon: CalendarDays,
    },
    {
      label: 'Elections',
      description: 'Configure ballots and track votes cast',
      tab: 'voting',
      icon: Vote,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. OVERVIEW. The page says what it is, then gets out of the way. */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-sans font-bold text-2xl sm:text-3xl text-ink tracking-tight">
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

      {/* 2. KPIs. Four numbers, each a door into the list it counts. Standardized height & modern sans-serif metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => onNavigateTab?.(kpi.tab)}
            className="surface cursor-pointer p-5 text-left transition-all duration-fast hover:border-indigo-500/40 hover:bg-surface-raised rounded-xl border border-edge min-h-[148px] h-full flex flex-col justify-between group shadow-xs hover:shadow-sm"
          >
            <span className="flex items-center justify-between gap-2 text-label-md text-ink-muted">
              <span className="font-medium">{kpi.label}</span>
              <kpi.icon size={16} strokeWidth={1.75} className="shrink-0 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
            </span>
            <span className="my-2 block font-sans font-bold text-3xl sm:text-4xl tabular-nums text-ink tracking-tight">
              {kpi.value}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <CheckCircle2 size={13} strokeWidth={2.5} className="shrink-0 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
              <span className="truncate">{kpi.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* 3. CAMPAIGN AND MODERATION PROGRESS */}
        <section className="surface min-w-0 p-5 sm:p-6 lg:col-span-7 flex flex-col justify-between rounded-xl border border-edge" aria-labelledby="campaign-heading">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-edge">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Clapperboard size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="campaign-heading" className="font-sans font-semibold text-base sm:text-lg text-ink truncate">
                    Introduction video campaign
                  </h2>
                  <p className="text-body-sm text-ink-secondary">
                    {rated} of {submitted} uploaded videos evaluated
                  </p>
                </div>
              </div>

              {/* Centered/balanced metric pill */}
              <div className="flex items-baseline gap-1 bg-surface-sunken px-3.5 py-1.5 rounded-lg border border-edge self-start sm:self-center shrink-0">
                <span className="font-sans font-bold text-2xl tabular-nums text-ink">
                  {ratedPct}
                </span>
                <span className="text-sm font-semibold text-ink-muted">%</span>
              </div>
            </div>

            {/* Evaluation coverage progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-medium text-ink-muted mb-1.5">
                <span>Evaluation coverage</span>
                <span className="tabular-nums font-semibold text-ink">{ratedPct}% complete</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
                role="progressbar"
                aria-valuenow={ratedPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Evaluation coverage"
              >
                <div
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-[width] duration-base ease-standard"
                  style={{ width: `${ratedPct}%` }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <h3 className="text-label-sm font-semibold text-ink-muted">Submissions by section</h3>
              {bySection.length === 0 ? (
                <p className="py-3 text-body-sm text-ink-muted">No video submissions recorded yet.</p>
              ) : (
                bySection.map((sec, idx) => {
                  const widthPct =
                    sec.submitted > 0
                      ? Math.max(6, Math.round((sec.submitted / maxSectionSubmitted) * 100))
                      : 0;
                  return (
                    <div key={`${sec.label}-${idx}`}>
                      <div className="flex items-center justify-between gap-2 text-body-sm">
                        <span className="truncate text-ink font-medium">Section {sec.label}</span>
                        <span className="shrink-0 tabular-nums text-ink-secondary font-semibold">{sec.submitted}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {hasRatings && (
            <div className="mt-6 border-t border-edge pt-4">
              <h3 className="text-label-sm font-semibold text-ink-muted">
                Evaluation ratings
              </h3>
              <dl className="mt-3 grid grid-cols-3 gap-3">
                {(['GOOD', 'AVERAGE', 'POOR'] as const).map((rating) => {
                  const meta = RATING_META[rating];
                  return (
                    <div key={rating} className="p-3 rounded-lg bg-surface-sunken border border-edge">
                      <dd className={`font-sans font-bold text-2xl tabular-nums ${meta.text}`}>
                        {byRating[rating] || 0}
                      </dd>
                      <dt className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
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

        {/* 4. IMPORTANT ACTIONS - Tactile Clickable Tiles */}
        <section className="surface min-w-0 p-5 sm:p-6 lg:col-span-5 rounded-xl border border-edge" aria-labelledby="shortcuts-heading">
          <div className="flex items-center justify-between pb-3 border-b border-edge">
            <h2 id="shortcuts-heading" className="font-sans font-semibold text-base sm:text-lg text-ink">
              Jump to
            </h2>
            <span className="text-xs text-ink-muted font-medium">Quick actions</span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              const isModeration = shortcut.tab === 'moderation';
              return (
                <button
                  key={shortcut.tab}
                  type="button"
                  onClick={() => onNavigateTab?.(shortcut.tab)}
                  className="surface border border-edge/80 rounded-xl p-3.5 text-left transition-all duration-fast hover:border-indigo-500/40 hover:bg-surface-raised hover:shadow-xs group flex flex-col justify-between min-h-[96px] cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-sunken border border-edge text-ink-secondary group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors">
                      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    {isModeration && pendingModeration > 0 ? (
                      <span className="badge badge-pending">{pendingModeration}</span>
                    ) : (
                      <ArrowRight
                        size={14}
                        strokeWidth={2}
                        className="text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="mt-2.5">
                    <span className="block font-sans font-semibold text-xs sm:text-sm text-ink group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {shortcut.label}
                    </span>
                    <span className="mt-0.5 block line-clamp-1 text-xs text-ink-muted">
                      {shortcut.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
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
