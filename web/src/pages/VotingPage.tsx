import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Vote, Loader2, Clock, CheckCircle2, AlertCircle, User, ShieldCheck, X } from 'lucide-react';

export const VotingPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voting Dialog State
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVotingCampaigns();
      if (Array.isArray(data)) setCampaigns(data);
    } catch {
      setError('Could not load active voting campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleOpenVote = (campaign: any) => {
    setActiveCampaign(campaign);
    setSelectedCandidateId(null);
    setVoteSuccess(false);
    setVoteError(null);
  };

  const handleCastVote = async () => {
    if (!activeCampaign || !selectedCandidateId) return;
    setSubmittingVote(true);
    setVoteError(null);

    try {
      await api.castVote(activeCampaign.id, selectedCandidateId);
      setVoteSuccess(true);
      setTimeout(() => {
        setActiveCampaign(null);
        loadCampaigns();
      }, 1500);
    } catch (err: any) {
      setVoteError(err.response?.data?.message || 'Failed to submit vote. You may have already voted.');
    } finally {
      setSubmittingVote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B192C]">Student Democracy & Voting</h1>
          <p className="text-xs text-neutral-500">
            Elections for department class representatives, association executive boards, and student committees
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadCampaigns} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <Vote className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-[#0B192C]">No active voting campaigns</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            There are currently no active ballots or candidate elections. Check back when department elections open.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between text-left"
            >
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-base font-bold text-[#0B192C]">{c.title}</h3>
                  <span className="bg-red-50 text-[#DC2626] px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> Active
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">{c.description}</p>
                <div className="text-[11px] text-neutral-400 font-medium">
                  {c.candidates?.length || 0} Candidates running for election
                </div>
              </div>

              <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-medium">
                  Ends {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Soon'}
                </span>
                <button
                  onClick={() => handleOpenVote(c)}
                  className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  View Candidates & Vote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VOTE CASTING MODAL */}
      {activeCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-[#0B192C]">{activeCampaign.title}</h3>
                <p className="text-[11px] text-neutral-500">Select one candidate to cast your secure democratic ballot</p>
              </div>
              <button
                onClick={() => setActiveCampaign(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {voteSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-[#0B192C]">Your Ballot Has Been Cast!</h4>
                <p className="text-xs text-neutral-500">Your vote is securely recorded in the department ledger.</p>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {voteError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{voteError}</span>
                  </div>
                )}

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {(!activeCampaign.candidates || activeCampaign.candidates.length === 0) ? (
                    <div className="text-center py-6 text-xs text-neutral-400">
                      No candidates registered for this ballot yet.
                    </div>
                  ) : (
                    activeCampaign.candidates.map((cand: any) => {
                      const isSelected = selectedCandidateId === cand.id;
                      const studentName = cand.student?.name || cand.name || 'Candidate';
                      const rollNo = cand.student?.rollNo || cand.rollNo || '';
                      return (
                        <div
                          key={cand.id}
                          onClick={() => setSelectedCandidateId(cand.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-[#DC2626] bg-red-50/50 shadow-xs'
                              : 'border-[#E2E8F0] hover:border-neutral-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0B192C] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {studentName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-[#0B192C]">{studentName}</div>
                              <div className="text-[10px] text-neutral-500 font-mono">
                                {rollNo} {cand.student?.section ? `· Sec ${cand.student.section}` : ''}
                              </div>
                              {cand.bio && (
                                <p className="text-[11px] text-neutral-600 line-clamp-1 mt-0.5">{cand.bio}</p>
                              )}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-[#DC2626] bg-[#DC2626]' : 'border-neutral-300'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
                  <span className="text-[11px] text-neutral-400">
                    Ballots are final and cannot be modified once cast.
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveCampaign(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingVote || !selectedCandidateId}
                      onClick={handleCastVote}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      {submittingVote ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Cast Ballot</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
