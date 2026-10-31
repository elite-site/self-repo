import React from 'react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
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
      <div className="py-10 px-4">
        <CodeChefConnectCard onConnect={connect} connecting={connecting} error={actionError} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
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

      {detailsLoading && !details && (
        <div className="p-8 text-center text-sm text-foreground-muted">Loading rich CodeChef profile details...</div>
      )}

      {details && (
        <>
          <CodeChefSummaryGrid summary={details.summary} />
          <CodeChefRatingChart contests={details.contests} />
          <CodeChefContestTable contests={details.contests} />
          <CodeChefHeatmap heatmap={details.heatmap} />
          <CodeChefTopicsDifficulty difficulty={details.difficulty} topics={details.topics} />
          <CodeChefBadges badges={details.badges} />
        </>
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
