import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Video,
  Vote,
} from 'lucide-react';
import { api } from '../services/api';
import { getNotificationDestination, navigateToNotification } from '../utils/notificationRouting';
import { StudentProfile, Project, Event, EventRegistration, VotingCampaign, Notification } from '../types';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

/**
 * Moderation state of the introduction video, phrased for the student rather
 * than in the enum's own words. Kept identical to `ProfilePage` so the same
 * status never reads two different ways in two places.
 */
const VIDEO_STATUS: Record<string, { tone: string; label: string }> = {
  APPROVED: { tone: 'badge-approved', label: 'Approved' },
  SUBMITTED: { tone: 'badge-pending', label: 'Under review' },
  CHANGES_REQUESTED: { tone: 'badge-changes', label: 'Changes requested' },
  REJECTED: { tone: 'badge-rejected', label: 'Rejected' },
};

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
 * Shaped like the real dashboard so the page does not jump when the data
 * lands. The old full-screen branded spinner blanked the whole shell for a
 * page whose layout we already know.
 */
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true">
    <span className="sr-only" role="status">
      Loading your dashboard
    </span>
    <div className="space-y-2">
      <div className="skeleton h-8 w-64" />
      <div className="skeleton h-4 w-80" />
    </div>
    <div className="surface space-y-4 p-5 sm:p-6">
      <div className="skeleton h-5 w-40" />
      <div className="skeleton h-2 w-full rounded-full" />
      <div className="flex flex-wrap gap-2">
        <div className="skeleton h-7 w-28 rounded-full" />
        <div className="skeleton h-7 w-32 rounded-full" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-[72px]" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="surface space-y-3 p-5 sm:p-6 lg:col-span-2">
        <div className="skeleton h-5 w-40" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-14" />
        ))}
      </div>
      <div className="surface space-y-3 p-5 sm:p-6">
        <div className="skeleton h-5 w-32" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-10" />
        ))}
      </div>
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [resume, setResume] = useState<any | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [votingCampaigns, setVotingCampaigns] = useState<VotingCampaign[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [votingError, setVotingError] = useState<string | null>(null);

  const loadData = async (isInitial = true) => {
    if (isInitial && !profile) setLoading(true);
    setProfileError(null);

    const [
      pResult,
      rResult,
      projResult,
      achResult,
      certResult,
      evResult,
      regResult,
      vResult,
      nResult,
    ] = await Promise.allSettled([
      api.getProfile(),
      api.getResume(),
      api.getProjects(),
      api.getAchievements(),
      api.getCertificates(),
      api.getEvents(),
      api.getRegistrations(),
      api.getVotingCampaigns(),
      api.getNotifications(),
    ]);

    if (pResult.status === 'fulfilled') setProfile(pResult.value);
    else setProfileError('We could not load your profile right now.');

    if (rResult.status === 'fulfilled') setResume(rResult.value);
    if (projResult.status === 'fulfilled' && Array.isArray(projResult.value)) setProjects(projResult.value);
    if (achResult.status === 'fulfilled' && Array.isArray(achResult.value)) setAchievements(achResult.value);
    if (certResult.status === 'fulfilled' && Array.isArray(certResult.value)) setCertificates(certResult.value);

    if (evResult.status === 'fulfilled' && Array.isArray(evResult.value)) setEvents(evResult.value);
    else setEventsError('We could not load department events right now.');

    if (regResult.status === 'fulfilled' && Array.isArray(regResult.value)) setRegistrations(regResult.value);

    if (vResult.status === 'fulfilled' && Array.isArray(vResult.value)) setVotingCampaigns(vResult.value);
    else setVotingError('We could not load voting campaigns right now.');

    if (nResult.status === 'fulfilled' && Array.isArray(nResult.value?.items)) setNotifications(nResult.value.items);
    else setNotifError('We could not load your recent activity right now.');

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead && n.status !== 'READ') {
      api.markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true, status: 'READ' } : item))
      );
    }

    const destination = getNotificationDestination(n);
    navigateToNotification(destination, navigate);
  };

  // Compute real profile completion
  const checkPhoto = !!profile?.photoUrl;
  const checkBio = !!(profile?.bio || (profile as any)?.biography);
  const checkSkills = !!(profile?.skills && profile.skills.length > 0);
  const checkVideo = !!(profile?.submission?.videoUploaded || profile?.submission?.videoUrl || profile?.submission?.status === 'APPROVED' || profile?.submission?.status === 'SUBMITTED');
  const activeResume = Array.isArray(resume) ? (resume.length > 0 ? resume[0] : null) : resume;
  const checkResume = !!(activeResume?.driveFileId || activeResume?.fileUrl);
  const checkProjects = projects.length > 0;

  const completionItems = [
    { label: 'Profile photo', done: checkPhoto, link: '/profile/edit' },
    { label: 'Biography', done: checkBio, link: '/profile/edit' },
    { label: 'Technical skills', done: checkSkills, link: '/profile/edit' },
    { label: 'Intro video', done: checkVideo, link: '/intro-video' },
    { label: 'Resume', done: checkResume, link: '/resume' },
    { label: 'First project', done: checkProjects, link: '/portfolio' },
  ];

  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPercentage = Math.round((completedCount / completionItems.length) * 100);
  const remainingItems = completionItems.filter((i) => !i.done);
  const isComplete = completionPercentage === 100;

  // Only the events worth acting on, soonest first.
  const upcomingEvents = [...events].sort((a, b) => timeOf(a.date) - timeOf(b.date)).slice(0, 3);
  const videoStatus = VIDEO_STATUS[profile?.submission?.status ?? ''] ?? {
    tone: 'badge-draft',
    label: 'Not submitted',
  };
  const firstName = (profile?.name || 'there').split(' ').filter(Boolean)[0];
  const credentialsCount = achievements.length + certificates.length;

  const quickActions = [
    { label: 'Edit profile', hint: isComplete ? 'All set' : `${remainingItems.length} step${remainingItems.length === 1 ? '' : 's'} left`, to: '/profile/edit', icon: User },
    { label: 'Manage portfolio', hint: `${projects.length} project${projects.length === 1 ? '' : 's'} · ${credentialsCount} credential${credentialsCount === 1 ? '' : 's'}`, to: '/portfolio', icon: FolderOpen },
    { label: 'Intro video', hint: videoStatus.label, to: '/intro-video', icon: Video },
    { label: 'Resume', hint: checkResume ? 'Uploaded' : 'Not uploaded yet', to: '/resume', icon: FileText },
  ];

  const nextStepLine = (() => {
    const parts = [
      isComplete
        ? 'Your profile is complete'
        : `${remainingItems.length} step${remainingItems.length === 1 ? '' : 's'} left to finish your profile`,
    ];
    if (!eventsError && upcomingEvents.length > 0) {
      parts.push(`${upcomingEvents.length} upcoming event${upcomingEvents.length === 1 ? '' : 's'}`);
    }
    return `${parts.join(' · ')}.`;
  })();

  if (loading && !profile) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 1. GREETING. The one thing the page has to say before anything else. */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-headline-lg-mobile text-ink sm:text-headline-lg">
            {greetingFor(new Date().getHours())}, {firstName}{' '}
            <span aria-hidden="true">👋</span>
          </h1>
          {!profileError && <p className="mt-1 text-body-md text-ink-secondary">{nextStepLine}</p>}
        </div>
        {profile?.rollNo && (
          <Link to={`/students/${profile.rollNo}`} className="btn btn-secondary shrink-0 self-start">
            <span>Public showcase</span>
            <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </header>

      {profileError && (
        <ErrorState
          title="We could not load your profile"
          message={profileError}
          onRetry={() => loadData(true)}
        />
      )}

      {/* 2. PROFILE COMPLETION. One component, one number, one way forward. */}
      <section className="surface p-5 sm:p-6" aria-labelledby="completion-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="completion-heading" className="font-heading text-headline-sm text-ink">
              Profile completion
            </h2>
            <p className="mt-0.5 text-body-sm text-ink-secondary">
              {isComplete
                ? 'Everything is filled in — your profile is fully showcased.'
                : 'A complete profile ranks higher in the public directory and gives recruiters more to work with.'}
            </p>
          </div>
          <p className="font-heading text-headline-lg tabular-nums text-ink">
            {completionPercentage}
            <span className="text-headline-sm text-ink-muted">%</span>
          </p>
        </div>

        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuenow={completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-base ease-standard ${
              isComplete ? 'bg-status-approved' : 'bg-brand'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {isComplete ? (
          <p className="mt-4 flex items-center gap-2 text-body-sm text-status-approved">
            <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
            <span>All {completionItems.length} sections are done.</span>
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {remainingItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.link}
                  className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1.5 text-label-md text-ink-secondary transition-colors duration-fast hover:border-brand-ring hover:text-ink"
                >
                  <Plus size={13} strokeWidth={2.5} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          <Link to={isComplete ? '/profile' : '/profile/edit'} className="btn btn-primary">
            {isComplete ? 'Review profile' : 'Complete profile'}
          </Link>
        </div>
      </section>

      {/* 3. QUICK ACTIONS. The four things a student actually comes here to do. */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="sr-only">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="surface flex items-center gap-3 p-4 transition-colors duration-fast hover:border-edge-strong hover:bg-surface-inset"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-text">
                <action.icon size={18} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-heading text-label-lg font-semibold text-ink">
                  {action.label}
                </span>
                <span className="block truncate text-body-sm text-ink-muted">{action.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. UPCOMING EVENTS + RECENT ACTIVITY */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface p-5 sm:p-6 lg:col-span-2" aria-labelledby="events-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="events-heading" className="font-heading text-headline-sm text-ink">
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
              <ErrorState bare message={eventsError} onRetry={() => loadData(true)} />
            ) : upcomingEvents.length === 0 ? (
              <EmptyState
                bare
                icon={Calendar}
                title="No events scheduled"
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
                        className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors duration-fast hover:bg-surface-sunken"
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
                          <span className="flex items-center gap-2">
                            <span className="truncate font-heading text-headline-sm text-ink">
                              {evt.title}
                            </span>
                            {isRegistered && (
                              <span className="badge badge-approved shrink-0">
                                <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
                                Registered
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-body-sm text-ink-muted">
                            {[evt.type || 'Event', date?.full, evt.eligibility]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                        <ChevronRight
                          size={16}
                          strokeWidth={1.75}
                          className="shrink-0 text-ink-muted"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="surface p-5 sm:p-6" aria-labelledby="activity-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="activity-heading" className="font-heading text-headline-sm text-ink">
              Recent activity
            </h2>
            <Link
              to="/notifications"
              className="text-label-lg font-semibold text-ink-brand transition-colors hover:text-brand-hover"
            >
              View all
            </Link>
          </div>

          <div className="mt-4">
            {notifError ? (
              <ErrorState bare message={notifError} onRetry={() => loadData(true)} />
            ) : notifications.length === 0 ? (
              <EmptyState
                bare
                icon={Bell}
                title="You're all caught up"
                description="Moderation decisions, announcements and event updates land here."
              />
            ) : (
              <ul className="-mx-2 divide-y divide-edge">
                {notifications.slice(0, 5).map((n) => {
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

      {/* 5. OPEN VOTING. Only rendered when there is something to vote on: an
          empty "no campaigns" card was pure noise on a dashboard. */}
      {!votingError && votingCampaigns.length > 0 && (
        <section className="surface p-5 sm:p-6" aria-labelledby="voting-heading">
          <div className="flex items-center gap-2">
            <Vote size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" />
            <h2 id="voting-heading" className="font-heading text-headline-sm text-ink">
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
        <ErrorState title="Voting is unavailable" message={votingError} onRetry={() => loadData(true)} />
      )}
    </div>
  );
};

export default DashboardPage;
