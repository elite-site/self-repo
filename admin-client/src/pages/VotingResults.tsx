import React, { useState, useEffect } from 'react';
import { BarChart3, Trophy, Users, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { adminApi } from '../services/api';

interface CandidateResult {
  id: string;
  name: string;
  rollNo: string;
  year: number;
  section: string;
  votes: number;
  percentage: number;
}

interface CampaignResult {
  id: string;
  title: string;
  status: string;
  totalVotes: number;
  totalEligible: number;
  participationRate: number;
  candidates: CandidateResult[];
}

interface CampaignOption {
  id: string;
  title: string;
  status: string;
}

export const VotingResults: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  useEffect(() => {
    adminApi.getVotingCampaigns?.().then((res) => {
      const list = res?.campaigns ?? [];
      setCampaigns(list);
      if (list.length > 0) setSelectedId(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setResult(null);
    adminApi.getVotingResults?.(selectedId)
      .then((res) => setResult(res))
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleFinalize = async () => {
    if (!selectedId) return;
    setFinalizing(true);
    try {
      await adminApi.finalizeVotingResults?.(selectedId);
      setShowFinalizeConfirm(false);
      // Reload
      setLoading(true);
      const res = await adminApi.getVotingResults?.(selectedId);
      setResult(res ?? null);
    } catch { /* noop */ }
    finally { setFinalizing(false); setLoading(false); }
  };

  const maxVotes = result ? Math.max(...result.candidates.map(c => c.votes), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Finalize Confirm Dialog */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-50 bg-on-primary/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-edge rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-status-bg-rejected flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-status-rejected" />
              </div>
              <div>
                <h3 className="font-extrabold text-ink text-base">Finalize Results?</h3>
                <p className="text-xs text-ink-muted mt-0.5">This action is irreversible.</p>
              </div>
            </div>
            <div className="bg-status-bg-rejected border border-edge rounded-xl p-4 text-xs text-status-rejected">
              <strong>Warning:</strong> Finalizing will lock the results permanently. Vote tallies will be published and cannot be changed. This action cannot be undone.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowFinalizeConfirm(false)} className="flex-1 py-2.5 border border-edge rounded-lg text-xs font-bold text-ink-secondary hover:bg-surface-sunken cursor-pointer">
                Cancel
              </button>
              <button onClick={handleFinalize} disabled={finalizing} className="flex-1 py-2.5 bg-status-rejected text-on-primary rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
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
            <h1 className="text-xl font-extrabold text-ink">Voting Results</h1>
            <p className="text-xs text-ink-muted">Live and final vote tallies</p>
          </div>
        </div>
        {campaigns.length > 0 && (
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="text-sm border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected text-ink bg-surface font-semibold">
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-surface rounded-2xl border border-edge">
          <Loader2 className="w-8 h-8 animate-spin text-status-rejected" />
        </div>
      ) : !result ? (
        <div className="flex flex-col items-center justify-center h-64 bg-surface rounded-2xl border border-edge gap-3">
          <BarChart3 className="w-10 h-10 text-ink-muted" />
          <p className="text-sm text-ink-muted">No results to display</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Votes Cast', value: result.totalVotes, icon: Trophy },
              { label: 'Eligible Voters', value: result.totalEligible, icon: Users },
              { label: 'Participation Rate', value: `${Math.round(result.participationRate)}%`, icon: BarChart3 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-surface rounded-2xl border border-edge p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-status-bg-rejected text-status-rejected flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-ink">{value}</div>
                  <div className="text-xs text-ink-muted">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Results bars */}
          <div className="bg-surface rounded-2xl border border-edge p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-extrabold text-ink uppercase tracking-wide">Candidate Results</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${result.status === 'FINALIZED' ? 'bg-status-bg-approved text-status-approved' : result.status === 'ACTIVE' ? 'bg-status-bg-approved text-status-approved' : 'bg-status-bg-pending text-status-pending'}`}>
                {result.status === 'FINALIZED' ? '✓ Finalized' : result.status === 'ACTIVE' ? '● Live' : result.status}
              </span>
            </div>
            {[...result.candidates]
              .sort((a, b) => b.votes - a.votes)
              .map((c, i) => (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-award-gold text-on-primary' : i === 1 ? 'bg-surface-inset text-ink' : i === 2 ? 'bg-award-bronze text-on-primary' : 'bg-surface-sunken text-ink-muted'}`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{c.name}</div>
                        <div className="text-xs text-ink-muted">{c.rollNo} · Year {c.year} {c.section}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-ink">{c.votes}</div>
                      <div className="text-xs text-ink-muted">{c.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-status-rejected' : 'bg-surface-inverse/40'}`}
                      style={{ width: `${(c.votes / maxVotes) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>

          {/* Finalize button */}
          {result.status === 'CLOSED' && (
            <div className="bg-status-bg-pending border border-edge rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink">Campaign closed. Ready to finalize?</p>
                <p className="text-xs text-status-pending mt-0.5">Finalizing will permanently lock and publish the results.</p>
              </div>
              <button onClick={() => setShowFinalizeConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-surface-inverse text-ink-inverse rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer">
                <CheckCircle className="w-4 h-4" /> Finalize Results
              </button>
            </div>
          )}
          {result.status === 'FINALIZED' && (
            <div className="bg-status-bg-approved border border-edge rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-status-approved" />
              <p className="text-sm font-semibold text-ink">Results have been finalized and are now official.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
