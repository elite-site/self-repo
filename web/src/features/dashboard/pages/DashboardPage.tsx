import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowRight, Clock } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { RadialRing } from '@/shared/ui/RadialRing';
import { MetricTile } from '@/shared/ui/MetricTile';
import { ErrorState } from '@/shared/ui/ErrorState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { selectVariantsByName } from '@/shared/lib/motion';
import { useDashboard } from '../hooks/useDashboard';
import {
  DashboardSkeleton,
  DashboardLearningCard,
  DashboardGithubBanner,
  DashboardTaskBoard,
  DashboardActivityFeed,
  DashboardSidebar,
  DashboardQuickActions,
} from '../components';
import { CodeChefDashboardCard } from '@/features/codechef';

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
    completionPercentage,
    courseProgress,
    firstName,
    contextLine,
    quickActions,
    refetch,
    handleNotificationClick,
    handleClearAllNotifications,
    clearingNotifs,
    handleSnoozeGithub,
  } = useDashboard();

  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerFastItem');
  const codechefSummary = dashboardData?.codechef;
  const hasCodeChef = Boolean(codechefSummary?.connected);

  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial={false}
      animate="show"
    >
      {/* 1. BALANCED TOP ROW: Hero Spotlight (8 cols) + Placement Priority (4 cols) */}
      <motion.div variants={staggerItem}>
        <AsymGrid>
          <AsymFeatured cols="8">
            <Card className="h-full flex items-center rounded-2xl p-6 sm:p-8 bg-surface border border-edge shadow-xs transition-all duration-quick hover:shadow-md card-lift">
              <div className="flex w-full flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
                <div className="shrink-0 flex items-center justify-center sm:justify-start">
                  <RadialRing
                    value={completionPercentage}
                    size={108}
                    strokeWidth={9}
                    className="text-brand"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-ui text-headline-md sm:text-headline-lg font-bold text-ink tabular-nums leading-none">
                        {completionPercentage}%
                      </span>
                    </div>
                  </RadialRing>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <h1 className="font-ui text-headline-lg-mobile sm:text-headline-lg font-bold text-ink tracking-tight">
                    Welcome back, {firstName}
                  </h1>
                  <p className="text-body-sm sm:text-body-md text-ink-secondary max-w-2xl">
                    {contextLine || 'Welcome to engineering edtech student portal dashboard!'}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Link
                      to="/learning"
                      className="btn btn-primary rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-sm inline-flex items-center gap-2"
                    >
                      <span>{courseProgress.value > 0 ? 'Continue Learning' : 'Explore Courses'}</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>

                    {profile?.rollNo && (
                      <Link
                        to={`/students/${profile.rollNo}`}
                        className="btn btn-secondary rounded-full px-4 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5"
                      >
                        <span>Public showcase</span>
                        <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </AsymFeatured>

          <AsymSide cols="4">
            <AsymAccent className="h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand">Placement Priority</span>
                  <span className="badge badge-brand text-[11px]">Spotlight</span>
                </div>
                <p className="text-body-sm font-medium text-ink-secondary">
                  Keep your skills, resume, and showcase projects up to date for upcoming campus hiring.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  to="/resume"
                  className="btn btn-primary text-xs px-3.5 py-2 rounded-full inline-flex items-center gap-1.5"
                >
                  <span>Update Resume</span>
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
                <Link
                  to="/portfolio"
                  className="btn btn-secondary text-xs px-3.5 py-2 rounded-full"
                >
                  Portfolio
                </Link>
              </div>
            </AsymAccent>
          </AsymSide>
        </AsymGrid>
      </motion.div>

      {/* Conditional status banners */}
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

      {/* 2. KEY METRICS ROW */}
      <motion.div
        variants={staggerItem}
        className={hasCodeChef ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch' : 'grid grid-cols-1 gap-4'}
      >
        <MetricTile
          className="h-full"
          icon={<Clock size={18} aria-hidden="true" />}
          label="Course Progress"
          value={courseProgress.value}
          suffix={courseProgress.suffix}
          subLabel={courseProgress.subLabel}
          to="/learning"
        />
        {hasCodeChef && (
          <CodeChefDashboardCard data={codechefSummary} className="h-full" />
        )}
      </motion.div>

      {/* 3. QUICK ACTIONS CAROUSEL */}
      <motion.div variants={staggerItem}>
        <DashboardQuickActions actions={quickActions} />
      </motion.div>

      {/* 4. RESUME LEARNING SPOTLIGHT */}
      <motion.div variants={staggerItem}>
        <DashboardLearningCard className="rounded-2xl" />
      </motion.div>

      {/* 5. WORKSPACE PANELS & SIDEBAR */}
      <motion.div
        variants={staggerItem}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4 items-start"
      >
        <div className="min-w-0 space-y-6 lg:col-span-2 xl:col-span-3">
          <DashboardTaskBoard tasks={tasks} />

          <DashboardActivityFeed
            notifications={notifications}
            error={notifError}
            onRetry={() => refetch()}
            onNotificationClick={handleNotificationClick}
            onClearAll={handleClearAllNotifications}
            clearing={clearingNotifs}
          />
        </div>

        <div className="min-w-0 lg:col-span-1">
          <DashboardSidebar
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
  );
};

export default DashboardPage;
