import React from 'react';
import { Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { GithubOverview } from '../types';

interface GithubMetricsCardsProps {
  overview: GithubOverview;
}

export const GithubMetricsCards: React.FC<GithubMetricsCardsProps> = ({ overview }) => {
  const accounts = overview.accounts || [];
  const activeSyncs = accounts.filter((a) => a.syncStatus === 'COMPLETED').length;
  const syncErrors = accounts.filter((a) => a.syncStatus === 'FAILED').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
      <div className="surface p-5 rounded-xl border border-edge shadow-xs card-hover">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand-soft-text flex items-center justify-center border border-brand/20">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold">Connected Accounts</p>
            <p className="text-2xl font-bold text-ink mt-0.5 tabular-nums">{overview.total || 0}</p>
          </div>
        </div>
      </div>

      <div className="surface p-5 rounded-xl border border-edge shadow-xs card-hover">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-status-approved/10 text-status-approved flex items-center justify-center border border-status-approved/20">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold">Active Syncs</p>
            <p className="text-2xl font-bold text-ink mt-0.5 tabular-nums">{activeSyncs}</p>
          </div>
        </div>
      </div>

      <div className="surface p-5 rounded-xl border border-edge shadow-xs card-hover">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-status-rejected/10 text-status-rejected flex items-center justify-center border border-status-rejected/20">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold">Sync Errors</p>
            <p className="text-2xl font-bold text-ink mt-0.5 tabular-nums">{syncErrors}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GithubMetricsCards;
