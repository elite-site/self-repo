import React from 'react';
import { Film, Gauge, Percent } from 'lucide-react';
import { AdminStats } from '../types';

interface StatsDashboardProps {
  stats: AdminStats | null;
  loading: boolean;
  onNavigateTab?: (tab: 'submissions' | 'activity') => void;
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

  const submitted = stats.totalVideos;
  const rated = stats.totalRated;
  const ratedPct = submitted > 0 ? Math.round((rated / submitted) * 100) : 0;

  const cards = [
    {
      label: 'Videos Submitted',
      value: submitted,
      sub: 'Introduction videos uploaded',
      dotClass: 'bg-elite-red',
      Icon: Film,
    },
    {
      label: 'Rated',
      value: rated,
      sub: 'Good / Average / Poor marked',
      dotClass: 'bg-emerald-500',
      Icon: Gauge,
    },
  ];

  const maxSectionSubmitted = Math.max(1, ...stats.bySection.map((s) => s.submitted));

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
          Track and review submitted introduction videos across every section and year.
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

        {/* Rated percentage card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs uppercase font-bold tracking-wider mb-3">
            <span>Rated %</span>
            <div className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="text-4xl font-extrabold text-elite-black font-display tracking-tight">
            {ratedPct}%
          </div>
          <div className="text-xs text-neutral-500 mt-2 font-medium flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-neutral-400" />
            <span>{rated} of {submitted} rated</span>
          </div>
        </div>
      </div>

      {/* 3. SECTION STATISTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Uploads by section */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
                Uploads by Section
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Number of videos submitted, section by section across years
              </p>
            </div>
            <span className="text-xs font-semibold text-elite-red font-mono">
              {submitted} total
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {stats.bySection.map((sec, idx) => {
              const widthPct = sec.submitted > 0
                ? Math.round((sec.submitted / maxSectionSubmitted) * 100)
                : 0;
              return (
                <div key={`${sec.label}-${idx}`} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                    <span className="font-bold text-elite-black font-mono truncate">
                      {sec.label}
                    </span>
                    <span className="font-semibold text-neutral-700 shrink-0">
                      {sec.submitted} uploaded
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
                No submissions yet. Share the public form with students to get started.
              </p>
            )}
          </div>
        </div>

        {/* Right: Year-wise counts + Quick actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Year wise cards */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
              Year-wise Uploads
            </h2>
            <div className="space-y-3 pt-1">
              {Object.entries(stats.byYear || {}).sort((a, b) => {
                const n = (s: string) => parseInt((s.match(/\d+/) || ['0'])[0], 10);
                return n(a[0]) - n(b[0]);
              }).map(([year, count]) => {
                const pct = submitted > 0 ? Math.round((count / submitted) * 100) : 0;
                return (
                  <div key={year} className="bg-[#fafafa] border border-neutral-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-elite-black">{year}</span>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {count} videos
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
              {Object.keys(stats.byYear || {}).length === 0 && (
                <p className="text-xs text-neutral-400 py-4 text-center">No submissions yet.</p>
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
                onClick={() => onNavigateTab && onNavigateTab('submissions')}
                className="bg-white border border-neutral-200 rounded-lg p-3.5 hover:border-elite-red transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-elite-black group-hover:text-elite-red transition-colors">
                    Review & Rate Videos
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    Watch each submission and mark Good, Average, or Poor
                  </div>
                </div>
                <Film className="w-4 h-4 text-neutral-400 group-hover:text-elite-red transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RATING BREAKDOWN */}
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