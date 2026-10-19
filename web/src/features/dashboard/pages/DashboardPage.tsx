import React from 'react';
import { motion } from 'framer-motion';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { selectVariantsByName } from '@/shared/lib/motion';
import { useDashboard } from '../hooks/useDashboard';
import {
  DashboardSkeleton,
  DashboardHeader,
  ProfileCompletionCard,
  QuickActions,
  ResumeLearningCard,
  SetupBoard,
  UpcomingEvents,
  DashboardGithubBanner,
  DashboardActivityFeed,
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
    <div className="relative min-h-[100dvh] overflow-x-hidden text-white bg-black">
      {/* Soft purple-red ambient corner glows */}
      <div className="ambient-glow-blob-1" aria-hidden="true" />
      <div className="ambient-glow-blob-2" aria-hidden="true" />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-[1400px] p-4 sm:p-6 space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* 1. Header row: greeting + context on left, public showcase on right */}
        <motion.div variants={staggerItem}>
          <DashboardHeader
            greeting={greeting}
            firstName={firstName}
            profile={profile}
            profileError={profileError}
            contextLine={contextLine}
          />
        </motion.div>

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

        {/* 2. Profile completion card (full width) */}
        <motion.div variants={staggerItem}>
          <ProfileCompletionCard
            tasks={tasks}
            completedCount={completedCount}
            completionPercentage={completionPercentage}
            remainingItems={remainingItems}
            nextMissing={nextMissing}
            isComplete={isComplete}
          />
        </motion.div>

        {/* 3. Six quick-action cards */}
        <motion.div variants={staggerItem}>
          <QuickActions actions={quickActions} />
        </motion.div>

        {/* 4, 5, 6. 12-column grid: Left 8 cols (Learning + Setup), Right 4 cols (Upcoming events) */}
        <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6 min-w-0">
            <ResumeLearningCard />
            <SetupBoard tasks={tasks} />
            {notifications.length > 0 && (
              <DashboardActivityFeed
                notifications={notifications}
                error={notifError}
                onRetry={() => refetch()}
                onNotificationClick={handleNotificationClick}
              />
            )}
          </div>

          <div className="lg:col-span-4 min-w-0 lg:sticky lg:top-20">
            <UpcomingEvents
              events={upcomingEvents}
              registrations={registrations}
              eventsError={eventsError}
              votingCampaigns={votingCampaigns}
              votingError={votingError}
              onRetry={() => refetch()}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
