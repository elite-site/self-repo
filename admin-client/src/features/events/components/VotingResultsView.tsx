import React from 'react';
import { BarChart3, Trophy, Users, CheckCircle } from 'lucide-react';
import { CampaignResult } from '../types';

export interface VotingResultsViewProps {
  result: CampaignResult;
  onShowFinalizeConfirm: () => void;
}

export const VotingResultsView: React.FC<VotingResultsViewProps> = ({
  result,
  onShowFinalizeConfirm,
}) => {
  const candidates = result?.candidates || [];
  const maxVotes = Math.max(...candidates.map(c => c.votes), 1);

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Votes Cast', value: result.totalVotes ?? 0, icon: Trophy },
          { label: 'Eligible Voters', value: result.totalEligible ?? 0, icon: Users },
          { label: 'Participation Rate', value: `${Math.round(result.participationRate ?? 0)}%`, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface rounded-lg border border-edge p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-status-bg-rejected text-status-rejected flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-ink">{value}</div>
              <div className="text-xs text-ink-muted">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Results bars */}
      <div className="bg-surface rounded-lg border border-edge p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-ink">Candidate Results</h3>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              result.status === 'FINALIZED'
                ? 'bg-status-bg-approved text-status-approved'
                : result.status === 'ACTIVE'
                ? 'bg-status-bg-approved text-status-approved'
                : 'bg-status-bg-pending text-status-pending'
            }`}
          >
            {result.status === 'FINALIZED' ? '✓ Finalized' : result.status === 'ACTIVE' ? '● Live' : result.status}
          </span>
        </div>
        {candidates.length === 0 ? (
          <div className="p-8 text-center bg-surface-sunken rounded-lg border border-edge">
            <Trophy className="w-8 h-8 text-ink-muted mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink">No candidates registered</p>
            <p className="text-xs text-ink-muted mt-1">This voting campaign does not have any candidates listed yet.</p>
          </div>
        ) : (
          [...candidates]
            .sort((a, b) => b.votes - a.votes)
          .map((c, i) => (
            <div key={c.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0
                        ? 'bg-award-gold text-on-primary'
                        : i === 1
                        ? 'bg-surface-inset text-ink'
                        : i === 2
                        ? 'bg-award-bronze text-on-primary'
                        : 'bg-surface-sunken text-ink-muted'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">{c.name}</div>
                    <div className="text-xs text-ink-muted">{c.rollNo} · Year {c.year} {c.section}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-ink">{c.votes}</div>
                  <div className="text-xs text-ink-muted">{c.percentage.toFixed(1)}%</div>
                </div>
              </div>
              <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    i === 0 ? 'bg-status-rejected' : 'bg-surface-inverse/40'
                  }`}
                  style={{ width: `${(c.votes / maxVotes) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Finalize button */}
      {result.status === 'CLOSED' && (
        <div className="bg-status-bg-pending border border-edge rounded-lg p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-ink">Campaign closed. Ready to finalize?</p>
            <p className="text-xs text-status-pending mt-0.5">Finalizing will permanently lock and publish the results.</p>
          </div>
          <button
            onClick={onShowFinalizeConfirm}
            className="flex items-center gap-2 px-4 py-2 bg-surface-inverse text-ink-inverse rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" /> Finalize Results
          </button>
        </div>
      )}
      {result.status === 'FINALIZED' && (
        <div className="bg-status-bg-approved border border-edge rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-status-approved" />
          <p className="text-sm font-semibold text-ink">Results have been finalized and are now official.</p>
        </div>
      )}
    </>
  );
};
