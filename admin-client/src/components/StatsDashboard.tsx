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
  Trophy
} from 'lucide-react';
import { AdminStats } from '../types';
import { AdminTab } from './Sidebar';

interface StatsDashboardProps {
  stats: AdminStats | null;
  loading: boolean;
  onNavigateTab?: (tab: AdminTab) => void;
}

const ratingColors: Record<string, { dot: string; text: string; label: string }> = {
  GOOD: { dot: 'bg-emerald-500', text: 'text-emerald-500', label: 'Good' },
  AVERAGE: { dot: 'bg-amber-400', text: 'text-amber-500', label: 'Average' },
  POOR: { dot: 'bg-red-500', text: 'text-red-500', label: 'Poor' },
};

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  stats,
  loading,
  onNavigateTab,
}) => {
  if (loading || !stats) {
    return (
      <div className="p-16 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Loading ELITE portal statistics...
          </span>
        </div>
      </div>
    );
  }

  const portal = stats.portal;
  const submitted = stats.totalVideos;
  const rated = stats.totalRated;
  const ratedPct = submitted > 0 ? Math.round((rated / submitted) * 100) : 0;
  const maxSectionSubmitted = Math.max(1, ...stats.bySection.map((s) => s.submitted));

  return (
    <div className="space-y-8 text-left transition-colors">
      {/* 1. EDITORIAL HEADER */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono font-bold tracking-widest text-[#DC2626] uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
            <span>ELITE ADMIN PORTAL · DEPT OF INFORMATION TECHNOLOGY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B192C] dark:text-white font-display tracking-tight mt-1.5">
            OPERATIONS & PORTAL DASHBOARD
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-2xl font-normal">
            Unified institutional management for student rosters, verified portfolios, event registrations, department voting, and faculty moderation.
          </p>
        </div>

        {portal && portal.pendingModeration > 0 && onNavigateTab && (
          <button
            onClick={() => onNavigateTab('moderation')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all cursor-pointer shrink-0"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{portal.pendingModeration} items awaiting review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. PORTAL SYSTEM METRICS (COMPLETE OVERVIEW) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL ENROLLED STUDENTS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('students')}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-[#0B192C] dark:text-white font-display tracking-tight">
            {portal ? portal.totalStudents : 120}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{portal ? portal.totalProfiles : 84} active profiles</span>
          </div>
        </div>

        {/* PORTFOLIO ARTIFACTS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('moderation')}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Portfolio Builds</span>
            <Briefcase className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-[#0B192C] dark:text-white font-display tracking-tight">
            {portal
              ? portal.totalProjects + portal.totalAchievements + portal.totalCertificates
              : 65}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {portal ? `${portal.totalProjects} builds · ${portal.totalAchievements} awards` : 'Builds & honors'}
            </span>
          </div>
        </div>

        {/* EVENTS & REGISTRATIONS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('events')}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Events & Contests</span>
            <CalendarDays className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-[#0B192C] dark:text-white font-display tracking-tight">
            {portal ? portal.totalEvents : 3}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>{portal ? `${portal.totalRegistrations} participants` : 'Student registrations'}</span>
          </div>
        </div>

        {/* VOTING ELECTIONS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('voting')}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Department Voting</span>
            <Vote className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-3xl font-black text-[#0B192C] dark:text-white font-display tracking-tight">
            {portal ? portal.totalCampaigns : 1}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{portal ? `${portal.totalVotes} ballots cast` : 'Elections live'}</span>
          </div>
        </div>
      </div>

      {/* 3. MODERATION & QUICK WORKFLOW SHORTCUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: INTRO VIDEO & CORE STATS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* VIDEO SUBMISSIONS CARD */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#0B192C] dark:text-white font-display">
                  Introduction Video Campaign
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  60-90s self-introduction video intake and faculty evaluation status
                </p>
              </div>
              <span className="text-xs font-bold text-[#DC2626] font-mono">
                {submitted} uploaded
              </span>
            </div>

            {/* Video sub-metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-0.5">Uploaded</span>
                <span className="text-xl font-extrabold text-[#0B192C] dark:text-white">{submitted}</span>
              </div>
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-0.5">Rated</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{rated}</span>
              </div>
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-0.5">Coverage</span>
                <span className="text-xl font-extrabold text-[#DC2626]">{ratedPct}%</span>
              </div>
            </div>

            {/* Uploads by section progress bars */}
            <div className="space-y-3 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Submissions by Section
              </div>
              {stats.bySection.map((sec, idx) => {
                const widthPct = sec.submitted > 0
                  ? Math.round((sec.submitted / maxSectionSubmitted) * 100)
                  : 0;
                return (
                  <div key={`${sec.label}-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono truncate">
                        {sec.label}
                      </span>
                      <span className="font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">
                        {sec.submitted}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#DC2626] rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(sec.submitted > 0 ? 6 : 0, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.bySection.length === 0 && (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  No video submissions recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PORTAL QUICK WORKFLOW ACTIONS (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#0B192C] dark:text-white font-display">
                Portal Management Modules
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Direct access to faculty administration workflows
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <button
                onClick={() => onNavigateTab && onNavigateTab('moderation')}
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0B192C] dark:text-white group-hover:text-[#DC2626] transition-colors">
                    Moderation Queue
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Review pending student projects, honors, and certificates
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#DC2626] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('students')}
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0B192C] dark:text-white group-hover:text-[#DC2626] transition-colors">
                    All Students Directory
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Search and manage department student academic rosters
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#DC2626] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('events')}
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0B192C] dark:text-white group-hover:text-[#DC2626] transition-colors">
                    Department Events
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Create symposiums, hackathons, and registration forms
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#DC2626] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('voting')}
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0B192C] dark:text-white group-hover:text-[#DC2626] transition-colors">
                    Elections & Voting
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Configure ELITE candidate ballots and track cast votes
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#DC2626] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('submissions')}
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0B192C] dark:text-white group-hover:text-[#DC2626] transition-colors">
                    Video Submissions Table
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Play clips, rate submissions, and write feedback
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#DC2626] group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* RATING BREAKDOWN (IF ANY) */}
          {(stats.byRating.GOOD || stats.byRating.AVERAGE || stats.byRating.POOR) ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#0B192C] dark:text-white font-display">
                Evaluation Rating Distribution
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                {(['GOOD', 'AVERAGE', 'POOR'] as const).map((r) => {
                  const meta = ratingColors[r];
                  const count = stats.byRating[r] || 0;
                  return (
                    <div
                      key={r}
                      className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 rounded-xl p-3 flex flex-col items-center gap-0.5"
                    >
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span className={`text-lg font-black font-display ${meta.text}`}>{count}</span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">
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