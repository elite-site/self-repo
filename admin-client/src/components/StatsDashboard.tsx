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
  Trophy,
  Clapperboard
} from 'lucide-react';
import { AdminStats } from '../types';
import { AdminTab } from './Sidebar';
import { BrandedLoading } from './BrandedLoading';

interface StatsDashboardProps {
  stats: AdminStats | null;
  loading: boolean;
  onNavigateTab?: (tab: AdminTab) => void;
}

const ratingColors: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  GOOD: { dot: 'bg-status-approved', text: 'text-status-approved', bg: 'bg-status-bg-approved', label: 'Good' },
  AVERAGE: { dot: 'bg-status-pending', text: 'text-status-pending', bg: 'bg-status-bg-pending', label: 'Average' },
  POOR: { dot: 'bg-status-rejected', text: 'text-status-rejected', bg: 'bg-status-bg-rejected', label: 'Poor' },
};

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  stats,
  loading,
  onNavigateTab,
}) => {
  if (loading || !stats) {
    return <BrandedLoading fullScreen={false} message="Loading ELITE Portal Statistics" />;
  }

  const portal = stats.portal;
  const submitted = stats.totalVideos;
  const rated = stats.totalRated;
  const ratedPct = submitted > 0 ? Math.round((rated / submitted) * 100) : 0;
  const maxSectionSubmitted = Math.max(1, ...stats.bySection.map((s) => s.submitted));

  return (
    <div className="space-y-6 text-left transition-colors">
      {/* 1. WELCOME & IDENTITY BANNER */}
      <div className="bg-surface border border-edge rounded-lg p-6 sm:p-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold tracking-widest text-accent uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>ELITE ADMIN PORTAL · DEPT OF INFORMATION TECHNOLOGY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-heading tracking-tight">
            OPERATIONS & PORTAL DASHBOARD
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary max-w-2xl font-normal leading-relaxed">
            Unified institutional management for student rosters, verified portfolios, event registrations, department voting, and faculty moderation.
          </p>
        </div>

        {portal && portal.pendingModeration > 0 && onNavigateTab && (
          <button
            onClick={() => onNavigateTab('moderation')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-status-solid-rejected text-on-primary text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0 self-start sm:self-center"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{portal.pendingModeration} items awaiting review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. PROGRESS / COMPLETION MODULE */}
      <div className="bg-surface border border-edge rounded-lg p-5 sm:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink font-heading">
                Video Evaluation & Moderation Progress
              </h2>
              <span className="text-[11px] text-ink-secondary">
                {rated} of {submitted} uploaded self-introduction videos evaluated
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-secondary">Coverage</span>
            <span className="text-lg font-black text-brand font-heading">
              {ratedPct}%
            </span>
          </div>
        </div>

        {/* Determinate progress bar in primary indigo */}
        <div className="w-full h-2 bg-brand-soft rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-colors duration-slower"
            style={{ width: `${Math.min(100, Math.max(submitted > 0 ? 4 : 0, ratedPct))}%` }}
          />
        </div>
      </div>

      {/* 3. GRID OF STATUS KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL ENROLLED STUDENTS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('students')}
          className="bg-surface border border-edge rounded-lg p-5 hover:border-edge-strong/50 transition-colors shadow-card cursor-pointer group"
        >
          <div className="flex items-center justify-between text-ink-secondary text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-brand" />
          </div>
          <div className="text-3xl font-black text-ink font-heading tracking-tight">
            {portal ? portal.totalStudents : 120}
          </div>
          <div className="text-[11px] text-ink-secondary mt-2 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-status-approved" />
            <span>{portal ? portal.totalProfiles : 84} active profiles</span>
          </div>
        </div>

        {/* PORTFOLIO ARTIFACTS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('moderation')}
          className="bg-surface border border-edge rounded-lg p-5 hover:border-edge-strong/50 transition-colors shadow-card cursor-pointer group"
        >
          <div className="flex items-center justify-between text-ink-secondary text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Portfolio Builds</span>
            <Briefcase className="w-4 h-4 text-status-review" />
          </div>
          <div className="text-3xl font-black text-ink font-heading tracking-tight">
            {portal
              ? portal.totalProjects + portal.totalAchievements + portal.totalCertificates
              : 65}
          </div>
          <div className="text-[11px] text-ink-secondary mt-2 font-medium flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-status-pending" />
            <span>
              {portal ? `${portal.totalProjects} builds · ${portal.totalAchievements} awards` : 'Builds & honors'}
            </span>
          </div>
        </div>

        {/* EVENTS & REGISTRATIONS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('events')}
          className="bg-surface border border-edge rounded-lg p-5 hover:border-edge-strong/50 transition-colors shadow-card cursor-pointer group"
        >
          <div className="flex items-center justify-between text-ink-secondary text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Events & Contests</span>
            <CalendarDays className="w-4 h-4 text-status-approved" />
          </div>
          <div className="text-3xl font-black text-ink font-heading tracking-tight">
            {portal ? portal.totalEvents : 3}
          </div>
          <div className="text-[11px] text-ink-secondary mt-2 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand" />
            <span>{portal ? `${portal.totalRegistrations} participants` : 'Student registrations'}</span>
          </div>
        </div>

        {/* VOTING ELECTIONS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('voting')}
          className="bg-surface border border-edge rounded-lg p-5 hover:border-edge-strong/50 transition-colors shadow-card cursor-pointer group"
        >
          <div className="flex items-center justify-between text-ink-secondary text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Department Voting</span>
            <Vote className="w-4 h-4 text-accent" />
          </div>
          <div className="text-3xl font-black text-ink font-heading tracking-tight">
            {portal ? portal.totalCampaigns : 1}
          </div>
          <div className="text-[11px] text-ink-secondary mt-2 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-status-approved" />
            <span>{portal ? `${portal.totalVotes} ballots cast` : 'Elections live'}</span>
          </div>
        </div>
      </div>

      {/* 4. MODERATION & QUICK WORKFLOW SHORTCUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: INTRO VIDEO & CORE STATS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* VIDEO SUBMISSIONS CARD */}
          <div className="bg-surface border border-edge rounded-lg p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-ink font-heading">
                  Introduction Video Campaign
                </h2>
                <p className="text-xs text-ink-secondary mt-0.5">
                  60-90s self-introduction video intake and faculty evaluation status
                </p>
              </div>
              <span className="text-xs font-bold text-brand">
                {submitted} uploaded
              </span>
            </div>

            {/* Video sub-metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-surface-canvas border border-edge rounded-lg text-center">
                <span className="text-[10px] font-bold uppercase text-ink-muted block mb-0.5">Uploaded</span>
                <span className="text-xl font-extrabold text-ink font-heading">{submitted}</span>
              </div>
              <div className="p-3.5 bg-surface-canvas border border-edge rounded-lg text-center">
                <span className="text-[10px] font-bold uppercase text-ink-muted block mb-0.5">Rated</span>
                <span className="text-xl font-extrabold text-status-approved font-heading">{rated}</span>
              </div>
              <div className="p-3.5 bg-surface-canvas border border-edge rounded-lg text-center">
                <span className="text-[10px] font-bold uppercase text-ink-muted block mb-0.5">Coverage</span>
                <span className="text-xl font-extrabold text-brand font-heading">{ratedPct}%</span>
              </div>
            </div>

            {/* Uploads by section progress bars */}
            <div className="space-y-3 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Submissions by Section
              </div>
              {stats.bySection.map((sec, idx) => {
                const widthPct = sec.submitted > 0
                  ? Math.round((sec.submitted / maxSectionSubmitted) * 100)
                  : 0;
                return (
                  <div key={`${sec.label}-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                      <span className="font-semibold text-ink truncate">
                        Section {sec.label}
                      </span>
                      <span className="font-semibold text-ink-secondary shrink-0">
                        {sec.submitted}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-brand-soft/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-colors duration-slow"
                        style={{ width: `${Math.max(sec.submitted > 0 ? 6 : 0, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.bySection.length === 0 && (
                <p className="text-xs text-ink-muted py-4 text-center">
                  No video submissions recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PORTAL QUICK WORKFLOW ACTIONS (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface border border-edge rounded-lg p-6 shadow-card space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink font-heading">
                Portal Management Modules
              </h2>
              <p className="text-xs text-ink-secondary mt-0.5">
                Direct access to faculty administration workflows
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <button
                onClick={() => onNavigateTab && onNavigateTab('moderation')}
                className="w-full bg-surface-canvas hover:bg-brand-soft border border-edge rounded-lg p-3.5 text-left transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-ink group-hover:text-brand transition-colors">
                    Moderation Queue
                  </div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    Review pending student projects, honors, and certificates
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-colors" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('students')}
                className="w-full bg-surface-canvas hover:bg-brand-soft border border-edge rounded-lg p-3.5 text-left transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-ink group-hover:text-brand transition-colors">
                    All Students Directory
                  </div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    Search and manage department student academic rosters
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-colors" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('events')}
                className="w-full bg-surface-canvas hover:bg-brand-soft border border-edge rounded-lg p-3.5 text-left transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-ink group-hover:text-brand transition-colors">
                    Department Events
                  </div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    Create symposiums, hackathons, and registration forms
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-colors" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('voting')}
                className="w-full bg-surface-canvas hover:bg-brand-soft border border-edge rounded-lg p-3.5 text-left transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-ink group-hover:text-brand transition-colors">
                    Elections & Voting
                  </div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    Configure ELITE candidate ballots and track cast votes
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-colors" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('submissions')}
                className="w-full bg-surface-canvas hover:bg-brand-soft border border-edge rounded-lg p-3.5 text-left transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-ink group-hover:text-brand transition-colors">
                    Video Submissions Table
                  </div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">
                    Play clips, rate submissions, and write feedback
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-colors" />
              </button>
            </div>
          </div>

          {/* RATING BREAKDOWN (IF ANY) */}
          {(stats.byRating.GOOD || stats.byRating.AVERAGE || stats.byRating.POOR) ? (
            <div className="bg-surface border border-edge rounded-lg p-5 shadow-card space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink font-heading">
                Evaluation Rating Distribution
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                {(['GOOD', 'AVERAGE', 'POOR'] as const).map((r) => {
                  const meta = ratingColors[r];
                  const count = stats.byRating[r] || 0;
                  return (
                    <div
                      key={r}
                      className={`${meta.bg} border border-edge rounded-lg p-3 flex flex-col items-center gap-0.5`}
                    >
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span className={`text-lg font-black font-heading ${meta.text}`}>{count}</span>
                      <span className="text-[10px] text-ink-secondary font-bold uppercase tracking-wider">
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
