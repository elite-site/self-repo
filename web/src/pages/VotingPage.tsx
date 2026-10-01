import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { api, resolveMediaUrl } from '../services/api';
import { Vote, Loader2, Clock, CheckCircle2, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { BrandedLoading } from '../components/BrandedLoading';

export const VotingPage: React.FC = () => {
  // `/voting/:campaignId` is a real route and `getNotificationDestination` emits it,
  // so a "vote now" link must land directly on that ballot rather than the list.
  const { campaignId } = useParams<{ campaignId?: string }>();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voting Dialog State
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Only auto-open for a deep link the user arrived on, not for one they left.
  const deepLinkHandled = useRef(false);

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

  // Open the deep-linked campaign once the list has loaded. Guarded so that a
  // campaign the student dismisses is not immediately reopened by the effect.
  useEffect(() => {
    if (!campaignId || loading || deepLinkHandled.current) return;
    const match = campaigns.find((c: any) => c.id === campaignId);
    if (!match) return;
    deepLinkHandled.current = true;
    setActiveCampaign(match);
    setSelectedCandidateId(null);
    setVoteSuccess(false);
    setVoteError(null);
  }, [campaignId, campaigns, loading]);

  const handleOpenVote = (campaign: any) => {
    deepLinkHandled.current = true;
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

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : 'To be announced');

  if (loading) {
    return (
      <div className="py-20" role="status" aria-live="polite">
        <BrandedLoading fullScreen={false} message="Loading Elections & Ballots..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-black text-ink font-heading">Student Democracy & Voting</h1>
          <p className="text-body-sm text-ink-muted">
            Elections for department class representatives, association executive boards, and student committees
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-lg text-status-rejected text-body-sm flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={loadCampaigns} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="surface text-center py-16 px-4" role="status">
          <Vote className="w-12 h-12 text-ink-muted mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-body-md font-bold text-ink font-heading">No active voting campaigns</h3>
          <p className="text-body-sm text-ink-muted mt-1 max-w-sm mx-auto">
            There are currently no active ballots or candidate elections. Check back when department elections open.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list" aria-label="Voting campaigns">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="surface overflow-hidden hover:border-brand-hover hover:shadow-card-hover transition-colors flex flex-col justify-between text-left"
              role="listitem"
            >
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-body-md font-bold text-ink font-heading">{c.title}</h3>
                  <span className="badge badge-pending flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    Active
                  </span>
                </div>
                <p className="text-body-sm text-ink-secondary leading-relaxed">{c.description}</p>
                <div className="text-label-sm text-ink-muted font-medium">
                  {c.candidates?.length || 0} Candidates running for election
                </div>
              </div>

              <div className="surface-sunken px-6 py-4 border-t border-edge flex items-center justify-between">
                <span className="text-body-sm text-ink-secondary font-medium">
                  Ends {formatDate(c.endDate)}
                </span>
                <button
                  onClick={() => handleOpenVote(c)}
                  className="btn btn-primary"
                  aria-label={`View candidates and vote in ${c.title}`}
                >
                  View Candidates & Vote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VOTE CASTING MODAL */}
      {activeCampaign &&
        createPortal(
          <div
            className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="voting-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !submittingVote) setActiveCampaign(null);
            }}
          >
            <div
              className="surface max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge animate-scale-in text-left my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-edge">
                <div>
                  <h3 id="voting-modal-title" className="text-body-md font-bold text-ink font-heading">{activeCampaign.title}</h3>
                  <p className="text-label-sm text-ink-secondary">Select one candidate to cast your secure democratic ballot</p>
                </div>
                <button
                  onClick={() => setActiveCampaign(null)}
                  className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors"
                  aria-label="Close voting modal"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {voteSuccess ? (
                <div className="py-8 text-center space-y-3" role="status" aria-live="polite">
                  <CheckCircle2 className="w-12 h-12 text-status-approved mx-auto" aria-hidden="true" />
                  <h4 className="text-body-md font-bold text-ink font-heading">Your Ballot Has Been Cast!</h4>
                  <p className="text-body-sm text-ink-secondary">Your vote is securely recorded in the department ledger.</p>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  {voteError && (
                    <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected flex items-center gap-2" role="alert">
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{voteError}</span>
                    </div>
                  )}

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1" role="radiogroup" aria-label="Candidates">
                    {(!activeCampaign.candidates || activeCampaign.candidates.length === 0) ? (
                      <div className="text-center py-6 text-body-sm text-ink-muted">
                        No candidates registered for this ballot yet.
                      </div>
                    ) : (
                      activeCampaign.candidates.map((cand: any) => {
                        const isSelected = selectedCandidateId === cand.id;
                        const studentName = cand.student?.name || cand.name || 'Candidate';
                        const rollNo = cand.student?.rollNo || cand.rollNo || '';
                        const candPhoto = cand.photoUrl || cand.student?.profile?.photoUrl;
                        return (
                          <div
                            key={cand.id}
                            onClick={() => setSelectedCandidateId(cand.id)}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${studentName}${rollNo ? `, ${rollNo}` : ''}${cand.bio ? `, ${cand.bio}` : ''}`}
                            className={`p-3.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'border-brand bg-brand-soft shadow-xs'
                                : 'border-edge hover:border-brand-hover bg-surface'
                            }`}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedCandidateId(cand.id);
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 rounded-full bg-brand text-ink-inverse flex items-center justify-center font-bold text-label-sm shrink-0 font-heading overflow-hidden border border-edge">
                                <span>{studentName.charAt(0)}</span>
                                {candPhoto && (
                                  <img
                                    src={resolveMediaUrl(candPhoto)}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-body-sm text-ink">{studentName}</div>
                                <div className="text-label-xs text-ink-secondary">
                                  {rollNo} {cand.student?.section ? `· Sec ${cand.student.section}` : ''}
                                </div>
                                {cand.bio && (
                                  <p className="text-label-sm text-ink-secondary line-clamp-1 mt-0.5">{cand.bio}</p>
                                )}
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-brand bg-brand' : 'border-edge'
                              }`}
                              aria-hidden="true"
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-ink-inverse" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-edge">
                    <span className="text-label-sm text-ink-muted">
                      Ballots are final and cannot be modified once cast.
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveCampaign(null)}
                        className="btn btn-ghost"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={submittingVote || !selectedCandidateId}
                        onClick={handleCastVote}
                        className="btn btn-danger"
                        aria-pressed={submittingVote}
                      >
                        {submittingVote ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>Cast Ballot</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default VotingPage;
