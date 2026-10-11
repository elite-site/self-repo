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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="surface p-5 rounded-2xl border border-edge">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand/10 text-brand">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold">Connected Accounts</p>
            <p className="text-2xl font-bold text-ink mt-0.5">{overview.total || 0}</p>
          </div>
        </div>
      </div>

      <div className="surface p-5 rounded-2xl border border-edge">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold">Active Syncs</p>
            <p className="text-2xl font-bold text-ink mt-0.5">{activeSyncs}</p>
          </div>
        </div>
      </div>

      <div className="surface p-5 rounded-2xl border border-edge">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold">Sync Errors</p>
            <p className="text-2xl font-bold text-ink mt-0.5">{syncErrors}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
