import React from 'react';
import { RefreshCw, AlertTriangle, TrendingUp, Sparkles, ShieldCheck } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { AnalyticsKpiCards } from '../components/AnalyticsKpiCards';
import { QualityBreakdownCard } from '../components/QualityBreakdownCard';
import { YearDistributionCard } from '../components/YearDistributionCard';
import { EngagementIndexCard } from '../components/EngagementIndexCard';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryGrid';

export const AnalyticsPage: React.FC = () => {
  const { data, loading, error, refreshing, loadAnalytics } = useAnalytics();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] animate-fade-in-up">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Loading system analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center animate-fade-in-up">
        <div className="w-12 h-12 rounded-full bg-status-rejected/10 text-status-rejected flex items-center justify-center mx-auto mb-4 border border-status-rejected/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-ink mb-2">Analytics Unavailable</h3>
        <p className="text-sm text-ink-muted mb-6">{error || 'Could not retrieve statistics.'}</p>
        <button
          onClick={() => loadAnalytics(true)}
          className="btn btn-primary px-4 py-2 text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const { summary, ratings, yearDistribution } = data;
  const profileRate = summary.totalStudents > 0
    ? Math.round((summary.totalProfiles / summary.totalStudents) * 100)
    : 0;

  const submissionRate = summary.totalStudents > 0
    ? Math.round((summary.totalSubmissions / summary.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
            <Sparkles size={13} className="shrink-0" />
            <span>Executive Analytics & Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
            System Intelligence & Analytics
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Aggregated cross-module performance metrics, submissions, and portfolio growth.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-muted hidden sm:inline">
            Updated {new Date(data.timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 1. ASYMMETRICAL TOP SECTION: Featured KPIs + Side Intelligence Accent Block */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <AnalyticsKpiCards
            summary={summary}
            profileRate={profileRate}
            submissionRate={submissionRate}
          />
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <TrendingUp size={13} className="shrink-0" />
                  Cohort Velocity
                </span>
                <span className="text-xs font-bold text-brand-soft-text">
                  {summary.totalStudents} Registered
                </span>
              </div>

              <h2 className="text-lg font-bold text-ink">Platform Adoption Health</h2>
              <p className="mt-1 text-xs sm:text-sm text-ink-secondary leading-relaxed">
                Active student conversion rate is running at <strong className="text-ink">{profileRate}%</strong> with <strong className="text-ink">{submissionRate}%</strong> introduction video submission turnout.
              </p>

              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-3 text-left">
                <div className="p-2.5 rounded-lg bg-surface/60 border border-brand/10">
                  <span className="text-xs text-ink-muted block">Profile Yield</span>
                  <span className="text-xl font-bold text-ink tabular-nums">{profileRate}%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface/60 border border-brand/10">
                  <span className="text-xs text-ink-muted block">Video Yield</span>
                  <span className="text-xl font-bold text-ink tabular-nums">{submissionRate}%</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-ink-muted">
              <ShieldCheck size={14} className="text-brand shrink-0" />
              <span>Real-time cross-database synchronized telemetry</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. MASONRY GRID FOR CHARTS & BREAKDOWNS */}
      <MasonryGrid cols={2}>
        <MasonryItem>
          <div className="card-hover">
            <QualityBreakdownCard ratings={ratings} summary={summary} />
          </div>
        </MasonryItem>
        <MasonryItem>
          <div className="card-hover">
            <YearDistributionCard
              yearDistribution={yearDistribution}
              totalSubmissions={summary.totalSubmissions}
            />
          </div>
        </MasonryItem>
      </MasonryGrid>

      {/* 3. Detailed Platform Matrix */}
      <div className="card-hover">
        <EngagementIndexCard summary={summary} />
      </div>
    </div>
  );
};

export default AnalyticsPage;
