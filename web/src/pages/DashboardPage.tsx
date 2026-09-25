import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { api } from '../services/api';
import { StudentProfile, Project, Event, EventRegistration, VotingCampaign, Notification } from '../types';

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

    if (nResult.status === 'fulfilled' && Array.isArray(nResult.value)) setNotifications(nResult.value);
    else setNotifError('Could not load notifications.');

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-28 bg-slate-200 rounded-2xl w-full"></div>
        <div className="h-20 bg-slate-200 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-200 rounded-2xl"></div>
          <div className="h-72 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
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
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          {profile?.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-red-100 shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-sm">
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
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#DC2626] bg-red-50 px-2.5 py-0.5 rounded-md">
                Dept of Information Technology
              </span>
              <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-md font-semibold">
                {profile?.rollNo || 'IT Student'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0B192C] tracking-tight">
              Welcome back, {profile?.name || 'Student'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium">
              Year {profile?.year || '1'} · Section {profile?.section || 'A'} · {profile?.branch || 'IT'} · Sasi Institute of Tech & Eng
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#0B192C] hover:bg-neutral-50 text-xs font-bold transition-colors"
          >
            <span>View Profile</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
          </Link>
          <Link
            to="/profile/edit"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* 2. PROFILE COMPLETION PROGRESS */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0B192C]">Profile Strength & Readiness</h2>
              <span className="text-xs font-black text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-full">
                {completionPercentage}% Complete
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {completionPercentage === 100
                ? 'Your profile is 100% complete and fully ready for showcase!'
                : 'Complete all sections to unlock maximum visibility in the student directory.'}
            </p>
          </div>
          <span className="text-xs font-semibold text-neutral-400">
            {completedCount} of {completionItems.length} sections done
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ease-out ${
              completionPercentage === 100
                ? 'bg-emerald-500'
                : completionPercentage >= 60
                ? 'bg-blue-600'
                : 'bg-[#DC2626]'
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
              className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-all border ${
                item.done
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 hover:bg-emerald-100/60'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. CORE SUMMARY KPI CARDS (4 Columns across desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Intro Video */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  profile?.submission?.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : profile?.submission?.status === 'SUBMITTED'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {profile?.submission?.status || 'NOT SUBMITTED'}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B192C]">Introduction Video</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {checkVideo ? 'Video recorded & on file.' : 'Department introduction video.'}
              </p>
            </div>
          </div>
          <Link
            to="/intro-video"
            className="mt-4 flex items-center justify-between text-xs font-bold text-[#DC2626] hover:text-[#B5121B] pt-3 border-t border-neutral-100"
          >
            <span>{checkVideo ? 'Review Video' : 'Upload Video'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 2: Resume */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  checkResume ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {checkResume ? 'ACTIVE' : 'MISSING'}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B192C]">Professional Resume</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {checkResume ? 'PDF ready for recruiter download.' : 'Upload your 1-page PDF resume.'}
              </p>
            </div>
          </div>
          <Link
            to="/resume"
            className="mt-4 flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 pt-3 border-t border-neutral-100"
          >
            <span>{checkResume ? 'View Resume' : 'Upload Resume'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 3: Projects */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                {projects.length} Builds
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B192C]">Technical Projects</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {projects.length === 0 ? 'No projects added yet.' : `${projects.length} project showcase entries.`}
              </p>
            </div>
          </div>
          <Link
            to="/portfolio"
            className="mt-4 flex items-center justify-between text-xs font-bold text-purple-600 hover:text-purple-700 pt-3 border-t border-neutral-100"
          >
            <span>Manage Projects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 4: Credentials */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {achievements.length + certificates.length} Badges
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B192C]">Honors & Certs</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {achievements.length + certificates.length === 0
                  ? 'No honors verified yet.'
                  : `${achievements.length} achievements, ${certificates.length} certs.`}
              </p>
            </div>
          </div>
          <Link
            to="/portfolio"
            className="mt-4 flex items-center justify-between text-xs font-bold text-amber-600 hover:text-amber-700 pt-3 border-t border-neutral-100"
          >
            <span>View Credentials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4. MAIN TWO-COLUMN WORKSPACE: LEFT 8 COLS, RIGHT 4 COLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: UPCOMING EVENTS & DEMOCRACY (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* UPCOMING EVENTS CARD */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 text-[#DC2626]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0B192C]">Department Events</h2>
                  <p className="text-xs text-neutral-500">Upcoming hackathons, workshops & sessions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/registrations"
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 hidden sm:inline-block"
                >
                  My Registrations ({registrations.length})
                </Link>
                <Link
                  to="/teams"
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 hidden sm:inline-block"
                >
                  Teams
                </Link>
                <Link
                  to="/events"
                  className="text-xs font-bold text-[#DC2626] hover:text-[#B5121B] flex items-center gap-1"
                >
                  <span>Browse All</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {eventsError ? (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-center justify-between">
                <span>{eventsError}</span>
                <button onClick={() => loadData(true)} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <Calendar className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-60" />
                <div className="text-xs font-bold text-neutral-700">No upcoming events scheduled</div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
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
                      className="border border-[#E2E8F0] rounded-xl p-4 flex flex-col justify-between hover:border-neutral-300 transition-all bg-white"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-[#DC2626] uppercase bg-red-50 px-2 py-0.5 rounded">
                            {evt.type || 'Event'}
                          </span>
                          {isRegistered && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Registered
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-[#0B192C] leading-snug line-clamp-1">{evt.title}</h4>
                        <p className="text-xs text-neutral-500 line-clamp-2">{evt.description || 'Department event.'}</p>
                      </div>
                      <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                        <span className="text-neutral-400 text-[11px] font-mono">
                          {evt.date ? new Date(evt.date).toLocaleDateString() : 'TBA'}
                        </span>
                        <Link
                          to={`/events/${evt.id}`}
                          className="font-bold text-[#DC2626] hover:text-[#B5121B] flex items-center gap-0.5"
                        >
                          <span>{isRegistered ? 'View Status' : 'Register'}</span>
                          <ChevronRight className="w-3 h-3" />
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
                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <span>Voting Center</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {votingError ? (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-center justify-between">
                <span>{votingError}</span>
                <button onClick={() => loadData(true)} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            ) : votingCampaigns.length === 0 ? (
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-500 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-neutral-400" />
                  <span>No active voting campaigns at this time.</span>
                </div>
                <Link to="/voting" className="font-bold text-purple-600 hover:underline">
                  Past results
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {votingCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-4 rounded-xl border border-[#E2E8F0] flex items-center justify-between hover:border-neutral-300 transition-all bg-white"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#0B192C]">{camp.title}</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{camp.description || 'Active election'}</p>
                    </div>
                    <Link
                      to={`/voting/${camp.id}`}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shrink-0"
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
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#DC2626]" />
                <h2 className="text-sm font-bold text-[#0B192C]">Recent Alerts</h2>
              </div>
              <Link
                to="/notifications"
                className="text-xs font-semibold text-neutral-500 hover:text-[#0B192C]"
              >
                View all
              </Link>
            </div>

            {notifError ? (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-center justify-between">
                <span>{notifError}</span>
                <button onClick={() => loadData(true)} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6 px-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <Bell className="w-6 h-6 text-neutral-300 mx-auto mb-1.5" />
                <div className="text-xs font-semibold text-neutral-600">You're all caught up!</div>
                <p className="text-[11px] text-neutral-400 mt-0.5">No unread notifications.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      !n.isRead
                        ? 'bg-red-50/40 border-red-100'
                        : 'bg-white border-neutral-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#0B192C] line-clamp-1">{n.title}</h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK ACTIONS & PUBLIC DIRECTORY */}
          <div className="bg-gradient-to-br from-[#0B192C] to-[#1E293B] rounded-2xl p-6 text-white shadow-sm space-y-4 text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                Department Showcase
              </span>
              <h3 className="text-base font-black">Student Public Directory</h3>
              <p className="text-xs text-neutral-300 font-normal leading-relaxed">
                Your portfolio is indexed on the official SASI IT student showcase directory for recruiters and faculty.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to={`/students/${profile?.rollNo || ''}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all shadow-md"
              >
                <span>View My Public Showcase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
