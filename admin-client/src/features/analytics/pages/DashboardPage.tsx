import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useStats } from '../hooks/useStats';
import { StatsDashboard } from '../components/StatsDashboard';
import { ACTIVE_EVENT_ID } from '@/shared/layout/Sidebar';

export const DashboardPage: React.FC = () => {
  const { stats, loading, error, loadStats } = useStats(ACTIVE_EVENT_ID);
  const navigate = useNavigate();

  if (error && !loading && !stats) {
    return (
      <div className="p-6 max-w-xl mx-auto my-8">
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 text-danger p-5">
          <AlertCircle size={20} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base mb-1">Failed to load statistics</p>
            <p className="text-sm text-ink-secondary">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadStats}
            className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-surface-sunken"
          >
            <RefreshCw size={14} className="animate-spin-once" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <StatsDashboard
      stats={stats}
      loading={loading}
      onNavigateTab={(t) => navigate(t.startsWith('/') ? t : `/admin/${t}`)}
    />
  );
};

export default DashboardPage;
