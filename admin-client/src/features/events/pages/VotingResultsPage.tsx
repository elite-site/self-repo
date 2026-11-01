import React from 'react';
import { BarChart3, Loader2, AlertTriangle, Vote, ShieldCheck } from 'lucide-react';
import { useVotingResults } from '../hooks/useVotingResults';
import { VotingResultsView } from '../components/VotingResultsView';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

export const VotingResultsPage: React.FC = () => {
  const {
    campaigns,
    selectedId,
    setSelectedId,
    result,
    isLoading,
    finalizing,
    showFinalizeConfirm,
    setShowFinalizeConfirm,
    handleFinalize,
  } = useVotingResults();

  const isCampaignDataEmpty = !campaigns || campaigns.length === 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Finalize Confirm Dialog */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-4">
          <div className="surface text-ink border border-edge rounded-xl shadow-modal p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-status-rejected/10 flex items-center justify-center border border-status-rejected/20">
                <AlertTriangle className="w-5 h-5 text-status-rejected" />
              </div>
              <div>
                <h3 className="font-semibold text-ink text-base">Finalize Results?</h3>
                <p className="text-xs text-ink-muted mt-0.5">This action is irreversible.</p>
              </div>
            </div>
            <div className="bg-status-rejected/10 border border-status-rejected/30 rounded-xl p-4 text-xs text-status-rejected leading-relaxed">
              <strong>Warning:</strong> Finalizing will lock the results permanently. Vote tallies will be published and cannot be changed. This action cannot be undone.
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowFinalizeConfirm(false)}
                className="btn btn-secondary flex-1 py-2 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizing}
                className="btn btn-primary flex-1 py-2 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer bg-status-rejected text-on-primary hover:bg-status-rejected/90"
              >
                {finalizing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, Finalize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand-soft-text flex items-center justify-center border border-brand/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink font-sans">Voting Results</h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Live turnout analytics and finalized electoral tallies</p>
          </div>
        </div>
        {isLoading ? (
          <div className="skeleton h-10 w-48 rounded-lg" aria-hidden="true" />
        ) : campaigns.length > 0 ? (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="select text-sm font-semibold min-h-[40px] cursor-pointer"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading election results">
          {/* Skeleton Stats row matching 3-card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-surface rounded-xl border border-edge p-5 flex items-center gap-4 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl skeleton shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-7 w-20 rounded" />
                  <div className="skeleton h-3 w-28 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Skeleton Candidate Results Card matching VotingResultsView card */}
          <div className="bg-surface rounded-xl border border-edge p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="skeleton h-5 w-32 rounded" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full skeleton shrink-0" />
                    <div className="space-y-1.5">
                      <div className="skeleton h-4 w-36 rounded" />
                      <div className="skeleton h-3 w-24 rounded" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right flex flex-col items-end">
                    <div className="skeleton h-4 w-10 rounded" />
                    <div className="skeleton h-3 w-12 rounded" />
                  </div>
                </div>
                <div className="h-2 skeleton rounded-full overflow-hidden" />
              </div>
            ))}
          </div>
        </div>
      ) : isCampaignDataEmpty ? (
        <div className="flex flex-col items-center justify-center p-16 surface rounded-xl border border-edge gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted border border-edge">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">No Election Results Available</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-sm">
              There are no voting campaigns currently open or finalized with tallied ballots.
            </p>
          </div>
        </div>
      ) : result ? (
        <div className="space-y-6">
          <VotingResultsView
            result={result}
            onShowFinalizeConfirm={() => setShowFinalizeConfirm(true)}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 surface rounded-xl border border-edge gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted border border-edge">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">Election Results Unavailable</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-sm">
              Could not load the election results for the selected campaign. Please try selecting a different campaign.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingResultsPage;
