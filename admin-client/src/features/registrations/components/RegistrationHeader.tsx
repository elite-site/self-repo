import React from 'react';
import { Layers, Users, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { RegistrationStats } from '../types';

export interface RegistrationHeaderProps {
  activeView: 'table' | 'teams';
  stats: RegistrationStats;
  loading: boolean;
  teamsLoading: boolean;
  actionError: string | null;
  teamsError: string | null;
  setActiveView: (view: 'table' | 'teams') => void;
  setPage: (page: number) => void;
  onRefresh: () => void;
  onExport: () => void;
  onDismissError: () => void;
}

export const RegistrationHeader: React.FC<RegistrationHeaderProps> = ({
  activeView,
  stats,
  loading,
  teamsLoading,
  actionError,
  teamsError,
  setActiveView,
  setPage,
  onRefresh,
  onExport,
  onDismissError,
}) => {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-lg border border-edge shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-status-bg-rejected text-status-rejected flex items-center justify-center shrink-0 border border-edge">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-ink">Event Registrations</h1>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase rounded bg-surface-sunken text-ink-secondary">
                ADM-08 / ADM-09
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Operational participant management, custom questionnaire review, and team administration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-surface-sunken p-1 rounded-xl border border-edge">
            <button
              onClick={() => { setActiveView('table'); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeView === 'table' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Registrations</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-surface-inset">{stats.total}</span>
            </button>
            <button
              onClick={() => { setActiveView('teams'); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeView === 'teams' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team View</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-surface-inset">{stats.totalTeams ?? 0}</span>
            </button>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh list"
            className="p-2 border border-edge rounded-xl hover:bg-surface-sunken text-ink-secondary transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading || teamsLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-inverse text-ink-inverse hover:opacity-90 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {(actionError || teamsError) && (
        <div className="flex items-center justify-between gap-3 p-3.5 bg-status-bg-rejected border border-edge-strong rounded-xl text-status-rejected text-xs" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError || teamsError}</span>
          </div>
          <button onClick={onDismissError} className="font-bold underline cursor-pointer shrink-0">
            Dismiss
          </button>
        </div>
      )}
    </>
  );
};
