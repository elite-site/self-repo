import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, ShieldCheck, Loader2, X } from 'lucide-react';
import { resolveMediaUrl } from '@/shared/api';
import { VotingCampaign } from '../types';

interface VoteModalProps {
  campaign: VotingCampaign | null;
  selectedCandidateId: string | null;
  submittingVote: boolean;
  voteSuccess: boolean;
  voteError: string | null;
  onSelectCandidate: (id: string) => void;
  onClose: () => void;
  onCastVote: () => void;
}

export const VoteModal: React.FC<VoteModalProps> = ({
  campaign,
  selectedCandidateId,
  submittingVote,
  voteSuccess,
  voteError,
  onSelectCandidate,
  onClose,
  onCastVote,
}) => {
  if (!campaign) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voting-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submittingVote) onClose();
      }}
    >
      <div
        className="surface bg-surface text-ink max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge animate-scale-in text-left my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-edge">
          <div>
            <h3 id="voting-modal-title" className="text-body-md font-bold text-ink font-heading">
              {campaign.title}
            </h3>
            <p className="text-label-sm text-ink-secondary">Select one candidate to cast your secure democratic ballot</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors"
            aria-label="Close voting modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {voteSuccess ? (
          <div className="py-8 text-center space-y-3" role="status" aria-live="polite">
            <CheckCircle2 className="w-12 h-12 text-status-approved mx-auto" aria-hidden="true" />
            <h4 className="text-body-md font-bold text-ink font-heading">Your ballot has been cast</h4>
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

            <div className="space-y-2.5 max-h-[40dvh] overflow-y-auto pr-1" role="radiogroup" aria-label="Candidates">
              {!campaign.candidates || campaign.candidates.length === 0 ? (
                <div className="text-center py-6 text-body-sm text-ink-muted">
                  No candidates registered for this ballot yet.
                </div>
              ) : (
                campaign.candidates.map((cand) => {
                  const isSelected = selectedCandidateId === cand.id;
                  const studentName = cand.student?.name || cand.name || 'Candidate';
                  const rollNo = cand.student?.rollNo || cand.rollNo || '';
                  const candPhoto = cand.photoUrl || cand.student?.profile?.photoUrl;
                  return (
                    <div
                      key={cand.id}
                      onClick={() => onSelectCandidate(cand.id)}
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
                          onSelectCandidate(cand.id);
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
                <button type="button" onClick={onClose} className="btn btn-ghost">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingVote || !selectedCandidateId}
                  onClick={onCastVote}
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
  );
};
