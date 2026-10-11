import React from 'react';
import { Users, Video, Calendar, Award } from 'lucide-react';
import { AnalyticsResponse } from '../types';

interface AnalyticsKpiCardsProps {
  summary: AnalyticsResponse['summary'];
  profileRate: number;
  submissionRate: number;
}

export const AnalyticsKpiCards: React.FC<AnalyticsKpiCardsProps> = ({
  summary,
  profileRate,
  submissionRate,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Students */}
      <div className="p-5 bg-surface border border-edge rounded-xl shadow-sm hover:border-edge-strong transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-muted">
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
          <span className="text-xs font-semibold text-ink-muted">
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
          <span className="text-xs font-semibold text-ink-muted">
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
          <span className="text-xs font-semibold text-ink-muted">
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
  );
};
