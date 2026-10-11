import React from 'react';
import { BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import { useVotingResults } from '../hooks/useVotingResults';
import { VotingResultsView } from '../components/VotingResultsView';

export const VotingResultsPage: React.FC = () => {
  const {
    campaigns,
    selectedId,
    setSelectedId,
    result,
    loading,
    finalizing,
    showFinalizeConfirm,
    setShowFinalizeConfirm,
    handleFinalize,
  } = useVotingResults();

  return (
    <div className="space-y-6">
      {/* Finalize Confirm Dialog */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-50 bg-scrim flex items-center justify-center p-4">
          <div className="bg-surface text-ink border border-edge rounded-lg shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-status-bg-rejected flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-status-rejected" />
              </div>
              <div>
                <h3 className="font-semibold text-ink text-base">Finalize Results?</h3>
                <p className="text-xs text-ink-muted mt-0.5">This action is irreversible.</p>
              </div>
            </div>
            <div className="bg-status-bg-rejected border border-edge rounded-xl p-4 text-xs text-status-rejected">
              <strong>Warning:</strong> Finalizing will lock the results permanently. Vote tallies will be published and cannot be changed. This action cannot be undone.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                className="flex-1 py-2.5 border border-edge rounded-lg text-xs font-bold text-ink-secondary hover:bg-surface-sunken cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="flex-1 py-2.5 bg-status-rejected text-on-primary rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {finalizing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, Finalize
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-status-rejected" />
          <div>
            <h1 className="text-xl font-semibold text-ink">Voting Results</h1>
            <p className="text-xs text-ink-muted">Live and final vote tallies</p>
          </div>
        </div>
        {campaigns.length > 0 && (
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="text-sm border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected text-ink bg-surface font-semibold cursor-pointer"
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-surface rounded-lg border border-edge">
          <Loader2 className="w-8 h-8 animate-spin text-status-rejected" />
        </div>
      ) : !result ? (
        <div className="flex flex-col items-center justify-center h-64 bg-surface rounded-lg border border-edge gap-3">
          <BarChart3 className="w-10 h-10 text-ink-muted" />
          <p className="text-sm text-ink-muted">No results to display</p>
        </div>
      ) : (
        <VotingResultsView
          result={result}
          onShowFinalizeConfirm={() => setShowFinalizeConfirm(true)}
        />
      )}
    </div>
  );
};

export default VotingResultsPage;
