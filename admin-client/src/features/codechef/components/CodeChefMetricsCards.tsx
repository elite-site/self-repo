import React from 'react';
import { Link2, ShieldCheck, Flame, AlertTriangle } from 'lucide-react';
import type { CodeChefAdminStatsResponse } from '../types';

interface CodeChefMetricsCardsProps {
  stats?: CodeChefAdminStatsResponse;
  loading: boolean;
}

export const CodeChefMetricsCards: React.FC<CodeChefMetricsCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4" aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Connected Students',
      value: `${stats.connectedCount} / ${stats.totalStudents}`,
      sub: `${stats.connectedPercentage}% adoption rate`,
      icon: <Link2 className="w-5 h-5 text-brand" />,
      bg: 'bg-brand-soft border-brand/20',
    },
    {
      label: 'Verified Ownership',
      value: stats.verifiedCount.toLocaleString(),
      sub: `${stats.connectedCount > 0 ? Math.round((stats.verifiedCount / stats.connectedCount) * 100) : 0}% of connected`,
      icon: <ShieldCheck className="w-5 h-5 text-status-approved" />,
      bg: 'bg-status-approved/10 border-status-approved/20',
    },
    {
      label: 'Active This Month',
      value: stats.activeThisMonthCount.toLocaleString(),
      sub: 'Synced within last 30 days',
      icon: <Flame className="w-5 h-5 text-status-pending" />,
      bg: 'bg-status-pending/10 border-status-pending/20',
    },
    {
      label: 'Stale / Need Sync',
      value: stats.staleCount.toLocaleString(),
      sub: `${stats.errorCount} error accounts`,
      icon: <AlertTriangle className="w-5 h-5 text-status-rejected" />,
      bg: 'bg-status-rejected/10 border-status-rejected/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
      {items.map((it, idx) => (
        <div key={idx} className="p-4 bg-surface rounded-xl border border-edge shadow-xs card-hover flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-ink-muted">{it.label}</span>
            <div className={`p-2 rounded-lg border ${it.bg}`}>{it.icon}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink tabular-nums">{it.value}</div>
            <p className="text-xs text-ink-muted mt-0.5">{it.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CodeChefMetricsCards;
