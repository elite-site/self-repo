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
        <div className="w-10 h-10 border-3 border-elite-red border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Loading system analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Analytics Unavailable</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{error || 'Could not retrieve statistics.'}</p>
        <button
          onClick={() => loadAnalytics(true)}
          className="px-4 py-2 bg-elite-red text-white text-sm font-semibold rounded-lg hover:bg-elite-red-dark transition-colors inline-flex items-center gap-2"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            System Intelligence & Analytics
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Aggregated cross-module performance metrics, submissions, and portfolio growth.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:inline">
            Updated {new Date(data.timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-elite-red' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Enrolled Students
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
              {summary.totalStudents.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {profileRate}% active profiles
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {summary.totalProfiles} students have customized their profiles
          </p>
        </div>

        {/* Submissions & Rated */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Submissions Received
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
              {summary.totalSubmissions.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {submissionRate}% cohort yield
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {summary.totalRated} submissions evaluated by faculty
          </p>
        </div>

        {/* Events & Registrations */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Event Participation
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
              {summary.totalRegistrations.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
              across {summary.totalEvents} events
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {summary.totalVotes} student votes logged in democracy campaigns
          </p>
        </div>

        {/* Portfolio Assets & Moderation */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Portfolio Assets
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
              {(summary.totalProjects + summary.totalAchievements + summary.totalCertificates).toLocaleString()}
            </span>
            {summary.pendingModeration > 0 ? (
              <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-full animate-pulse">
                {summary.pendingModeration} pending
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                100% verified
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {summary.totalResumes} resumes indexed in storage
          </p>
        </div>
      </div>

      {/* Two Column Section: Quality Ratings & Year Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Breakdown Card */}
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Evaluation Quality Breakdown
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Faculty ratings distribution across evaluated submissions
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full">
              {ratingTotal} Rated
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Good */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  GOOD (Exemplary Delivery)
                </span>
                <span className="text-neutral-700 dark:text-neutral-300 font-bold">
                  {ratings.good} ({goodPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${goodPct}%` }}
                />
              </div>
            </div>

            {/* Average */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  AVERAGE (Satisfactory Effort)
                </span>
                <span className="text-neutral-700 dark:text-neutral-300 font-bold">
                  {ratings.average} ({avgPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${avgPct}%` }}
                />
              </div>
            </div>

            {/* Poor */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  POOR (Needs Re-submission)
                </span>
                <span className="text-neutral-700 dark:text-neutral-300 font-bold">
                  {ratings.poor} ({poorPct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${poorPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Unrated pending review:</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {Math.max(0, summary.totalSubmissions - summary.totalRated)} submissions
            </span>
          </div>
        </div>

        {/* Year Distribution Card */}
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-elite-red" />
                Submission Yield By Academic Year
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Distribution of uploaded videos across cohort years
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full">
              {summary.totalSubmissions} Total
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {yearDistribution.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 py-6 text-center">No submissions recorded yet</p>
            ) : (
              yearDistribution.map((y) => {
                const pct = summary.totalSubmissions > 0
                  ? Math.round((y.count / summary.totalSubmissions) * 100)
                  : 0;
                return (
                  <div key={y.year}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-neutral-800 dark:text-neutral-200">
                        Year {y.year} Students
                      </span>
                      <span className="text-neutral-600 dark:text-neutral-400 font-mono">
                        {y.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-elite-red rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Active Academic Cohort:</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              Department of Information Technology
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Platform Matrix */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-emerald-500" />
          Cross-Module Asset & Engagement Index
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-center">
            <FolderGit2 className="w-5 h-5 mx-auto text-indigo-500 mb-2" />
            <div className="text-xl font-bold text-neutral-900 dark:text-white">{summary.totalProjects}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Projects</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-center">
            <Award className="w-5 h-5 mx-auto text-amber-500 mb-2" />
            <div className="text-xl font-bold text-neutral-900 dark:text-white">{summary.totalAchievements}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Achievements</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-center">
            <CheckCircle className="w-5 h-5 mx-auto text-emerald-500 mb-2" />
            <div className="text-xl font-bold text-neutral-900 dark:text-white">{summary.totalCertificates}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Certificates</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-center">
            <FileText className="w-5 h-5 mx-auto text-blue-500 mb-2" />
            <div className="text-xl font-bold text-neutral-900 dark:text-white">{summary.totalResumes}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Resumes</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-center">
            <Calendar className="w-5 h-5 mx-auto text-purple-500 mb-2" />
            <div className="text-xl font-bold text-neutral-900 dark:text-white">{summary.totalEvents}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Events Hosted</div>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-center">
            <Vote className="w-5 h-5 mx-auto text-rose-500 mb-2" />
            <div className="text-xl font-bold text-neutral-900 dark:text-white">{summary.totalVotes}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Votes Polled</div>
          </div>
        </div>
      </div>
    </div>
  );
};
