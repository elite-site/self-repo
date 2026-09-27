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
    <div className="space-y-6">
      {/* COMPACT INLINE ERROR BANNER IF PROFILE FAILED */}
      {profileError && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{profileError} Showing offline workspace shell.</span>
          </div>
          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* 1. WELCOME HEADER CARD */}
      <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          {profile?.photoUrl ? (
            <img
              src={resolveMediaUrl(profile.photoUrl)}
              alt={profile.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-[#E4E7F2] shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center font-heading font-bold text-xl sm:text-2xl shrink-0 shadow-sm">
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
              <span className="text-xs font-semibold tracking-wider text-[#4F46E5] bg-[#EEF2FF] px-2.5 py-0.5 rounded-md">
                Dept of Information Technology
              </span>
              <span className="text-xs font-mono text-[#475569] bg-[#F7F8FC] border border-[#E4E7F2] px-2.5 py-0.5 rounded-md font-medium">
                {profile?.rollNo || 'IT Student'}
              </span>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              Welcome back, {profile?.name || 'Student'}
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] font-normal">
              Year {profile?.year || '1'} · Section {profile?.section || 'A'} · {profile?.branch || 'IT'} · Sasi Institute of Tech & Eng
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#E4E7F2] bg-white text-[#0F172A] hover:bg-[#F7F8FC] hover:border-[#CBD5E1] text-xs font-semibold transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <span>View Profile</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
          </Link>
          <Link
            to="/profile/edit"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-all shadow-sm hover:opacity-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* 2. PROFILE COMPLETION PROGRESS */}
      <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm font-bold text-[#0F172A]">Profile Strength & Readiness</h2>
              <span className="font-heading text-xs font-bold text-[#4F46E5] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full">
                {completionPercentage}% Complete
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-0.5 font-normal">
              {completionPercentage === 100
                ? 'Your profile is 100% complete and fully ready for showcase!'
                : 'Complete all sections to unlock maximum visibility in the student directory.'}
            </p>
          </div>
          <span className="text-xs font-medium text-[#94A3B8]">
            {completedCount} of {completionItems.length} sections done
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#EEF2FF] rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-700 ease-out ${
              completionPercentage === 100
                ? 'bg-emerald-500'
                : 'bg-[#4F46E5]'
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
              className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-all border ${
                item.done
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                  : 'bg-[#F7F8FC] border-[#E4E7F2] text-[#475569] hover:bg-slate-100'
              }`}
            >
              {item.done ? (
                <CheckCircle2 strokeWidth={1.75} className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Clock strokeWidth={1.75} className="w-4 h-4 text-[#94A3B8] shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. CORE SUMMARY KPI CARDS (4 Columns across desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Intro Video */}
        <div className="bg-white border border-[#E4E7F2] rounded-lg p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                <Video strokeWidth={1.75} className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  profile?.submission?.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700'
                    : profile?.submission?.status === 'SUBMITTED'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-neutral-100 text-[#475569]'
                }`}
              >
                {profile?.submission?.status || 'NOT SUBMITTED'}
              </span>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-[#0F172A]">Introduction Video</h3>
              <p className="text-xs text-[#475569] mt-0.5">
                {checkVideo ? 'Video recorded & on file.' : 'Department introduction video.'}
              </p>
            </div>
          </div>
          <Link
            to="/intro-video"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-[#4F46E5] hover:text-[#3730A3] pt-3 border-t border-[#E4E7F2]"
          >
            <span>{checkVideo ? 'Review Video' : 'Upload Video'}</span>
            <ArrowRight strokeWidth={1.75} className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 2: Resume */}
        <div className="bg-white border border-[#E4E7F2] rounded-lg p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                <FileText strokeWidth={1.75} className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  checkResume ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-[#475569]'
                }`}
              >
                {checkResume ? 'ACTIVE' : 'MISSING'}
              </span>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-[#0F172A]">Professional Resume</h3>
              <p className="text-xs text-[#475569] mt-0.5">
                {checkResume ? 'PDF ready for recruiter download.' : 'Upload your 1-page PDF resume.'}
              </p>
            </div>
          </div>
          <Link
            to="/resume"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-[#4F46E5] hover:text-[#3730A3] pt-3 border-t border-[#E4E7F2]"
          >
            <span>{checkResume ? 'View Resume' : 'Upload Resume'}</span>
            <ArrowRight strokeWidth={1.75} className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 3: Projects */}
        <div className="bg-white border border-[#E4E7F2] rounded-lg p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#7C3AED] flex items-center justify-center">
                <FolderGit2 strokeWidth={1.75} className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full">
                {projects.length} Builds
              </span>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-[#0F172A]">Technical Projects</h3>
              <p className="text-xs text-[#475569] mt-0.5">
                {projects.length === 0 ? 'No projects added yet.' : `${projects.length} project showcase entries.`}
              </p>
            </div>
          </div>
          <Link
            to="/portfolio"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-[#7C3AED] hover:text-purple-800 pt-3 border-t border-[#E4E7F2]"
          >
            <span>Manage Projects</span>
            <ArrowRight strokeWidth={1.75} className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 4: Credentials */}
        <div className="bg-white border border-[#E4E7F2] rounded-lg p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#D97706] flex items-center justify-center">
                <Award strokeWidth={1.75} className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold text-[#D97706] bg-amber-50 px-2 py-0.5 rounded-full">
                {achievements.length + certificates.length} Badges
              </span>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-[#0F172A]">Honors & Certs</h3>
              <p className="text-xs text-[#475569] mt-0.5">
                {achievements.length + certificates.length === 0
                  ? 'No honors verified yet.'
                  : `${achievements.length} achievements, ${certificates.length} certs.`}
              </p>
            </div>
          </div>
          <Link
            to="/portfolio"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-[#D97706] hover:text-amber-800 pt-3 border-t border-[#E4E7F2]"
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
          <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                  <Calendar strokeWidth={1.75} className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-[#0F172A]">Department Events</h2>
                  <p className="text-xs text-[#475569]">Upcoming hackathons, workshops & sessions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/registrations"
                  className="text-xs font-semibold text-[#475569] hover:text-[#0F172A] hidden sm:inline-block"
                >
                  My Registrations ({registrations.length})
                </Link>
                <Link
                  to="/teams"
                  className="text-xs font-semibold text-[#475569] hover:text-[#0F172A] hidden sm:inline-block"
                >
                  Teams
                </Link>
                <Link
                  to="/events"
                  className="text-xs font-semibold text-[#4F46E5] hover:text-[#3730A3] flex items-center gap-1"
                >
                  <span>Browse All</span>
                  <ChevronRight strokeWidth={1.75} className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {eventsError ? (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 flex items-center justify-between">
                <span>{eventsError}</span>
                <button onClick={() => loadData(true)} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 px-4 bg-[#F7F8FC] rounded-lg border border-dashed border-[#E4E7F2]">
                <Calendar strokeWidth={1.75} className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 opacity-60" />
                <div className="font-heading text-xs font-bold text-[#475569]">No upcoming events scheduled</div>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
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
                      className="border border-[#E4E7F2] rounded-lg p-4 flex flex-col justify-between hover:border-[#CBD5E1] transition-all bg-white"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-[#4F46E5] uppercase bg-[#EEF2FF] px-2 py-0.5 rounded">
                            {evt.type || 'Event'}
                          </span>
                          {isRegistered && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 strokeWidth={1.75} className="w-3 h-3" /> Registered
                            </span>
                          )}
                        </div>
                        <h4 className="font-heading text-sm font-bold text-[#0F172A] leading-snug line-clamp-1">{evt.title}</h4>
                        <p className="text-xs text-[#475569] line-clamp-2">{evt.description || 'Department event.'}</p>
                      </div>
                      <div className="pt-3 mt-3 border-t border-[#E4E7F2] flex items-center justify-between text-xs">
                        <span className="text-[#94A3B8] text-[11px] font-mono">
                          {evt.date ? new Date(evt.date).toLocaleDateString() : 'TBA'}
                        </span>
                        <Link
                          to={`/events/${evt.id}`}
                          className="font-semibold text-[#4F46E5] hover:text-[#3730A3] flex items-center gap-0.5"
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
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0B192C]">Student Democracy & Voting</h2>
                  <p className="text-xs text-neutral-500">Department council and representative elections</p>
                </div>
              </div>
              <Link
                to="/voting"
                className="text-xs font-semibold text-[#7C3AED] hover:text-purple-800 flex items-center gap-1"
              >
                <span>Voting Center</span>
                <ChevronRight strokeWidth={1.75} className="w-4 h-4" />
              </Link>
            </div>

            {votingError ? (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 flex items-center justify-between">
                <span>{votingError}</span>
                <button onClick={() => loadData(true)} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            ) : votingCampaigns.length === 0 ? (
              <div className="p-4 bg-[#F7F8FC] rounded-lg border border-[#E4E7F2] text-xs text-[#475569] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote strokeWidth={1.75} className="w-4 h-4 text-[#94A3B8]" />
                  <span>No active voting campaigns at this time.</span>
                </div>
                <Link to="/voting" className="font-semibold text-[#7C3AED] hover:underline">
                  Past results
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {votingCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-3.5 rounded-lg border border-[#E4E7F2] flex items-center justify-between hover:border-[#CBD5E1] transition-all bg-white"
                  >
                    <div>
                      <h4 className="font-heading text-xs font-bold text-[#0F172A]">{camp.title}</h4>
                      <p className="text-[11px] text-[#475569] mt-0.5">{camp.description || 'Active election'}</p>
                    </div>
                    <Link
                      to={`/voting/${camp.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-semibold transition-colors shrink-0"
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
          <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell strokeWidth={1.75} className="w-5 h-5 text-[#4F46E5]" />
                <h2 className="font-heading text-sm font-bold text-[#0F172A]">Recent Alerts</h2>
              </div>
              <Link
                to="/notifications"
                className="text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
              >
                View all
              </Link>
            </div>

            {notifError ? (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 flex items-center justify-between">
                <span>{notifError}</span>
                <button onClick={() => loadData(true)} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6 px-4 bg-[#F7F8FC] rounded-lg border border-[#E4E7F2]">
                <Bell strokeWidth={1.75} className="w-6 h-6 text-[#94A3B8] mx-auto mb-1.5" />
                <div className="font-heading text-xs font-semibold text-[#0F172A]">You're all caught up!</div>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">No unread notifications.</p>
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
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer hover:border-[#CBD5E1] ${
                      !n.isRead
                        ? 'bg-[#EEF2FF]/40 border-[#E0E7FF]'
                        : 'bg-white border-[#E4E7F2]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-heading text-xs font-bold text-[#0F172A] line-clamp-1">{n.title}</h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#E11D48] shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#475569] mt-1 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-[#94A3B8] font-mono mt-1 block">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK ACTIONS & PUBLIC DIRECTORY */}
          <div className="bg-gradient-to-br from-[#1E1B4B] to-[#312E81] rounded-lg p-6 text-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4 text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B4FC]">
                Department Showcase
              </span>
              <h3 className="font-heading text-base font-bold text-white">Student Public Directory</h3>
              <p className="text-xs text-neutral-300 font-normal leading-relaxed">
                Your portfolio is indexed on the official SASI IT student showcase directory for recruiters and faculty.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to={`/students/${profile?.rollNo || ''}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold transition-all shadow-sm hover:opacity-95"
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
