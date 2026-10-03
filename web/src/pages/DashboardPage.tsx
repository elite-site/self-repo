import React from 'react';
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
  Plus,
  User,
  Users,
  Video,
  Vote,
} from 'lucide-react';
import { api } from '../services/api';
import { getNotificationDestination, navigateToNotification } from '../utils/notificationRouting';
import {
  Achievement,
  Certificate,
  StudentProfile,
  Project,
  Event,
  EventRegistration,
  VotingCampaign,
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
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-80" />
    </div>

    <div className="surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <Skeleton className="mt-4 h-2 w-full rounded-full" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-10 w-36 rounded-md" />
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
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
    data: profileData,
    isLoading: profileLoading,
    isError: profileIsError,
    refetch: refetchProfile,
  } = useQuery<DashboardProfile>({
    queryKey: ['dashboard', 'profile'],
    queryFn: () => api.getProfile(),
  });
  const profile = profileData ?? null;
  const profileError = profileIsError ? 'We could not load your profile right now.' : null;

  const {
    data: resumeData,
  } = useQuery<DashboardResume | DashboardResume[] | null>({
    queryKey: ['dashboard', 'resume'],
    queryFn: () => api.getResume(),
  });
  const resume = resumeData ?? null;

  const {
    data: projectsData,
  } = useQuery<Project[]>({
    queryKey: ['dashboard', 'projects'],
    queryFn: () => api.getProjects(),
  });
  const projects = Array.isArray(projectsData) ? projectsData : [];

  const {
    data: achievementsData,
  } = useQuery<Achievement[]>({
    queryKey: ['dashboard', 'achievements'],
    queryFn: () => api.getAchievements(),
  });
  const achievements = Array.isArray(achievementsData) ? achievementsData : [];

  const {
    data: certificatesData,
  } = useQuery<Certificate[]>({
    queryKey: ['dashboard', 'certificates'],
    queryFn: () => api.getCertificates(),
  });
  const certificates = Array.isArray(certificatesData) ? certificatesData : [];

  const {
    data: eventsData,
    isError: eventsIsError,
    refetch: refetchEvents,
  } = useQuery<Event[]>({
    queryKey: ['dashboard', 'events'],
    queryFn: () => api.getEvents(),
  });
  const events = Array.isArray(eventsData) ? eventsData : [];
  const eventsError = eventsIsError ? 'We could not load department events right now.' : null;

  const {
    data: registrationsData,
  } = useQuery<EventRegistration[]>({
    queryKey: ['dashboard', 'registrations'],
    queryFn: () => api.getRegistrations(),
  });
  const registrations = Array.isArray(registrationsData) ? registrationsData : [];

  const {
    data: votingData,
    isError: votingIsError,
    refetch: refetchVoting,
  } = useQuery<VotingCampaign[]>({
    queryKey: ['dashboard', 'votingCampaigns'],
    queryFn: () => api.getVotingCampaigns(),
  });
  const votingCampaigns = Array.isArray(votingData) ? votingData : [];
  const votingError = votingIsError ? 'We could not load voting campaigns right now.' : null;

  const {
    data: notifsData,
    isError: notifIsError,
    refetch: refetchNotifs,
  } = useQuery<{ items?: Notification[] } | Notification[]>({
    queryKey: ['dashboard', 'notifications'],
    queryFn: () => api.getNotifications(),
  });
  const notifications: Notification[] = Array.isArray(notifsData)
    ? notifsData
    : Array.isArray(notifsData?.items)
    ? notifsData.items
    : [];
  const notifError = notifIsError ? 'We could not load your recent activity right now.' : null;

  const markNotificationMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications'] });
    },
  });

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead && n.status !== 'READ') {
      markNotificationMutation.mutate(n.id);
    }

    const destination = getNotificationDestination(n);
    navigateToNotification(destination, navigate);
  };

  const shouldReduce = useReducedMotion();
  // §6.2 "Animation Details": one section per 100ms, greeting first. The
  // reduced pair drops both the stagger and the travel, so nothing arrives
  // late (§3.4).
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerFastItem');

  // Compute real profile completion
  const checkPhoto = !!profile?.photoUrl;
  const checkBio = !!(profile?.bio || profile?.biography);
  const checkSkills = !!(profile?.skills && profile.skills.length > 0);
  const effectiveVideoStatus = profile?.video?.status || profile?.submission?.status;
  const checkVideo =
    !!(profile?.video ||
      profile?.submission?.videoUploaded ||
      profile?.submission?.videoUrl ||
      effectiveVideoStatus);
  const activeResume = Array.isArray(resume) ? (resume.length > 0 ? resume[0] : null) : resume;
  const checkResume = !!(activeResume?.driveFileId || activeResume?.fileUrl);
  const checkProjects = projects.length > 0;

  const videoStatus = VIDEO_STATUS[effectiveVideoStatus ?? ''] ?? 
    (effectiveVideoStatus === 'PENDING' 
      ? { tone: 'badge-pending' as DashboardTone, label: 'Under review' } 
      : { tone: 'badge-draft' as DashboardTone, label: 'Not submitted' });

  let videoState: 'todo' | 'progress' | 'done' = 'todo';
  if (checkVideo) {
    if (effectiveVideoStatus === 'APPROVED') {
      videoState = 'done';
    } else if (effectiveVideoStatus === 'SUBMITTED' || effectiveVideoStatus === 'PENDING') {
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
  const completionPercentage = Math.round((completedCount / completionItems.length) * 100);
  // Only items that actually need student action should block 100% completion banner.
  const remainingItems = completionItems.filter((i) => i.state === 'todo');
  const isComplete = remainingItems.length === 0;
  /** §6.2 (2): the three chips on the banner. The board still lists them all. */
  const nextMissing = remainingItems.slice(0, 3);

  // Only the events worth acting on, soonest first.
  const upcomingEvents = [...events].sort((a, b) => timeOf(a.date) - timeOf(b.date)).slice(0, 3);
  const firstName = (profile?.name || 'there').split(' ').filter(Boolean)[0];
  const credentialsCount = achievements.length + certificates.length;

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
      hint: `${projects.length} project${projects.length === 1 ? '' : 's'} · ${credentialsCount} credential${credentialsCount === 1 ? '' : 's'}`,
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

  if (profileLoading && !profile) {
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

      {profileError && (
        <motion.div variants={staggerItem}>
          <ErrorState
            title="We could not load your profile"
            message={profileError}
            onRetry={() => refetchProfile()}
          />
        </motion.div>
      )}

      {/* 2. QUICK ACTIONS BAR - Top Layer */}
      <motion.section variants={staggerItem} aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="sr-only">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link
              key={action.to + action.label}
              to={action.to}
              className="flex flex-col items-center text-center gap-2 rounded-xl border border-edge bg-surface p-4 transition-all duration-fast hover:-translate-y-1 hover:border-brand hover:shadow-md"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-text">
                <action.icon size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-heading text-label-md font-bold leading-tight text-ink">
                  {action.label}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* 3. MAIN + SIDEBAR */}
      <motion.div variants={staggerItem} className="grid gap-6 lg:grid-cols-3 xl:grid-cols-4">
        <div className="space-y-6 lg:col-span-2 xl:col-span-3">
          {/* PROFILE COMPLETION */}
          <Card variant="brand" className="p-5 sm:p-6" aria-labelledby="completion-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="completion-heading" className="font-heading text-headline-md text-ink">
                  Profile completion
                </h2>
                <p className="mt-0.5 text-body-sm text-ink-secondary">
                  {isComplete
                    ? 'Everything is filled in — your profile is fully showcased.'
                    : 'A complete profile ranks higher in the public directory and gives recruiters more to work with.'}
                </p>
              </div>
              <p className="font-heading text-headline-xl tabular-nums text-ink">
                {completionPercentage}
                <span className="text-headline-md text-ink-muted">%</span>
              </p>
            </div>

            <ProgressBar
              className="mt-4"
              label="Profile completion"
              value={completionPercentage}
              barClassName={isComplete ? 'bg-status-approved' : undefined}
            />

            {isComplete ? (
              <p className="mt-4 flex items-center gap-2 text-body-sm text-status-approved">
                <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
                <span>All {completionItems.length} sections are done.</span>
              </p>
            ) : (
              <>
                <p className="mt-4 text-label-sm text-ink-muted">Next up</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {nextMissing.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={item.to}
                        className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1.5 text-label-md text-ink-secondary transition-colors duration-fast hover:border-brand-ring hover:text-ink"
                      >
                        <Plus size={13} strokeWidth={2.5} aria-hidden="true" />
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-5">
              <Link to={isComplete ? '/profile' : '/profile/edit'} className="btn btn-primary">
                {isComplete ? 'Review profile' : 'Complete profile'}
              </Link>
            </div>
          </Card>

          <DashboardTaskBoard tasks={completionItems} />

          {/* 4. RECENT ACTIVITY. §6.2 (6): eight rows, "See all" out. */}
          <section className="surface p-5 sm:p-6" aria-labelledby="activity-heading">
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
                <ErrorState bare message={notifError} onRetry={() => refetchNotifs()} />
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
        <div className="space-y-6">
          {/* §6.2 (7) */}
          <section className="surface p-5 sm:p-6" aria-labelledby="events-heading">
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
                <ErrorState bare message={eventsError} onRetry={() => refetchEvents()} />
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
            <section className="surface p-5 sm:p-6" aria-labelledby="voting-heading">
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
              onRetry={() => refetchVoting()}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;