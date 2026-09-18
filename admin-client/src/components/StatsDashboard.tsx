import React from 'react';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { AdminStats } from '../types';

interface StatsDashboardProps {
  stats: AdminStats | null;
  loading: boolean;
  onNavigateTab?: (tab: 'submissions' | 'winners' | 'emails') => void;
}

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
          <span className="text-xs text-neutral-500 font-medium">Loading applicant statistics...</span>
        </div>
      </div>
    );
  }

  const totalApps = stats.totalSubmissions;
  const totalVideos = totalApps; // 1 video per applicant
  const selectedCount = stats.totalWinners;
  const pendingCount = Math.max(0, totalApps - selectedCount);

  // Calculate max section count for relative bar width
  const maxSectionCount = Math.max(1, ...stats.bySection.map((s) => s.count));

  return (
    <div className="space-y-10 text-left">
      {/* 1. EDITORIAL HEADER */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
          Organizer Dashboard
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-elite-black font-display tracking-tight mt-1">
          CLUB MEMBER SELECTION 2026
        </h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-xl font-normal">
          Review applications and select the next members of ELITE Self Introduction.
        </p>
      </div>

      {/* 2. KEY METRIC CARDS (Clean white cards, thin borders, red accents) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Applications */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all shadow-sm group">
          <div className="flex items-center justify-between text-neutral-500 text-xs uppercase font-bold tracking-wider mb-3">
            <span>Total Applications</span>
            <div className="w-2 h-2 rounded-full bg-elite-red" />
          </div>
          <div className="text-4xl font-extrabold text-elite-black font-display tracking-tight">
            {totalApps}
          </div>
          <div className="text-xs text-neutral-500 mt-2 font-medium">
            Applications received
          </div>
        </div>

        {/* Videos Received */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all shadow-sm group">
          <div className="flex items-center justify-between text-neutral-500 text-xs uppercase font-bold tracking-wider mb-3">
            <span>Videos Received</span>
            <div className="w-2 h-2 rounded-full bg-neutral-400" />
          </div>
          <div className="text-4xl font-extrabold text-elite-black font-display tracking-tight">
            {totalVideos}
          </div>
          <div className="text-xs text-neutral-500 mt-2 font-medium">
            Introduction videos uploaded
          </div>
        </div>

        {/* Selected Members */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-elite-red transition-all shadow-sm group">
          <div className="flex items-center justify-between text-elite-red text-xs uppercase font-bold tracking-wider mb-3">
            <span>Selected Members</span>
            <CheckCircle2 className="w-4 h-4 text-elite-red" />
          </div>
          <div className="text-4xl font-extrabold text-elite-red font-display tracking-tight">
            {selectedCount}
          </div>
          <div className="text-xs text-neutral-500 mt-2 font-medium">
            Applicants accepted for club
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-all shadow-sm group">
          <div className="flex items-center justify-between text-neutral-500 text-xs uppercase font-bold tracking-wider mb-3">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-4xl font-extrabold text-neutral-800 font-display tracking-tight">
            {pendingCount}
          </div>
          <div className="text-xs text-neutral-500 mt-2 font-medium">
            Awaiting evaluation
          </div>
        </div>
      </div>

      {/* 3. SECTION STATISTICS (Minimal bar visualization, white background, red bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 8 cols: Applications By Section */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
                Applications by Section
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Distribution across Information Technology sections
              </p>
            </div>
            <span className="text-xs font-semibold text-elite-red font-mono">
              {stats.bySection
                .filter((sec) => {
                  const yStr = String(sec.year || '').trim();
                  const yNum = parseInt(yStr, 10);
                  if (yNum === 1 || yStr === '1' || yStr.startsWith('1st')) return false;
                  if (sec.label && sec.label.startsWith('1st Year')) return false;
                  return true;
                })
                .reduce((acc, curr) => acc + curr.count, 0)} Total
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {stats.bySection
              .filter((sec) => {
                const yStr = String(sec.year || '').trim();
                const yNum = parseInt(yStr, 10);
                if (yNum === 1 || yStr === '1' || yStr.startsWith('1st')) return false;
                if (sec.label && sec.label.startsWith('1st Year')) return false;
                return true;
              })
              .map((sec, idx) => {
                const percent = Math.round((sec.count / maxSectionCount) * 100);
                
                // Ensure label formatting is clean and fallback to Year · Branch-Section if needed
                const yearStr = String(sec.year || '2').trim();
                let formattedYear = yearStr;
                if (!yearStr.toLowerCase().includes('year')) {
                  const num = parseInt(yearStr, 10);
                  if (num === 2) formattedYear = '2nd Year';
                  else if (num === 3) formattedYear = '3rd Year';
                  else if (num === 4) formattedYear = '4th Year';
                  else if (!isNaN(num)) formattedYear = `${num}th Year`;
                }
                const branchStr = sec.branch ? sec.branch.trim() : 'IT';
                const displayLabel = sec.label && sec.label.includes('·')
                  ? sec.label
                  : `${formattedYear} · ${branchStr}-${sec.section}`;

                return (
                  <div key={`${displayLabel}-${idx}`} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                      <span className="font-bold text-elite-black font-mono truncate">
                        {displayLabel}
                      </span>
                      <span className="font-semibold text-neutral-700 shrink-0">
                        {sec.count} <span className="text-neutral-400 font-normal">{sec.count === 1 ? 'applicant' : 'applicants'}</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-elite-red rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right 5 cols: Quick Actions / Workflow Guide */}
        <div className="lg:col-span-5 bg-[#fafafa] border border-neutral-200 rounded-xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-elite-black font-display">
              Selection Workflow
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Recommended steps for club coordinators
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div
              onClick={() => onNavigateTab && onNavigateTab('submissions')}
              className="bg-white border border-neutral-200 rounded-lg p-3.5 hover:border-elite-red transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-elite-black group-hover:text-elite-red transition-colors">
                  1. Review Applicants
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Inspect submitted intro videos and applicant info
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-elite-red transition-colors" />
            </div>

            <div
              onClick={() => onNavigateTab && onNavigateTab('winners')}
              className="bg-white border border-neutral-200 rounded-lg p-3.5 hover:border-elite-red transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-elite-black group-hover:text-elite-red transition-colors">
                  2. Confirm Selection
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Review the {selectedCount} shortlisted members
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-elite-red transition-colors" />
            </div>

            <div
              onClick={() => onNavigateTab && onNavigateTab('emails')}
              className="bg-white border border-neutral-200 rounded-lg p-3.5 hover:border-elite-red transition-all cursor-pointer flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-elite-black group-hover:text-elite-red transition-colors">
                  3. Send Notifications
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Dispatch selection and thank-you emails
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-elite-red transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
