import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Video,
  FileText,
  FolderGit2,
  Award,
  Calendar,
  Bell,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Vote,
  RefreshCw,
  Plus
} from 'lucide-react';
import { api, resolveMediaUrl } from '../services/api';
import { getNotificationDestination, navigateToNotification } from '../utils/notificationRouting';
import { StudentProfile, Project, Event, EventRegistration, VotingCampaign, Notification } from '../types';
import { BrandedLoading } from '../components/BrandedLoading';
import { getPhotoStyle } from '../utils/photoStyle';

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
  const [imageError, setImageError] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [votingError, setVotingError] = useState<string | null>(null);

  useEffect(() => {
    setImageError(false);
  }, [profile?.photoUrl]);

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
    else setProfileError('Failed to load profile details.');

    if (rResult.status === 'fulfilled') setResume(rResult.value);
    if (projResult.status === 'fulfilled' && Array.isArray(projResult.value)) setProjects(projResult.value);
    if (achResult.status === 'fulfilled' && Array.isArray(achResult.value)) setAchievements(achResult.value);
    if (certResult.status === 'fulfilled' && Array.isArray(certResult.value)) setCertificates(certResult.value);

    if (evResult.status === 'fulfilled' && Array.isArray(evResult.value)) setEvents(evResult.value);
    else setEventsError('Could not load department events.');

    if (regResult.status === 'fulfilled' && Array.isArray(regResult.value)) setRegistrations(regResult.value);

    if (vResult.status === 'fulfilled' && Array.isArray(vResult.value)) setVotingCampaigns(vResult.value);
    else setVotingError('Could not load voting campaigns.');

    if (nResult.status === 'fulfilled' && Array.isArray(nResult.value?.items)) setNotifications(nResult.value.items);
    else setNotifError('Could not load notifications.');

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
    { label: 'Profile Photo', done: checkPhoto, link: '/profile/edit' },
    { label: 'Biography', done: checkBio, link: '/profile/edit' },
    { label: 'Technical Skills', done: checkSkills, link: '/profile/edit' },
    { label: 'Intro Video', done: checkVideo, link: '/intro-video' },
    { label: 'Resume', done: checkResume, link: '/resume' },
    { label: 'Projects', done: checkProjects, link: '/portfolio' },
  ];

  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPercentage = Math.round((completedCount / completionItems.length) * 100);

  if (loading && !profile) {
    return <BrandedLoading message="Loading Student Dashboard" fullScreen={false} />;
  }

  return (
    <div className="space-y-6 page-enter">
      {/* COMPACT INLINE ERROR BANNER IF PROFILE FAILED */}
      {profileError && (
        <div className="flex items-center justify-between p-4 bg-status-bg-rejected border border-status-rejected rounded-lg text-status-rejected text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{profileError} Showing offline workspace shell.</span>
          </div>
          <button
            onClick={() => loadData(true)}
            className="btn btn-danger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* 1. WELCOME HEADER CARD */}
      <div className="surface p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          {profile?.photoUrl && !imageError ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-edge shrink-0 shadow-sm bg-surface">
              <img
                src={resolveMediaUrl(profile.photoUrl)}
                alt={profile.name}
                style={getPhotoStyle(profile)}
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center font-heading font-bold text-xl sm:text-2xl shrink-0 shadow-sm">
              {profile?.name
                ? profile.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0]?.toUpperCase())
                    .join('')
                : 'IT'}
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-ink-brand bg-brand-soft px-2.5 py-0.5 rounded-md">
                Dept of Information Technology
              </span>
              <span className="text-xs font-mono text-ink-muted bg-surface-sunken border border-edge px-2.5 py-0.5 rounded-md font-medium">
                {profile?.rollNo || 'IT Student'}
              </span>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Welcome back, {profile?.name || 'Student'}
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary font-normal">
              Year {profile?.year || '1'} · Section {profile?.section || 'A'} · {profile?.branch || 'IT'} · Sasi Institute of Tech & Eng
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/profile"
            className="btn btn-secondary"
          >
            <span>View Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/profile/edit"
            className="btn btn-primary"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* 2. PROFILE COMPLETION PROGRESS */}
      <div className="surface p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm font-bold text-ink">Profile Strength & Readiness</h2>
              <span className="font-heading text-xs font-bold text-ink-brand bg-brand-soft px-2.5 py-0.5 rounded-full">
                {completionPercentage}% Complete
              </span>
            </div>
            <p className="text-xs text-ink-secondary mt-0.5 font-normal">
              {completionPercentage === 100
                ? 'Your profile is 100% complete and fully ready for showcase!'
                : 'Complete all sections to unlock maximum visibility in the student directory.'}
            </p>
          </div>
          <span className="text-xs font-medium text-ink-muted">
            {completedCount} of {completionItems.length} sections done
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-sunken rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-700 ease-out ${
              completionPercentage === 100
                ? 'bg-status-approved'
                : 'bg-brand'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Breakdown Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {completionItems.map((item) => (
            <Link
              key={item.label}
              to={item.link}
              className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-colors border ${
                item.done
                  ? 'bg-status-bg-approved border-status-approved text-status-approved hover:bg-status-bg-approved/80'
                  : 'bg-surface-sunken border-edge text-ink-secondary hover:bg-surface-inset'
              }`}
            >
              {item.done ? (
                <CheckCircle2 strokeWidth={1.75} className="w-4 h-4 text-status-approved shrink-0" />
              ) : (
                <Clock strokeWidth={1.75} className="w-4 h-4 text-ink-muted shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. CORE SUMMARY KPI CARDS (4 Columns across desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Intro Video */}
        <div className="surface p-5 flex flex-col justify-between hover:border-edge-strong transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center">
                <Video strokeWidth={1.75} className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  profile?.submission?.status === 'APPROVED'
                    ? 'badge badge-approved'
                    : profile?.submission?.status === 'SUBMITTED'
                    ? 'badge badge-pending'
                    : 'badge badge-draft'
                }`}
              >
                {profile?.submission?.status || 'NOT SUBMITTED'}
              </span>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-ink">Introduction Video</h3>
              <p className="text-xs text-ink-secondary mt-0.5">
                {checkVideo ? 'Video recorded & on file.' : 'Department introduction video.'}
              </p>
            </div>
          </div>
          <Link
            to="/intro-video"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-ink-brand hover:text-brand-hover pt-3 border-t border-edge"
          >
            <span>{checkVideo ? 'Review Video' : 'Upload Video'}</span>
            <ArrowRight strokeWidth={1.75} className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 2: Resume */}
        <div className="surface p-5 flex flex-col justify-between hover:border-edge-strong transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center">
                <FileText strokeWidth={1.75} className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  checkResume ? 'badge badge-approved' : 'badge badge-draft'
                }`}
              >
                {checkResume ? 'ACTIVE' : 'MISSING'}
              </span>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-ink">Professional Resume</h3>
              <p className="text-xs text-ink-secondary mt-0.5">
                {checkResume ? 'PDF ready for recruiter download.' : 'Upload your 1-page PDF resume.'}
              </p>
            </div>
          </div>
          <Link
            to="/resume"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-ink-brand hover:text-brand-hover pt-3 border-t border-edge"
          >
            <span>{checkResume ? 'View Resume' : 'Upload Resume'}</span>
            <ArrowRight strokeWidth={1.75} className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 3: Projects */}
        <div className="surface p-5 flex flex-col justify-between hover:border-edge-strong transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center">
                <FolderGit2 strokeWidth={1.75} className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold text-ink-brand bg-brand-soft px-2 py-0.5 rounded-full">
                {projects.length} Builds
              </span>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-ink">Technical Projects</h3>
              <p className="text-xs text-ink-secondary mt-0.5">
                {projects.length === 0 ? 'No projects added yet.' : `${projects.length} project showcase entries.`}
              </p>
            </div>
          </div>
          <Link
            to="/portfolio"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-ink-brand hover:text-brand-hover pt-3 border-t border-edge"
          >
            <span>Manage Projects</span>
            <ArrowRight strokeWidth={1.75} className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 4: Credentials */}
        <div className="surface p-5 flex flex-col justify-between hover:border-edge-strong transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center">
                <Award strokeWidth={1.75} className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold text-ink-brand bg-brand-soft px-2 py-0.5 rounded-full">
                {achievements.length + certificates.length} Badges
              </span>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-ink">Honors & Certs</h3>
              <p className="text-xs text-ink-secondary mt-0.5">
                {achievements.length + certificates.length === 0
                  ? 'No honors verified yet.'
                  : `${achievements.length} achievements, ${certificates.length} certs.`}
              </p>
            </div>
          </div>
          <Link
            to="/portfolio"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-ink-brand hover:text-brand-hover pt-3 border-t border-edge"
          >
            <span>View Credentials</span>
            <ArrowRight strokeWidth={1.75} className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4. MAIN TWO-COLUMN WORKSPACE: LEFT 8 COLS, RIGHT 4 COLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: UPCOMING EVENTS & DEMOCRACY (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* UPCOMING EVENTS CARD */}
          <div className="surface p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-soft text-brand-soft-text">
                  <Calendar strokeWidth={1.75} className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-ink">Department Events</h2>
                  <p className="text-xs text-ink-secondary">Upcoming hackathons, workshops & sessions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/registrations"
                  className="text-xs font-semibold text-ink-secondary hover:text-ink hidden sm:inline-block"
                >
                  My Registrations ({registrations.length})
                </Link>
                <Link
                  to="/teams"
                  className="text-xs font-semibold text-ink-secondary hover:text-ink hidden sm:inline-block"
                >
                  Teams
                </Link>
                <Link
                  to="/events"
                  className="text-xs font-semibold text-ink-brand hover:text-brand-hover flex items-center gap-1"
                >
                  <span>Browse All</span>
                  <ChevronRight strokeWidth={1.75} className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {eventsError ? (
              <div className="p-4 bg-status-bg-rejected border border-status-rejected rounded-lg text-xs text-status-rejected flex items-center justify-between">
                <span>{eventsError}</span>
                <button onClick={() => loadData(true)} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 px-4 bg-surface-sunken rounded-lg border border-dashed border-edge">
                <Calendar strokeWidth={1.75} className="w-8 h-8 text-ink-muted mx-auto mb-2 opacity-60" />
                <div className="font-heading text-xs font-bold text-ink-secondary">No upcoming events scheduled</div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Check back soon for upcoming department competitions and hackathons.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {events.slice(0, 4).map((evt) => {
                  const isRegistered = registrations.some((r) => r.eventId === evt.id);
                  return (
                    <div
                      key={evt.id}
                      className="surface p-4 flex flex-col justify-between hover:border-edge-strong transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-ink-brand uppercase bg-brand-soft px-2 py-0.5 rounded">
                            {evt.type || 'Event'}
                          </span>
                          {isRegistered && (
                            <span className="text-[10px] font-semibold badge badge-approved flex items-center gap-1">
                              <CheckCircle2 strokeWidth={1.75} className="w-3 h-3" /> Registered
                            </span>
                          )}
                        </div>
                        <h4 className="font-heading text-sm font-bold text-ink leading-snug line-clamp-1">{evt.title}</h4>
                        <p className="text-xs text-ink-secondary line-clamp-2">{evt.description || 'Department event.'}</p>
                      </div>
                      <div className="pt-3 mt-3 border-t border-edge flex items-center justify-between text-xs">
                        <span className="text-ink-muted text-[11px] font-mono">
                          {evt.date ? new Date(evt.date).toLocaleDateString() : 'To be announced'}
                        </span>
                        <Link
                          to={`/events/${evt.id}`}
                          className="font-semibold text-ink-brand hover:text-brand-hover flex items-center gap-0.5"
                        >
                          <span>{isRegistered ? 'View Status' : 'Register'}</span>
                          <ChevronRight strokeWidth={1.75} className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ACTIVE ELECTIONS / DEMOCRACY */}
          <div className="surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-soft text-brand-soft-text">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink">Student Democracy & Voting</h2>
                  <p className="text-xs text-ink-secondary">Department council and representative elections</p>
                </div>
              </div>
              <Link
                to="/voting"
                className="text-xs font-semibold text-ink-brand hover:text-brand-hover flex items-center gap-1"
              >
                <span>Voting Center</span>
                <ChevronRight strokeWidth={1.75} className="w-4 h-4" />
              </Link>
            </div>

            {votingError ? (
              <div className="p-4 bg-status-bg-rejected border border-status-rejected rounded-lg text-xs text-status-rejected flex items-center justify-between">
                <span>{votingError}</span>
                <button onClick={() => loadData(true)} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            ) : votingCampaigns.length === 0 ? (
              <div className="p-4 bg-surface-sunken rounded-lg border border-edge text-xs text-ink-secondary flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote strokeWidth={1.75} className="w-4 h-4 text-ink-muted" />
                  <span>No active voting campaigns at this time.</span>
                </div>
                <Link to="/voting" className="font-semibold text-ink-brand hover:underline">
                  Past results
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {votingCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="surface p-3.5 flex items-center justify-between hover:border-edge-strong transition-colors"
                  >
                    <div>
                      <h4 className="font-heading text-xs font-bold text-ink">{camp.title}</h4>
                      <p className="text-[11px] text-ink-secondary mt-0.5">{camp.description || 'Active election'}</p>
                    </div>
                    <Link
                      to={`/voting/${camp.id}`}
                      className="btn btn-primary px-3.5 py-1.5 text-xs shrink-0"
                    >
                      Cast Vote
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: NOTIFICATIONS & QUICK ACTIONS (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* NOTIFICATIONS INBOX PREVIEW */}
          <div className="surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell strokeWidth={1.75} className="w-5 h-5 text-ink-brand" />
                <h2 className="font-heading text-sm font-bold text-ink">Recent Alerts</h2>
              </div>
              <Link
                to="/notifications"
                className="text-xs font-semibold text-ink-secondary hover:text-ink"
              >
                View all
              </Link>
            </div>

            {notifError ? (
              <div className="p-3 bg-status-bg-rejected border border-status-rejected rounded-lg text-xs text-status-rejected flex items-center justify-between">
                <span>{notifError}</span>
                <button onClick={() => loadData(true)} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6 px-4 bg-surface-sunken rounded-lg border border-edge">
                <Bell strokeWidth={1.75} className="w-6 h-6 text-ink-muted mx-auto mb-1.5" />
                <div className="font-heading text-xs font-semibold text-ink">You're all caught up!</div>
                <p className="text-[11px] text-ink-muted mt-0.5">No unread notifications.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(n)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(n);
                      }
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer hover:border-edge-strong ${
                      !n.isRead
                        ? 'bg-brand-soft/40 border-brand-soft'
                        : 'bg-surface border-edge'
                    }`}
                    aria-label={n.title}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-heading text-xs font-bold text-ink line-clamp-1">{n.title}</h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-ink-secondary mt-1 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-ink-muted font-mono mt-1 block">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK ACTIONS & PUBLIC DIRECTORY */}
          <div className="surface p-6 space-y-4 text-left bg-surface-inverse text-ink-inverse">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Department Showcase
              </span>
              <h3 className="font-heading text-base font-bold">Student Public Directory</h3>
              <p className="text-xs text-ink-muted font-normal leading-relaxed">
                Your portfolio is indexed on the official SASI IT student showcase directory for recruiters and faculty.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to={`/students/${profile?.rollNo || ''}`}
                className="w-full btn btn-primary"
              >
                <span>View My Public Showcase</span>
                <ExternalLink strokeWidth={1.75} className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
