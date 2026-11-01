import React from 'react';
import { useParams } from 'react-router-dom';
import { Vote, AlertCircle, ShieldCheck } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
import { useVoting } from '../hooks/useVoting';
import { VotingCard, VoteModal } from '../components';

export const VotingPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId?: string }>();
  const {
    campaigns,
    loading,
    error,
    activeCampaign,
    selectedCandidateId,
    setSelectedCandidateId,
    submittingVote,
    voteSuccess,
    voteError,
    loadCampaigns,
    handleOpenVote,
    handleCloseVote,
    handleCastVote,
  } = useVoting(campaignId);

  if (loading) {
    return <SkeletonPage label="Loading elections and ballots" cards={2} rows={2} />;
  }

  return (
    <div className="space-y-8 text-left page-enter max-w-6xl mx-auto pb-12" role="main">
      {/* 1. ASYMMETRICAL CAMPAIGN BANNER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <header className="space-y-2">
            <span className="badge badge-brand text-xs font-semibold">Student Democracy</span>
            <h1 className="text-headline-md font-black text-ink font-heading sm:text-headline-lg">
              Department Elections & Voting
            </h1>
            <p className="text-body-md text-ink-secondary max-w-xl">
              Cast your vote for department class representatives, association executive boards, and student committee leaders.
            </p>
          </header>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <ShieldCheck size={16} aria-hidden="true" />
                  Voting Spotlight
                </span>
                <span className="badge badge-brand text-[11px]">
                  {campaigns.length} Active
                </span>
              </div>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Voting is verified and confidential. Each student is eligible for one vote per active election ballot.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-brand/20 text-label-xs text-ink-muted">
              <span>Secure Session Verification</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-2xl text-status-rejected text-body-sm flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={loadCampaigns} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* 2. MASONRY VOTING CAMPAIGNS GRID */}
      {campaigns.length === 0 ? (
        <div className="surface text-center py-16 px-4 rounded-2xl border border-edge" role="status">
          <Vote className="w-12 h-12 text-ink-muted mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-body-md font-bold text-ink font-heading">No active voting campaigns</h3>
          <p className="text-body-sm text-ink-muted mt-1 max-w-sm mx-auto">
            There are currently no active ballots or candidate elections. Check back when department elections open.
          </p>
        </div>
      ) : (
        <MasonryGrid cols={2}>
          {campaigns.map((c) => (
            <MasonryItem key={c.id}>
              <div className="card-lift">
                <VotingCard campaign={c} onOpenVote={handleOpenVote} />
              </div>
            </MasonryItem>
          ))}
        </MasonryGrid>
      )}

      <VoteModal
        campaign={activeCampaign}
        selectedCandidateId={selectedCandidateId}
        submittingVote={submittingVote}
        voteSuccess={voteSuccess}
        voteError={voteError}
        onSelectCandidate={setSelectedCandidateId}
        onClose={handleCloseVote}
        onCastVote={handleCastVote}
      />
    </div>
  );
};

export default VotingPage;
