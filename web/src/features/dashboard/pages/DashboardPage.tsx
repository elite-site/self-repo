import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowRight, Clock } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { RadialRing } from '@/shared/ui/RadialRing';
import { MetricTile } from '@/shared/ui/MetricTile';
import { ErrorState } from '@/shared/ui/ErrorState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
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
      {/* 1. ASYMMETRICAL TOP ARCHITECTURE (Featured Hero + Key Stats + Accent Priority Block) */}
      <motion.div variants={staggerItem}>
        <AsymGrid>
          <AsymFeatured cols="8">
            {/* HERO SPOTLIGHT CARD */}
            <Card className="rounded-2xl p-6 sm:p-8 bg-surface border border-edge shadow-xs transition-all duration-quick hover:shadow-md card-lift">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
                <div className="shrink-0 flex items-center justify-center sm:justify-start">
                  <RadialRing
                    value={completionPercentage}
                    size={110}
                    strokeWidth={9}
                    className="text-brand"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-heading text-headline-md sm:text-headline-lg font-bold text-ink tabular-nums leading-none">
                        {completionPercentage}%
                      </span>
                    </div>
                  </RadialRing>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <h1 className="font-heading text-headline-lg sm:text-headline-xl font-bold text-ink tracking-tight">
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

            {/* GitHub connection banner (if active) */}
            {showGithubBanner && (
              <DashboardGithubBanner onSnooze={handleSnoozeGithub} />
            )}

            {profileError && (
              <ErrorState
                title="We could not load your profile"
                message={profileError}
                onRetry={() => refetch()}
              />
            )}
          </AsymFeatured>

          <AsymSide cols="4">
            {/* STATS & ACCENT HIGHLIGHT BLOCK */}
            <div className="flex flex-col gap-4">
              <MetricTile
                icon={<Clock size={18} aria-hidden="true" />}
                label="Course Progress:"
                value={courseProgress.value}
                suffix={courseProgress.suffix}
                subLabel={courseProgress.subLabel}
                to="/learning"
              />
              {(dashboardData as any)?.codechef?.connected && (
                <CodeChefDashboardCard data={(dashboardData as any).codechef} />
              )}

              {/* ACCENT HIGHLIGHT BLOCK */}
              <AsymAccent>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand">Placement Priority</span>
                  <span className="badge badge-brand text-[11px]">Spotlight</span>
                </div>
                <p className="text-body-xs font-medium text-ink-secondary">
                  Keep your skills, resume, and showcase projects up to date for upcoming campus hiring.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    to="/resume"
                    className="btn btn-primary text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1"
                  >
                    Update Resume
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                  <Link
                    to="/portfolio"
                    className="btn btn-secondary text-xs px-3 py-1.5 rounded-full"
                  >
                    Portfolio
                  </Link>
                </div>
              </AsymAccent>
            </div>
          </AsymSide>
        </AsymGrid>
      </motion.div>

      {/* QUICK ACTIONS CAROUSEL */}
      <motion.div variants={staggerItem}>
        <DashboardQuickActions actions={quickActions} />
      </motion.div>

      {/* 2. MASONRY LAYOUT FOR REPEATING CONTENT & WORKFLOW PANELS */}
      <motion.div variants={staggerItem}>
        <MasonryGrid cols={3}>
          <MasonryItem>
            <DashboardLearningCard className="rounded-2xl" />
          </MasonryItem>

          <MasonryItem>
            <DashboardTaskBoard tasks={tasks} />
          </MasonryItem>

          <MasonryItem>
            <DashboardActivityFeed
              notifications={notifications}
              error={notifError}
              onRetry={() => refetch()}
              onNotificationClick={handleNotificationClick}
              onClearAll={handleClearAllNotifications}
              clearing={clearingNotifs}
            />
          </MasonryItem>

          <MasonryItem>
            <DashboardSidebar
              events={upcomingEvents}
              registrations={registrations}
              eventsError={eventsError}
              votingCampaigns={votingCampaigns}
              votingError={votingError}
              onRetry={() => refetch()}
            />
          </MasonryItem>
        </MasonryGrid>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
