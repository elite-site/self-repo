import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  Github,
  Plus,
  User,
  Users,
  Video,
  Vote,
} from 'lucide-react';
import { api } from '../services/api';
import { getNotificationDestination, navigateToNotification } from '../utils/notificationRouting';
import { formatContentStatus } from '../utils/status';
import {
  StudentDashboardResponse,
  StudentProfile,
  Notification,
} from '../types';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { selectVariantsByName } from '../lib/motion';
import {
  DashboardTaskBoard,
  DashboardTaskBoardSkeleton,
  type DashboardTask,
  type DashboardTone,
} from './DashboardTaskBoard';

/**
 * The dashboard, rebuilt to REDESIGN_PLAN §6.2.
 *
 * The plan asks for a Kanban board, a streak tracker and per-card "Complete"
 * actions. Two of those three have no endpoint behind them — there is no streak
 * anywhere in the API and no mutation that completes a profile section from the
 * dashboard — so they are absent rather than faked (§2.4). What the board shows
 * is real: the same six profile sections the completion banner has always
 * counted, grouped by where each one actually is.
 */

/**
 * Moderation state of the introduction video, phrased for the student rather
 * than in the enum's own words. Kept identical to `ProfilePage` so the same
 * status never reads two different ways in two places.
 */
const VIDEO_STATUS: Record<string, { tone: DashboardTone; label: string }> = {
  APPROVED: { tone: 'badge-approved', label: 'Approved' },
  SUBMITTED: { tone: 'badge-pending', label: 'Under review' },
  CHANGES_REQUESTED: { tone: 'badge-changes', label: 'Changes requested' },
  REJECTED: { tone: 'badge-rejected', label: 'Rejected' },
};

/** `api.getResume()` returns a row or a list depending on how many exist. */
interface DashboardResume {
  driveFileId?: string | null;
  fileUrl?: string | null;
}

/** The API still carries a legacy `biography` column alongside `bio`. */
type DashboardProfile = StudentProfile & { biography?: string | null };

/**
 * The five profile sections that are always present, in the order they are worth
 * doing. The first three are the ones a single visit to `/profile/edit` fixes,
 * which is why the completion banner's chips and the board's "To Do" column
 * agree on which three to lead with.
 */
const SETUP_ITEMS = [
  {
    id: 'photo',
    label: 'Profile photo',
    to: '/profile/edit',
    destination: 'your profile',
    icon: User,
    cta: 'Add photo',
    todo: 'Not added',
    done: 'Added',
    hint: 'A face makes your profile recognisable at a glance.',
  },
  {
    id: 'bio',
    label: 'Biography',
    to: '/profile/edit',
    destination: 'your profile',
    icon: FileText,
    cta: 'Write biography',
    todo: 'Not written',
    done: 'Written',
    hint: 'A few lines on what you build and why.',
  },
  {
    id: 'skills',
    label: 'Technical skills',
    to: '/profile/edit',
    destination: 'your profile',
    icon: Plus,
    cta: 'Add skills',
    todo: 'None listed',
    done: 'Listed',
    hint: 'The tools you work in, so recruiters can search for them.',
  },
  {
    id: 'resume',
    label: 'Resume',
    to: '/resume',
    destination: 'your resume',
    icon: FileText,
    cta: 'Upload resume',
    todo: 'Not uploaded',
    done: 'Uploaded',
    hint: 'One PDF a recruiter can download without asking you.',
  },
  {
    id: 'project',
    label: 'First project',
    to: '/portfolio',
    destination: 'your portfolio',
    icon: FolderOpen,
    cta: 'Add project',
    todo: 'None yet',
    done: 'Added',
    hint: 'One finished project beats an empty portfolio.',
  },
] as const;

/** The dashboard talks to a person, so the greeting follows the clock. */
const greetingFor = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const timeOf = (value: string | undefined) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

/** "SEP" + "15" for the date block on an event row. */
const eventDateParts = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: '2-digit' }),
    full: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' }),
  };
};

const shortDate = (value: string | undefined) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Relative "2d ago" for the activity feed, falling back to a date past a week. */
const relativeTime = (value: string | undefined) => {
  const time = value ? new Date(value).getTime() : NaN;
  if (Number.isNaN(time)) return '';
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value as string).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/**
 * Shaped like the real dashboard so the page does not jump when the data lands:
 * greeting, completion banner, then the board beside the contextual sidebar
 * (§6.2 "Loading State"). A full-screen spinner for a layout we already know is
 * what this replaces.
 */
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true">
    <span className="sr-only" role="status">
      Loading your dashboard
    </span>

    <div className="space-y-2">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>

    <div className="surface p-4 sm:p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-5 w-40 sm:w-48" />
          <Skeleton className="h-3 w-56 sm:w-72" />
        </div>
        <Skeleton className="h-7 w-14 sm:h-9 sm:w-20 shrink-0" />
      </div>
      <Skeleton className="mt-3 sm:mt-4 h-2 w-full rounded-full" />
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <DashboardTaskBoardSkeleton />
        <div className="surface p-5 sm:p-6">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-start gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="surface p-5 sm:p-6">
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="surface p-5 sm:p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((cell) => (
              <Skeleton key={cell} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError: dashboardIsError,
    refetch: refetchDashboard,
  } = useQuery<StudentDashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    staleTime: 60_000,
  });

  const profile = dashboardData?.profile ?? null;
  const profileError = dashboardIsError && !profile ? 'We could not load your profile right now.' : null;
  const resume = dashboardData?.resume ?? null;
  const counts = dashboardData?.counts ?? { projects: 0, achievements: 0, certificates: 0 };
  const events = dashboardData?.events ?? [];
  const eventsError = dashboardIsError && events.length === 0 ? 'We could not load department events right now.' : null;
  const registrations = dashboardData?.registrations ?? [];
  const votingCampaigns = dashboardData?.votingCampaigns ?? [];
  const votingError = dashboardIsError && votingCampaigns.length === 0 ? 'We could not load voting campaigns right now.' : null;
  const notifications: Notification[] = dashboardData?.notifications ?? [];
  const notifError = dashboardIsError && notifications.length === 0 ? 'We could not load your recent activity right now.' : null;
  const github = dashboardData?.github ?? null;

  const markNotificationMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead && n.status !== 'READ') {
      markNotificationMutation.mutate(n.id);
    }

    const destination = getNotificationDestination(n);
    navigateToNotification(destination, navigate);
  };

  const [githubBannerDismissed, setGithubBannerDismissed] = useState(false);

  const isReminderSnoozed = useMemo(() => {
    if (!github) return false;
    if (github.reminderSnoozedUntil) {
      return new Date(github.reminderSnoozedUntil).getTime() > Date.now();
    }
    return false;
  }, [github]);

  const showGithubBanner =
    !githubBannerDismissed &&
    github &&
    !github.connected &&
    !isReminderSnoozed;

  const handleSnoozeGithub = async () => {
    setGithubBannerDismissed(true);
    try {
      await api.snoozeGithubReminder();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      // Optimistic dismiss remains active
    }
  };

  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerFastItem');

  // Compute real profile completion
  const checkPhoto = !!profile?.photoUrl;
  const checkBio = !!(profile?.bio || profile?.biography);
  const checkSkills = !!(profile?.skills && profile.skills.length > 0);
  const effectiveVideoStatus = profile?.video?.status;
  const checkVideo = !!profile?.video;
  const checkResume = !!(resume?.exists || resume?.driveFileId);
  const checkProjects = (counts?.projects ?? 0) > 0;

  const videoStatus = {
    label: formatContentStatus(effectiveVideoStatus),
    tone: (effectiveVideoStatus === 'APPROVED'
      ? 'badge-approved'
      : effectiveVideoStatus === 'CHANGES_REQUESTED'
        ? 'badge-changes'
        : effectiveVideoStatus === 'REJECTED'
          ? 'badge-rejected'
          : effectiveVideoStatus === 'PENDING' || effectiveVideoStatus === 'UNDER_REVIEW'
            ? 'badge-pending'
            : 'badge-draft') as DashboardTone,
  };

  let videoState: 'todo' | 'progress' | 'done' = 'todo';
  if (checkVideo) {
    if (effectiveVideoStatus === 'APPROVED') {
      videoState = 'done';
    } else if (effectiveVideoStatus === 'PENDING' || effectiveVideoStatus === 'UNDER_REVIEW') {
      videoState = 'progress';
    } else {
      // CHANGES_REQUESTED or REJECTED
      videoState = 'todo';
    }
  }

  const completionItems: DashboardTask[] = [
    ...SETUP_ITEMS.map<DashboardTask>((item) => {
      const done =
        item.id === 'photo'
          ? checkPhoto
          : item.id === 'bio'
            ? checkBio
            : item.id === 'skills'
              ? checkSkills
              : item.id === 'resume'
                ? checkResume
                : checkProjects;

      return {
        id: item.id,
        title: item.label,
        hint: item.hint,
        to: item.to,
        destination: item.destination,
        icon: item.icon,
        state: done ? 'done' : 'todo',
        tone: done ? ('badge-approved' as DashboardTone) : ('badge-draft' as DashboardTone),
        badge: done ? item.done : item.todo,
        cta: item.cta,
      };
    }),
    {
      id: 'video',
      title: 'Intro video',
      hint:
        videoState === 'progress'
          ? 'With the moderation team — nothing needed from you.'
          : 'Ninety seconds of you introducing yourself.',
      dateChip:
        videoState === 'progress'
          ? shortDate(profile?.submission?.submittedAt)
            ? `Sent ${shortDate(profile?.submission?.submittedAt)}`
            : undefined
          : undefined,
      to: '/intro-video',
      destination: 'your intro video',
      icon: Video,
      state: videoState,
      tone: videoStatus.tone,
      badge: videoStatus.label,
      cta: 'Upload video',
    },
  ];

  // If a task is in progress (e.g. video under review), the student has done their part.
  const completedCount = completionItems.filter((i) => i.state !== 'todo').length;
  // Only items that actually need student action should block 100% completion banner.
  const remainingItems = completionItems.filter((i) => i.state === 'todo');
  const isComplete = remainingItems.length === 0;
  const completionPercentage = isComplete ? 100 : Math.round((completedCount / completionItems.length) * 100);
  /** §6.2 (2): the three chips on the banner. The board still lists them all. */
  const nextMissing = remainingItems.slice(0, 3);

  // Only the events worth acting on, soonest first.
  const upcomingEvents = [...events].sort((a, b) => timeOf(a.date) - timeOf(b.date)).slice(0, 3);
  const firstName = (profile?.name || 'there').split(' ').filter(Boolean)[0];
  const credentialsCount = (counts?.achievements ?? 0) + (counts?.certificates ?? 0);

  /** §6.2 (1). "Semester 5" has no field behind it — `year` does. */
  const todayLine = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const contextLine = profile?.year ? `${todayLine} · Year ${profile.year}` : todayLine;

  const quickActions = [
    {
      label: 'Upload video',
      hint: videoStatus.label,
      to: '/intro-video',
      icon: Video,
    },
    {
      label: 'Add project',
      hint: `${counts?.projects ?? 0} project${(counts?.projects ?? 0) === 1 ? '' : 's'} · ${credentialsCount} credential${credentialsCount === 1 ? '' : 's'}`,
      to: '/portfolio',
      icon: FolderOpen,
    },
    {
      label: 'Browse events',
      hint: upcomingEvents.length
        ? `${upcomingEvents.length} upcoming`
        : 'Nothing scheduled yet',
      to: '/events',
      icon: Calendar,
    },
    {
      label: 'View team',
      hint: 'Your team workspace',
      to: '/teams',
      icon: Users,
    },
    {
      label: 'Edit profile',
      hint: isComplete ? 'All set' : `${remainingItems.length} step${remainingItems.length === 1 ? '' : 's'} left`,
      to: '/profile/edit',
      icon: User,
    },
    {
      label: 'Resume',
      hint: checkResume ? 'Uploaded' : 'Not uploaded yet',
      to: '/resume',
      icon: FileText,
    },
  ];

  if (dashboardLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* 1. GREETING. The one thing the page has to say before anything else. */}
      <motion.header
        variants={staggerItem}
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0">
          <h1 className="font-heading text-headline-xl-mobile text-ink sm:text-headline-xl">
            {greetingFor(new Date().getHours())}, {firstName}{' '}
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
          <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-brand-soft p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink shadow-sm">
                <Github size={20} />
              </span>
              <div className="space-y-0.5">
                <p className="font-heading text-label-md font-bold text-ink">
                  Build your portfolio with GitHub
                </p>
                <p className="text-body-sm text-ink-secondary">
                  Connect your GitHub to showcase your repositories and skills automatically on your portfolio.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleSnoozeGithub}
                className="btn btn-ghost px-3 py-1.5 text-xs text-ink-secondary hover:text-ink min-h-[38px]"
              >
                Remind me later
              </button>
              <Link
                to="/github"
                className="btn btn-primary px-4 py-1.5 text-xs font-bold min-h-[38px] inline-flex items-center gap-1.5"
              >
                <Github size={14} />
                <span>Connect GitHub</span>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {profileError && (
        <motion.div variants={staggerItem}>
          <ErrorState
            title="We could not load your profile"
            message={profileError}
            onRetry={() => refetchDashboard()}
          />
        </motion.div>
      )}

      {/* 2. QUICK ACTIONS BAR - Top Layer */}
      <motion.section variants={staggerItem} aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="sr-only">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.to + action.label}
              to={action.to}
              className="flex flex-col items-center text-center gap-1.5 sm:gap-2 rounded-xl border border-edge bg-surface p-2.5 sm:p-4 transition-all duration-fast hover:-translate-y-1 hover:border-brand hover:shadow-md"
            >
              <span className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-text">
                <action.icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-heading text-label-xs sm:text-label-md font-bold leading-tight text-ink">
                  {action.label}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* 3. MAIN + SIDEBAR */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
        <div className="min-w-0 space-y-6 lg:col-span-2 xl:col-span-3">
          {/* PROFILE COMPLETION */}
          <Card
            variant="brand"
            className="p-4 sm:p-5 lg:p-6 transition-all duration-normal"
            aria-labelledby="completion-heading"
          >
            {/* Header: Title + Subtitle and Percentage */}
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="completion-heading"
                    className="font-heading text-headline-sm sm:text-headline-md text-ink leading-tight"
                  >
                    Profile completion
                  </h2>
                  {isComplete ? (
                    <span className="badge badge-approved text-xs">Complete</span>
                  ) : (
                    <span className="text-label-xs sm:text-label-sm font-medium text-ink-muted">
                      {completedCount} of {completionItems.length} done
                    </span>
                  )}
                </div>
                <p className="mt-1 text-body-xs sm:text-body-sm text-ink-secondary line-clamp-2 sm:line-clamp-none">
                  {isComplete
                    ? 'Everything is filled in — your profile is fully showcased.'
                    : 'A complete profile ranks higher in the public directory and gives recruiters more to work with.'}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-heading text-headline-lg sm:text-headline-xl tabular-nums text-ink leading-none">
                  {completionPercentage}
                  <span className="text-headline-sm sm:text-headline-md text-ink-muted">%</span>
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <ProgressBar
              className="mt-3 sm:mt-4"
              label="Profile completion"
              value={completionPercentage}
              barClassName={isComplete ? 'bg-status-approved' : undefined}
            />

            {/* Bottom row: Next steps / Status + Action button */}
            {isComplete ? (
              <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                <p className="flex items-center gap-1.5 text-body-xs sm:text-body-sm text-status-approved font-medium">
                  <CheckCircle2 size={16} strokeWidth={2.5} aria-hidden="true" />
                  <span>All {completionItems.length} sections are done.</span>
                </p>
                <Link
                  to="/profile"
                  className="btn btn-secondary text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 shrink-0"
                >
                  Review profile
                </Link>
              </div>
            ) : (
              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-label-xs sm:text-label-sm font-semibold uppercase tracking-wider text-ink-muted shrink-0 mr-0.5">
                      Next up:
                    </span>
                    {nextMissing.map((item) => (
                      <Link
                        key={item.id}
                        to={item.to}
                        className="inline-flex items-center gap-1 rounded-full border border-edge bg-surface px-2.5 py-1 text-label-xs sm:text-label-sm text-ink-secondary transition-colors duration-fast hover:border-brand-ring hover:text-ink hover:bg-surface-sunken shrink-0"
                      >
                        <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                        <span>{item.title}</span>
                      </Link>
                    ))}
                    {remainingItems.length > nextMissing.length && (
                      <span className="text-label-xs text-ink-muted px-0.5">
                        +{remainingItems.length - nextMissing.length} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-auto">
                  <Link
                    to="/profile/edit"
                    className="btn btn-primary text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 shrink-0"
                  >
                    Complete profile
                  </Link>
                </div>
              </div>
            )}
          </Card>

          <DashboardTaskBoard tasks={completionItems} />

          {/* 4. RECENT ACTIVITY. §6.2 (6): eight rows, "See all" out. */}
          <section className="surface p-4 sm:p-5 lg:p-6" aria-labelledby="activity-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="activity-heading" className="font-heading text-headline-md text-ink">
                Recent activity
              </h2>
              <Link
                to="/notifications"
                className="flex items-center gap-1 text-label-lg font-semibold text-ink-brand transition-colors hover:text-brand-hover"
              >
                <span>See all</span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-4">
              {notifError ? (
                <ErrorState bare message={notifError} onRetry={() => refetchDashboard()} />
              ) : notifications.length === 0 ? (
                <EmptyState
                  bare
                  icon={Bell}
                  title="You're all caught up"
                  description="Moderation decisions, announcements and event updates land here."
                />
              ) : (
                <ul className="-mx-2 divide-y divide-edge">
                  {notifications.slice(0, 8).map((n) => {
                    const isUnread = !n.isRead && n.status !== 'READ';
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className="w-full cursor-pointer rounded-lg px-2 py-3 text-left transition-colors duration-fast hover:bg-surface-sunken"
                        >
                          <span className="flex items-start gap-2">
                            {isUnread && (
                              <span
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand ring-2 ring-surface"
                                aria-label="Unread"
                                role="img"
                              />
                            )}
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block truncate text-label-lg text-ink ${
                                  isUnread ? 'font-semibold' : ''
                                }`}
                              >
                                {n.title || 'Department update'}
                              </span>
                              <span className="mt-0.5 line-clamp-2 block text-body-sm text-ink-secondary">
                                {n.message || n.content}
                              </span>
                              <span className="mt-1 block text-label-md text-ink-muted">
                                {relativeTime(n.createdAt)}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* 5. CONTEXTUAL SIDEBAR. §6.2 puts the streak tracker here; there is
              no streak in the API, so what remains is events, quick actions
              and the open votes. */}
        <div className="min-w-0 space-y-6">
          {/* §6.2 (7) */}
          <section className="surface p-4 sm:p-5 lg:p-6" aria-labelledby="events-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="events-heading" className="font-heading text-headline-md text-ink">
                Upcoming events
              </h2>
              <Link
                to="/events"
                className="flex items-center gap-1 text-label-lg font-semibold text-ink-brand transition-colors hover:text-brand-hover"
              >
                <span>Browse all</span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-4">
              {eventsError ? (
                <ErrorState bare message={eventsError} onRetry={() => refetchDashboard()} />
              ) : upcomingEvents.length === 0 ? (
                <EmptyState
                  bare
                  icon={Calendar}
                  title="No events coming up"
                  description="Competitions, hackathons and workshops appear here as soon as the department publishes them."
                  action={
                    <Link to="/events" className="btn btn-secondary">
                      Check the events page
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-edge">
                  {upcomingEvents.map((evt) => {
                    const date = eventDateParts(evt.date);
                    const isRegistered = registrations.some(
                      (r) => r.eventId === evt.id && r.status !== 'CANCELLED'
                    );
                    return (
                      <li key={evt.id}>
                        <Link
                          to={`/events/${evt.id}`}
                          className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-fast hover:bg-surface-sunken"
                        >
                          <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-edge bg-surface-inset">
                            <span className="font-heading text-label-sm tracking-wide text-brand">
                              {date?.month ?? 'TBA'}
                            </span>
                            <span className="font-heading text-headline-sm leading-none text-ink">
                              {date?.day ?? '--'}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate font-heading text-headline-sm text-ink">
                                {evt.title}
                              </span>
                              <span className={isRegistered ? 'badge badge-approved' : 'badge badge-draft'}>
                                {isRegistered ? (
                                  <>
                                    <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
                                    Registered
                                  </>
                                ) : (
                                  <>
                                    <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                                    Register
                                  </>
                                )}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-body-sm text-ink-muted">
                              {[evt.type || 'Event', date?.full, evt.eligibility]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* 6. OPEN VOTING. Not in §6.2, but a real section with a real
              reason to exist: an empty "no campaigns" card would be noise on a
              dashboard, so it only appears when there is something to vote on. */}
          {!votingError && votingCampaigns.length > 0 && (
            <section className="surface p-4 sm:p-5 lg:p-6" aria-labelledby="voting-heading">
              <div className="flex items-center gap-2">
                <Vote size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" />
                <h2 id="voting-heading" className="font-heading text-headline-md text-ink">
                  Open voting
                </h2>
              </div>
              <ul className="mt-4 space-y-2">
                {votingCampaigns.map((camp) => (
                  <li
                    key={camp.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge bg-surface-inset px-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block font-heading text-label-lg font-semibold text-ink">
                        {camp.title}
                      </span>
                      <span className="block truncate text-body-sm text-ink-secondary">
                        {camp.description || 'Active election'}
                      </span>
                    </span>
                    <Link to={`/voting/${camp.id}`} className="btn btn-primary shrink-0">
                      Cast vote
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {votingError && (
            <ErrorState
              title="Voting is unavailable"
              message={votingError}
              onRetry={() => refetchDashboard()}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;