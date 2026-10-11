import React from 'react';
import { useParams } from 'react-router-dom';
import { Vote, AlertCircle } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
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
    <div className="space-y-6 text-left page-enter" role="main">
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
            <VotingCard key={c.id} campaign={c} onOpenVote={handleOpenVote} />
          ))}
        </div>
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
