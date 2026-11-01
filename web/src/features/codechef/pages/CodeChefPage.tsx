import React from 'react';
import { Star, Award, ShieldCheck, RefreshCw } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
import { useCodeChef } from '../hooks/useCodeChef';
import {
  CodeChefAccountCard,
  CodeChefConnectCard,
  CodeChefVerifyModal,
  CodeChefSummaryGrid,
  CodeChefRatingChart,
  CodeChefContestTable,
  CodeChefHeatmap,
  CodeChefTopicsDifficulty,
  CodeChefBadges,
} from '../components';

export const CodeChefPage: React.FC = () => {
  const {
    status,
    details,
    loading,
    detailsLoading,
    error,
    actionError,
    verifyModalOpen,
    setVerifyModalOpen,
    cooldownText,
    canSync,
    connect,
    connecting,
    verify,
    verifying,
    sync,
    syncing,
    setVisibility,
    disconnect,
    disconnecting,
    refetch,
  } = useCodeChef();

  if (loading) {
    return <SkeletonPage label="Loading CodeChef integration" />;
  }

  if (error && !status) {
    return (
      <div className="py-12">
        <ErrorState title="Unable to load CodeChef details" message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="py-10 px-4 max-w-4xl mx-auto">
        <CodeChefConnectCard onConnect={connect} connecting={connecting} error={actionError} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 page-enter max-w-6xl mx-auto text-left">
      {/* 1. ASYMMETRICAL RATING & BADGES HEADER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <CodeChefAccountCard
            status={status}
            cooldownText={cooldownText}
            canSync={canSync}
            syncing={syncing}
            onSync={sync}
            onOpenVerify={() => setVerifyModalOpen(true)}
            onTogglePublic={setVisibility}
            onDisconnect={disconnect}
            disconnecting={disconnecting}
          />
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <Star size={16} className="text-amber-500 fill-amber-500" aria-hidden="true" />
                  CodeChef Spotlight
                </span>
                <span className={`badge ${status.verified ? 'badge-approved' : 'badge-pending'} text-[11px]`}>
                  {status.verified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Competitive programming rating, contest rank, and badges are highlighted on your student profile.
              </p>
              <div className="space-y-1 pt-1 text-label-xs font-mono text-ink-secondary">
                <div>Handle: <span className="font-bold text-ink">{status.handle}</span></div>
                {status.rating !== undefined && (
                  <div>Rating: <span className="font-bold text-ink">{status.rating} ({status.stars || 1}★)</span></div>
                )}
                <div>Visibility: <span className="text-ink">{status.isPublic ? 'Public' : 'Private'}</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between">
              <button
                type="button"
                onClick={sync}
                disabled={!canSync || syncing}
                className="btn btn-primary text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                <span>{cooldownText || (syncing ? 'Syncing...' : 'Sync CodeChef')}</span>
              </button>
              {!status.verified && (
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(true)}
                  className="btn btn-secondary text-xs px-3 py-1.5 rounded-full"
                >
                  Verify Handle
                </button>
              )}
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {detailsLoading && !details && (
        <div className="p-8 text-center text-sm text-ink-muted surface rounded-2xl border border-edge">
          Loading rich CodeChef profile details...
        </div>
      )}

      {/* 2. MASONRY SUMMARY, CONTESTS & PERFORMANCE BOARDS */}
      {details && (
        <MasonryGrid cols={2}>
          <MasonryItem>
            <CodeChefSummaryGrid summary={details.summary} />
          </MasonryItem>

          <MasonryItem>
            <CodeChefRatingChart contests={details.contests} />
          </MasonryItem>

          <MasonryItem>
            <CodeChefContestTable contests={details.contests} />
          </MasonryItem>

          <MasonryItem>
            <CodeChefTopicsDifficulty difficulty={details.difficulty} topics={details.topics} />
          </MasonryItem>

          <MasonryItem>
            <CodeChefHeatmap heatmap={details.heatmap} />
          </MasonryItem>

          <MasonryItem>
            <CodeChefBadges badges={details.badges} />
          </MasonryItem>
        </MasonryGrid>
      )}

      <CodeChefVerifyModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        verifyCode={status.verifyCode}
        handle={status.handle}
        onVerify={verify}
        verifying={verifying}
        error={actionError}
      />
    </div>
  );
};

export default CodeChefPage;
