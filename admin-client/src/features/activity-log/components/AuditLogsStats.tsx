import React from 'react';
import { ActivityStats } from '../types';

interface AuditLogsStatsProps {
  stats: ActivityStats;
}

export const AuditLogsStats: React.FC<AuditLogsStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-ink-muted block mb-1">
          Total Logged Events
        </span>
        <div className="text-2xl font-semibold text-ink">
          {stats.totalActivities.toLocaleString()}
        </div>
      </div>

      <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-ink-muted block mb-1">
          Admin Operations
        </span>
        <div className="text-2xl font-semibold text-status-approved">
          {stats.adminActions} Actions
        </div>
      </div>

      <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-ink-muted block mb-1">
          System Reliability
        </span>
        <div className="text-2xl font-semibold text-status-approved">
          {stats.successRate}% Success
        </div>
      </div>

      <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-ink-muted block mb-1">
          Errors / Anomalies
        </span>
        <div className="text-2xl font-semibold text-status-rejected">
          {stats.errorsCount} Recorded
        </div>
      </div>

      <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-ink-muted block mb-1">
          Applications Today
        </span>
        <div className="text-2xl font-semibold text-status-review">
          {stats.applicationsToday} Received
        </div>
      </div>
    </div>
  );
};
