import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { AnalyticsResponse } from '../types';
import {
  Users,
  Video,
  Award,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  FolderGit2,
  FileText,
  Vote,
  Calendar,
  Star,
  Activity,
  AlertTriangle,
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAnalytics();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err?.response?.data?.message || 'Failed to load system analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

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
  const ratingTotal = (ratings.good || 0) + (ratings.average || 0) + (ratings.poor || 0);
  const goodPct = ratingTotal > 0 ? Math.round(((ratings.good || 0) / ratingTotal) * 100) : 0;
  const avgPct = ratingTotal > 0 ? Math.round(((ratings.average || 0) / ratingTotal) * 100) : 0;
  const poorPct = ratingTotal > 0 ? Math.round(((ratings.poor || 0) / ratingTotal) * 100) : 0;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="p-5 bg-surface border border-edge rounded-xl shadow-sm hover:border-edge-strong transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold  text-ink-muted">
              Enrolled Students
            </span>
            <div className="w-9 h-9 rounded-lg bg-status-bg-approved text-status-approved flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-ink">
              {summary.totalStudents.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-status-approved">
              {profileRate}% active profiles
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {summary.totalProfiles} students have customized their profiles
          </p>
        </div>

        {/* Submissions & Rated */}
        <div className="p-5 bg-surface border border-edge rounded-xl shadow-sm hover:border-edge-strong transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold  text-ink-muted">
              Submissions Received
            </span>
            <div className="w-9 h-9 rounded-lg bg-status-bg-approved text-status-approved flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-ink">
              {summary.totalSubmissions.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-status-approved">
              {submissionRate}% cohort yield
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {summary.totalRated} submissions evaluated by faculty
          </p>
        </div>

        {/* Events & Registrations */}
        <div className="p-5 bg-surface border border-edge rounded-xl shadow-sm hover:border-edge-strong transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold  text-ink-muted">
              Event Participation
            </span>
            <div className="w-9 h-9 rounded-lg bg-status-bg-review text-status-review flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-ink">
              {summary.totalRegistrations.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-status-review">
              across {summary.totalEvents} events
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {summary.totalVotes} student votes logged in democracy campaigns
          </p>
        </div>

        {/* Portfolio Assets & Moderation */}
        <div className="p-5 bg-surface border border-edge rounded-xl shadow-sm hover:border-edge-strong transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold  text-ink-muted">
              Portfolio Assets
            </span>
            <div className="w-9 h-9 rounded-lg bg-status-bg-pending text-status-pending flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-ink">
              {(summary.totalProjects + summary.totalAchievements + summary.totalCertificates).toLocaleString()}
            </span>
            {summary.pendingModeration > 0 ? (
              <span className="px-2 py-0.5 text-xs font-bold bg-status-bg-pending text-ink rounded-full">
                {summary.pendingModeration} pending
              </span>
            ) : (
              <span className="text-xs font-medium text-status-approved">
                100% verified
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {summary.totalResumes} resumes indexed in storage
          </p>
        </div>
      </div>

      {/* Two Column Section: Quality Ratings & Year Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Breakdown Card */}
        <div className="p-6 bg-surface border border-edge rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Star className="w-4 h-4 text-status-pending" />
                Evaluation Quality Breakdown
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Faculty ratings distribution across evaluated submissions
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-surface-sunken text-ink-secondary rounded-full">
              {ratingTotal} Rated
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Good */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-status-approved flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-approved inline-block" />
                  GOOD (Exemplary Delivery)
                </span>
                <span className="text-ink-secondary font-bold">
                  {ratings.good} ({goodPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-surface-sunken rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-approved rounded-full transition-colors duration-slower"
                  style={{ width: `${goodPct}%` }}
                />
              </div>
            </div>

            {/* Average */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-status-approved flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-approved inline-block" />
                  AVERAGE (Satisfactory Effort)
                </span>
                <span className="text-ink-secondary font-bold">
                  {ratings.average} ({avgPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-surface-sunken rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-approved rounded-full transition-colors duration-slower"
                  style={{ width: `${avgPct}%` }}
                />
              </div>
            </div>

            {/* Poor */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-status-rejected flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-rejected inline-block" />
                  POOR (Needs Re-submission)
                </span>
                <span className="text-ink-secondary font-bold">
                  {ratings.poor} ({poorPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-surface-sunken rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-rejected rounded-full transition-colors duration-slower"
                  style={{ width: `${poorPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-edge flex items-center justify-between text-xs text-ink-muted">
            <span>Unrated pending review:</span>
            <span className="font-semibold text-ink">
              {Math.max(0, summary.totalSubmissions - summary.totalRated)} submissions
            </span>
          </div>
        </div>

        {/* Year Distribution Card */}
        <div className="p-6 bg-surface border border-edge rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-ink-brand" />
                Submission Yield By Academic Year
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Distribution of uploaded videos across cohort years
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-surface-sunken text-ink-secondary rounded-full">
              {summary.totalSubmissions} Total
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {yearDistribution.length === 0 ? (
              <p className="text-sm text-ink-muted py-6 text-center">No submissions recorded yet</p>
            ) : (
              yearDistribution.map((y) => {
                const pct = summary.totalSubmissions > 0
                  ? Math.round((y.count / summary.totalSubmissions) * 100)
                  : 0;
                return (
                  <div key={y.year}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-ink">
                        Year {y.year} Students
                      </span>
                      <span className="text-ink-secondary font-mono">
                        {y.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-colors duration-slower"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-edge flex items-center justify-between text-xs text-ink-muted">
            <span>Active Academic Cohort:</span>
            <span className="font-semibold text-ink">
              Department of Information Technology
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Platform Matrix */}
      <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-status-approved" />
          Cross-Module Asset & Engagement Index
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
            <FolderGit2 className="w-5 h-5 mx-auto text-ink-brand mb-2" />
            <div className="text-xl font-bold text-ink">{summary.totalProjects}</div>
            <div className="text-xs text-ink-muted mt-0.5">Projects</div>
          </div>
          <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
            <Award className="w-5 h-5 mx-auto text-status-pending mb-2" />
            <div className="text-xl font-bold text-ink">{summary.totalAchievements}</div>
            <div className="text-xs text-ink-muted mt-0.5">Achievements</div>
          </div>
          <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
            <CheckCircle className="w-5 h-5 mx-auto text-status-approved mb-2" />
            <div className="text-xl font-bold text-ink">{summary.totalCertificates}</div>
            <div className="text-xs text-ink-muted mt-0.5">Certificates</div>
          </div>
          <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
            <FileText className="w-5 h-5 mx-auto text-status-approved mb-2" />
            <div className="text-xl font-bold text-ink">{summary.totalResumes}</div>
            <div className="text-xs text-ink-muted mt-0.5">Resumes</div>
          </div>
          <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
            <Calendar className="w-5 h-5 mx-auto text-status-review mb-2" />
            <div className="text-xl font-bold text-ink">{summary.totalEvents}</div>
            <div className="text-xs text-ink-muted mt-0.5">Events Hosted</div>
          </div>
          <div className="p-4 rounded-lg bg-surface-sunken border border-edge text-center">
            <Vote className="w-5 h-5 mx-auto text-status-rejected mb-2" />
            <div className="text-xl font-bold text-ink">{summary.totalVotes}</div>
            <div className="text-xs text-ink-muted mt-0.5">Votes Polled</div>
          </div>
        </div>
      </div>
    </div>
  );
};
