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
  GOOD: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: 'Good' },
  AVERAGE: { dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Average' },
  POOR: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', label: 'Poor' },
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
      <div className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold tracking-widest text-[#E11D48] dark:text-[#F43F5E] uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E11D48] dark:bg-[#F43F5E] animate-pulse" />
            <span>ELITE ADMIN PORTAL · DEPT OF INFORMATION TECHNOLOGY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white font-heading tracking-tight">
            OPERATIONS & PORTAL DASHBOARD
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] dark:text-[#9BA3AF] max-w-2xl font-normal leading-relaxed">
            Unified institutional management for student rosters, verified portfolios, event registrations, department voting, and faculty moderation.
          </p>
        </div>

        {portal && portal.pendingModeration > 0 && onNavigateTab && (
          <button
            onClick={() => onNavigateTab('moderation')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-center"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{portal.pendingModeration} items awaiting review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. PROGRESS / COMPLETION MODULE */}
      <div className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-[#4F46E5]/20 text-[#4F46E5] dark:text-[#818CF8] flex items-center justify-center">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white font-heading">
                Video Evaluation & Moderation Progress
              </h2>
              <span className="text-[11px] text-[#475569] dark:text-[#9BA3AF]">
                {rated} of {submitted} uploaded self-introduction videos evaluated
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#475569] dark:text-[#9BA3AF]">Coverage</span>
            <span className="text-lg font-black text-[#4F46E5] dark:text-[#818CF8] font-heading">
              {ratedPct}%
            </span>
          </div>
        </div>

        {/* Determinate progress bar in primary indigo */}
        <div className="w-full h-2 bg-[#E0E7FF] dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4F46E5] dark:bg-[#6366F1] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(submitted > 0 ? 4 : 0, ratedPct))}%` }}
          />
        </div>
      </div>

      {/* 3. GRID OF STATUS KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL ENROLLED STUDENTS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('students')}
          className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-5 hover:border-[#4F46E5]/50 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#475569] dark:text-[#9BA3AF] text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
          </div>
          <div className="text-3xl font-black text-[#0F172A] dark:text-white font-heading tracking-tight">
            {portal ? portal.totalStudents : 120}
          </div>
          <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-2 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{portal ? portal.totalProfiles : 84} active profiles</span>
          </div>
        </div>

        {/* PORTFOLIO ARTIFACTS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('moderation')}
          className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-5 hover:border-[#4F46E5]/50 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#475569] dark:text-[#9BA3AF] text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Portfolio Builds</span>
            <Briefcase className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-[#0F172A] dark:text-white font-heading tracking-tight">
            {portal
              ? portal.totalProjects + portal.totalAchievements + portal.totalCertificates
              : 65}
          </div>
          <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-2 font-medium flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {portal ? `${portal.totalProjects} builds · ${portal.totalAchievements} awards` : 'Builds & honors'}
            </span>
          </div>
        </div>

        {/* EVENTS & REGISTRATIONS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('events')}
          className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-5 hover:border-[#4F46E5]/50 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#475569] dark:text-[#9BA3AF] text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Events & Contests</span>
            <CalendarDays className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-[#0F172A] dark:text-white font-heading tracking-tight">
            {portal ? portal.totalEvents : 3}
          </div>
          <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-2 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
            <span>{portal ? `${portal.totalRegistrations} participants` : 'Student registrations'}</span>
          </div>
        </div>

        {/* VOTING ELECTIONS */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('voting')}
          className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-5 hover:border-[#4F46E5]/50 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#475569] dark:text-[#9BA3AF] text-[11px] uppercase font-bold tracking-wider mb-2">
            <span>Department Voting</span>
            <Vote className="w-4 h-4 text-[#E11D48] dark:text-[#F43F5E]" />
          </div>
          <div className="text-3xl font-black text-[#0F172A] dark:text-white font-heading tracking-tight">
            {portal ? portal.totalCampaigns : 1}
          </div>
          <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-2 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{portal ? `${portal.totalVotes} ballots cast` : 'Elections live'}</span>
          </div>
        </div>
      </div>

      {/* 4. MODERATION & QUICK WORKFLOW SHORTCUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: INTRO VIDEO & CORE STATS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* VIDEO SUBMISSIONS CARD */}
          <div className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E4E7F2] dark:border-[#252B35] pb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#0F172A] dark:text-white font-heading">
                  Introduction Video Campaign
                </h2>
                <p className="text-xs text-[#475569] dark:text-[#9BA3AF] mt-0.5">
                  60-90s self-introduction video intake and faculty evaluation status
                </p>
              </div>
              <span className="text-xs font-bold text-[#4F46E5] dark:text-[#818CF8]">
                {submitted} uploaded
              </span>
            </div>

            {/* Video sub-metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg text-center">
                <span className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-0.5">Uploaded</span>
                <span className="text-xl font-extrabold text-[#0F172A] dark:text-white font-heading">{submitted}</span>
              </div>
              <div className="p-3.5 bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg text-center">
                <span className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-0.5">Rated</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">{rated}</span>
              </div>
              <div className="p-3.5 bg-[#F7F8FC] dark:bg-[#0D1117] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg text-center">
                <span className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-0.5">Coverage</span>
                <span className="text-xl font-extrabold text-[#4F46E5] dark:text-[#818CF8] font-heading">{ratedPct}%</span>
              </div>
            </div>

            {/* Uploads by section progress bars */}
            <div className="space-y-3 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Submissions by Section
              </div>
              {stats.bySection.map((sec, idx) => {
                const widthPct = sec.submitted > 0
                  ? Math.round((sec.submitted / maxSectionSubmitted) * 100)
                  : 0;
                return (
                  <div key={`${sec.label}-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                      <span className="font-semibold text-[#0F172A] dark:text-neutral-200 truncate">
                        Section {sec.label}
                      </span>
                      <span className="font-semibold text-[#475569] dark:text-[#9BA3AF] shrink-0">
                        {sec.submitted}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#E0E7FF]/60 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4F46E5] dark:bg-[#6366F1] rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(sec.submitted > 0 ? 6 : 0, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.bySection.length === 0 && (
                <p className="text-xs text-[#94A3B8] py-4 text-center">
                  No video submissions recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PORTAL QUICK WORKFLOW ACTIONS (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#0F172A] dark:text-white font-heading">
                Portal Management Modules
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#9BA3AF] mt-0.5">
                Direct access to faculty administration workflows
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <button
                onClick={() => onNavigateTab && onNavigateTab('moderation')}
                className="w-full bg-[#F7F8FC] dark:bg-[#0D1117] hover:bg-[#EEF2FF] dark:hover:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0F172A] dark:text-white group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
                    Moderation Queue
                  </div>
                  <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-0.5">
                    Review pending student projects, honors, and certificates
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('students')}
                className="w-full bg-[#F7F8FC] dark:bg-[#0D1117] hover:bg-[#EEF2FF] dark:hover:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0F172A] dark:text-white group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
                    All Students Directory
                  </div>
                  <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-0.5">
                    Search and manage department student academic rosters
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('events')}
                className="w-full bg-[#F7F8FC] dark:bg-[#0D1117] hover:bg-[#EEF2FF] dark:hover:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0F172A] dark:text-white group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
                    Department Events
                  </div>
                  <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-0.5">
                    Create symposiums, hackathons, and registration forms
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('voting')}
                className="w-full bg-[#F7F8FC] dark:bg-[#0D1117] hover:bg-[#EEF2FF] dark:hover:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0F172A] dark:text-white group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
                    Elections & Voting
                  </div>
                  <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-0.5">
                    Configure ELITE candidate ballots and track cast votes
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('submissions')}
                className="w-full bg-[#F7F8FC] dark:bg-[#0D1117] hover:bg-[#EEF2FF] dark:hover:bg-[#151A22] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-3.5 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#0F172A] dark:text-white group-hover:text-[#4F46E5] dark:group-hover:text-[#818CF8] transition-colors">
                    Video Submissions Table
                  </div>
                  <div className="text-[11px] text-[#475569] dark:text-[#9BA3AF] mt-0.5">
                    Play clips, rate submissions, and write feedback
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* RATING BREAKDOWN (IF ANY) */}
          {(stats.byRating.GOOD || stats.byRating.AVERAGE || stats.byRating.POOR) ? (
            <div className="bg-white dark:bg-[#11151C] border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#0F172A] dark:text-white font-heading">
                Evaluation Rating Distribution
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                {(['GOOD', 'AVERAGE', 'POOR'] as const).map((r) => {
                  const meta = ratingColors[r];
                  const count = stats.byRating[r] || 0;
                  return (
                    <div
                      key={r}
                      className={`${meta.bg} border border-[#E4E7F2] dark:border-[#252B35] rounded-lg p-3 flex flex-col items-center gap-0.5`}
                    >
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span className={`text-lg font-black font-heading ${meta.text}`}>{count}</span>
                      <span className="text-[10px] text-[#475569] dark:text-[#9BA3AF] font-bold uppercase tracking-wider">
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