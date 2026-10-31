import React from 'react';
import { Users, Link2, ShieldCheck, Flame, AlertTriangle } from 'lucide-react';
import type { CodeChefAdminStatsResponse } from '../types';

interface CodeChefMetricsCardsProps {
  stats?: CodeChefAdminStatsResponse;
  loading: boolean;
}

export const CodeChefMetricsCards: React.FC<CodeChefMetricsCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-surface rounded-xl border border-border" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Connected Students',
      value: `${stats.connectedCount} / ${stats.totalStudents}`,
      sub: `${stats.connectedPercentage}% adoption rate`,
      icon: <Link2 className="w-5 h-5 text-primary" />,
    },
    {
      label: 'Verified Ownership',
      value: stats.verifiedCount.toLocaleString(),
      sub: `${stats.connectedCount > 0 ? Math.round((stats.verifiedCount / stats.connectedCount) * 100) : 0}% of connected`,
      icon: <ShieldCheck className="w-5 h-5 text-success" />,
    },
    {
      label: 'Active This Month',
      value: stats.activeThisMonthCount.toLocaleString(),
      sub: 'Synced within last 30 days',
      icon: <Flame className="w-5 h-5 text-amber-500" />,
    },
    {
      label: 'Stale / Need Sync',
      value: stats.staleCount.toLocaleString(),
      sub: `${stats.errorCount} error accounts`,
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it, idx) => (
          <div key={idx} className="p-4 bg-surface rounded-xl border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-ink-muted">{it.label}</span>
              <div className="p-1.5 rounded-lg bg-surface-muted">{it.icon}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-ink">{it.value}</div>
              <p className="text-xs text-ink-muted mt-0.5">{it.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Star Tier Distribution Strip */}
      <div className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="font-semibold text-ink flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" /> Star Distribution:
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className="font-semibold text-amber-500">{s}★</span>
              <span className="text-ink font-bold">{stats.starsDistribution?.[s] ?? 0}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
