import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { selectVariantsByName } from '@/shared/lib/motion';
import { useDashboard } from '../hooks/useDashboard';
import {
  DashboardSkeleton,
  DashboardBanner,
  DashboardLearningCard,
  DashboardGithubBanner,
  DashboardTaskBoard,
  DashboardActivityFeed,
  DashboardSidebar,
  DashboardQuickActions,
} from '../components';

export const DashboardPage: React.FC = () => {
  const {
    dashboardData,
    profile,
    upcomingEvents,
    registrations,
    votingCampaigns,
    notifications,
    isLoading,
    profileError,
    eventsError,
    votingError,
    notifError,
    showGithubBanner,
    tasks,
    completedCount,
    remainingItems,
    nextMissing,
    isComplete,
    completionPercentage,
    firstName,
    contextLine,
    greeting,
    quickActions,
    refetch,
    handleNotificationClick,
    handleSnoozeGithub,
  } = useDashboard();

  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerFastItem');

  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* 1. GREETING */}
      <motion.header
        variants={staggerItem}
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0">
          <h1 className="font-heading text-headline-xl-mobile text-ink sm:text-headline-xl">
            {greeting}, {firstName}{' '}
            <span aria-hidden="true">👋</span>
          </h1>
          {!profileError && <p className="mt-1 text-body-md text-ink-secondary">{contextLine}</p>}
        </div>
        {profile?.rollNo && (
          <Link to={`/students/${profile.rollNo}`} className="btn btn-secondary shrink-0 self-start text-sm">
            <span>Public showcase</span>
            <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </motion.header>

      {showGithubBanner && (
        <motion.div variants={staggerItem}>
          <DashboardGithubBanner onSnooze={handleSnoozeGithub} />
        </motion.div>
      )}

      {profileError && (
        <motion.div variants={staggerItem}>
          <ErrorState
            title="We could not load your profile"
            message={profileError}
            onRetry={() => refetch()}
          />
        </motion.div>
      )}

      {/* 2. QUICK ACTIONS BAR */}
      <motion.div variants={staggerItem}>
        <DashboardQuickActions actions={quickActions} />
      </motion.div>

      {/* 3. MAIN + SIDEBAR */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
        <div className="min-w-0 space-y-6 lg:col-span-2 xl:col-span-3">
          <DashboardBanner
            tasks={tasks}
            completedCount={completedCount}
            completionPercentage={completionPercentage}
            remainingItems={remainingItems}
            nextMissing={nextMissing}
            isComplete={isComplete}
          />

          <DashboardLearningCard />

          <DashboardTaskBoard tasks={tasks} />

          <DashboardActivityFeed
            notifications={notifications}
            error={notifError}
            onRetry={() => refetch()}
            onNotificationClick={handleNotificationClick}
          />
        </div>

        <DashboardSidebar
          events={upcomingEvents}
          registrations={registrations}
          eventsError={eventsError}
          votingCampaigns={votingCampaigns}
          votingError={votingError}
          onRetry={() => refetch()}
        />
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
