import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { AnalyticsKpiCards } from '../components/AnalyticsKpiCards';
import { QualityBreakdownCard } from '../components/QualityBreakdownCard';
import { YearDistributionCard } from '../components/YearDistributionCard';
import { EngagementIndexCard } from '../components/EngagementIndexCard';

export const AnalyticsPage: React.FC = () => {
  const { data, loading, error, refreshing, loadAnalytics } = useAnalytics();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Loading system analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-status-bg-rejected text-status-rejected flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-ink mb-2">Analytics Unavailable</h3>
        <p className="text-sm text-ink-muted mb-6">{error || 'Could not retrieve statistics.'}</p>
        <button
          onClick={() => loadAnalytics(true)}
          className="px-4 py-2 bg-brand text-on-primary text-sm font-semibold rounded-lg hover:bg-brand-hover transition-colors inline-flex items-center gap-2"
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            System Intelligence & Analytics
          </h1>
          <p className="text-sm text-ink-muted mt-1">
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
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-ink-brand' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <AnalyticsKpiCards
        summary={summary}
        profileRate={profileRate}
        submissionRate={submissionRate}
      />

      {/* Two Column Section: Quality Ratings & Year Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QualityBreakdownCard ratings={ratings} summary={summary} />
        <YearDistributionCard
          yearDistribution={yearDistribution}
          totalSubmissions={summary.totalSubmissions}
        />
      </div>

      {/* Detailed Platform Matrix */}
      <EngagementIndexCard summary={summary} />
    </div>
  );
};

export default AnalyticsPage;
