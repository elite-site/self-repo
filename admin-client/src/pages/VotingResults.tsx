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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-[#E2E8F0] dark:border-neutral-800 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0B192C] dark:text-white text-base">Finalize Results?</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">This action is irreversible.</p>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 text-xs text-red-700 dark:text-red-300">
              <strong>Warning:</strong> Finalizing will lock the results permanently. Vote tallies will be published and cannot be changed. This action cannot be undone.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowFinalizeConfirm(false)} className="flex-1 py-2.5 border border-[#E2E8F0] dark:border-neutral-700 rounded-lg text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleFinalize} disabled={finalizing} className="flex-1 py-2.5 bg-[#DC2626] text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {finalizing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, Finalize
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-[#DC2626]" />
          <div>
            <h1 className="text-xl font-extrabold text-[#0B192C] dark:text-white">Voting Results</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Live and final vote tallies</p>
          </div>
        </div>
        {campaigns.length > 0 && (
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="text-sm border border-[#E2E8F0] dark:border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626] text-[#0B192C] dark:text-white bg-white dark:bg-neutral-800 font-semibold">
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800">
          <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
        </div>
      ) : !result ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800 gap-3">
          <BarChart3 className="w-10 h-10 text-neutral-200 dark:text-neutral-700" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No results to display</p>
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
              <div key={label} className="bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800 p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#DC2626] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#0B192C] dark:text-white">{value}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Results bars */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-extrabold text-[#0B192C] dark:text-white uppercase tracking-wide">Candidate Results</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${result.status === 'FINALIZED' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : result.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'}`}>
                {result.status === 'FINALIZED' ? '✓ Finalized' : result.status === 'ACTIVE' ? '● Live' : result.status}
              </span>
            </div>
            {result.candidates
              .sort((a, b) => b.votes - a.votes)
              .map((c, i) => (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-[#0B192C]' : i === 2 ? 'bg-amber-700 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'}`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#0B192C] dark:text-white">{c.name}</div>
                        <div className="text-xs text-neutral-400 dark:text-neutral-500">{c.rollNo} · Year {c.year} {c.section}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-[#0B192C] dark:text-white">{c.votes}</div>
                      <div className="text-xs text-neutral-400 dark:text-neutral-500">{c.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-[#DC2626]' : 'bg-[#0B192C]/40 dark:bg-neutral-600'}`}
                      style={{ width: `${(c.votes / maxVotes) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>

          {/* Finalize button */}
          {result.status === 'CLOSED' && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Campaign closed — ready to finalize?</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Finalizing will permanently lock and publish the results.</p>
              </div>
              <button onClick={() => setShowFinalizeConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0B192C] dark:bg-white text-white dark:text-neutral-900 rounded-lg text-xs font-bold hover:bg-[#0B192C]/90 dark:hover:bg-neutral-100 cursor-pointer">
                <CheckCircle className="w-4 h-4" /> Finalize Results
              </button>
            </div>
          )}
          {result.status === 'FINALIZED' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Results have been finalized and are now official.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

