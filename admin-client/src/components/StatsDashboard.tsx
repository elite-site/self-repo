import React from 'react';
import { Users, Film, Hourglass, Gauge, ArrowRight } from 'lucide-react';
import { AdminStats } from '../types';

interface StatsDashboardProps {
  stats: AdminStats | null;
  loading: boolean;
  onNavigateTab?: (tab: 'submissions' | 'students' | 'activity') => void;
}

const ratingColors: Record<string, { dot: string; text: string; label: string }> = {
  GOOD: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Good' },
  AVERAGE: { dot: 'bg-amber-400', text: 'text-amber-600', label: 'Average' },
  POOR: { dot: 'bg-red-500', text: 'text-red-600', label: 'Poor' },
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
          <span className="text-xs text-neutral-500 font-medium">Loading submission statistics...</span>
        </div>
      </div>
    );
  }

  const totalStudents = stats.totalStudents;
  const submitted = stats.totalVideos;
  const remaining = stats.totalRemaining;
  const rated = stats.totalRated;

  // Progress cards
  const cards = [
    {
      label: 'Total Students',
      value: totalStudents,
      sub: 'Registered in the roster',
      dotClass: 'bg-elite-red',
      Icon: Users,
    },
    {
      label: 'Videos Submitted',
      value: submitted,
      sub: 'Introduction videos uploaded',
      dotClass: 'bg-emerald-500',
      Icon: Film,
    },
    {
      label: 'Remaining to Upload',
      value: remaining,
      sub: 'Students yet to submit',
      dotClass: 'bg-amber-400',
      Icon: Hourglass,
    },
    {
      label: 'Rated',
      value: rated,
      sub: 'Good / Average / Poor marked',
      dotClass: 'bg-neutral-400',
      Icon: Gauge,
    },
  ];

  const maxSectionTotal = Math.max(1, ...stats.bySection.map((s) => s.total));

  let overallPct = 0;
  if (totalStudents > 0) {
    overallPct = Math.round((submitted / totalStudents) * 100);
  }

  return (
    <div className="space-y-10 text-left">
      {/* 1. EDITORIAL HEADER */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
          Organizer Dashboard
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-elite-black font-display tracking-tight mt-1">
          SELF INTRODUCTION 2026
        </h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-xl font-normal">
          Track upload progress and review student introduction videos across every section and year.
        </p>
      </div>

      {/* 2. KEY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => {
          const IconComponent = c.Icon;
          return (
            <div key={c.label} className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all shadow-sm">
              <div className="flex items-center justify-between text-neutral-500 text-xs uppercase font-bold tracking-wider mb-3">
                <span>{c.label}</span>
                <div className={`w-2 h-2 rounded-full ${c.dotClass}`} />
              </div>
              <div className="text-4xl font-extrabold text-elite-black font-display tracking-tight">
                {c.value}
              </div>
              <div className="text-xs text-neutral-500 mt-2 font-medium flex items-center gap-1">
                <IconComponent className="w-3.5 h-3.5 text-neutral-400" />
                <span>{c.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. OVERALL PROGRESS */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
              Overall Upload Progress
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {submitted} of {totalStudents} students have uploaded their introduction video
            </p>
          </div>
          <span className="text-2xl font-extrabold text-elite-red font-display">
            {overallPct}%
          </span>
        </div>
        <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-elite-red to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(2, overallPct)}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-[11px] text-neutral-500 font-mono">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {remaining} remaining</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-300" /> rated</span>
        </div>
      </div>

      {/* 4. SECTION STATISTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 cols: Upload progress by section */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
                Progress by Section
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Submitted out of total students, section by section across years
              </p>
            </div>
            <span className="text-xs font-semibold text-elite-red font-mono">
              {submitted}/{totalStudents} done
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {stats.bySection.map((sec, idx) => {
              const widthPct = sec.submitted > 0
                ? Math.round((sec.submitted / maxSectionTotal) * 100)
                : 0;
              return (
                <div key={`${sec.label}-${idx}`} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                    <span className="font-bold text-elite-black font-mono truncate">
                      {sec.label}
                    </span>
                    <span className="font-semibold text-neutral-700 shrink-0">
                      {sec.submitted}/{sec.total}
                      <span className="text-neutral-400 font-normal ml-1">
                        · {sec.remaining} left
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-elite-red rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(sec.submitted > 0 ? 6 : 0, widthPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.bySection.length === 0 && (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No students in the roster yet. Import the student list from the Students tab.
              </p>
            )}
          </div>
        </div>

        {/* Right 5 cols: Year-wise progress + Quick actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Year wise cards */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
              Year-wise Progress
            </h2>
            <div className="space-y-3 pt-1">
              {Object.entries(stats.byYearProgress || {}).sort((a, b) => {
                const n = (s: string) => parseInt((s.match(/\d+/) || ['0'])[0], 10);
                return n(a[0]) - n(b[0]);
              }).map(([year, p]) => {
                const pct = p.total > 0 ? Math.round((p.submitted / p.total) * 100) : 0;
                return (
                  <div key={year} className="bg-[#fafafa] border border-neutral-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-elite-black">{year}</span>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {p.submitted}/{p.total} · {p.remaining} remaining
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-elite-red to-amber-400 rounded-full"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats.byYearProgress || {}).length === 0 && (
                <p className="text-xs text-neutral-400 py-4 text-center">No roster data yet.</p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-[#fafafa] border border-neutral-200 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
                Workflow
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Recommended steps for coordinators
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div
                onClick={() => onNavigateTab && onNavigateTab('students')}
                className="bg-white border border-neutral-200 rounded-lg p-3.5 hover:border-elite-red transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-elite-black group-hover:text-elite-red transition-colors">
                    1. Manage Student Roster
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    Import the student list or download the Excel template
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-elite-red transition-colors" />
              </div>

              <div
                onClick={() => onNavigateTab && onNavigateTab('submissions')}
                className="bg-white border border-neutral-200 rounded-lg p-3.5 hover:border-elite-red transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-elite-black group-hover:text-elite-red transition-colors">
                    2. Review & Rate Videos
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    Watch each submission and mark Good, Average, or Poor
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-elite-red transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. RATING BREAKDOWN */}
      {(stats.byRating.GOOD || stats.byRating.AVERAGE || stats.byRating.POOR) ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
            Performance Ratings
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {(['GOOD', 'AVERAGE', 'POOR'] as const).map((r) => {
              const meta = ratingColors[r];
              const count = stats.byRating[r] || 0;
              return (
                <div key={r} className="bg-[#fafafa] border border-neutral-200 rounded-xl p-4 flex flex-col items-center gap-1">
                  <span className={`w-3 h-3 rounded-full ${meta.dot}`} />
                  <span className={`text-xl font-extrabold font-display ${meta.text}`}>{count}</span>
                  <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};