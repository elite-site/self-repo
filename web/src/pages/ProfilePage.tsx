import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Edit3,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Github,
  Linkedin,
  Globe,
  Video,
  FileText,
  FolderGit2,
  Award,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Send,
  Loader2,
  X,
  RefreshCw,
  Building,
  GraduationCap
} from 'lucide-react';
import { api } from '../services/api';
import { StudentProfile, Project, Certificate, Achievement } from '../types';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [resume, setResume] = useState<any | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Academic change request modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [fieldName, setFieldName] = useState('name');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pData = await api.getProfile();
      setProfile(pData);
      if (pData.changeRequests) setChangeRequests(pData.changeRequests);
    } catch (err: any) {
      setError('Could not load profile details. Please retry.');
    }

    try {
      const rData = await api.getResume();
      setResume(rData);
    } catch {}

    try {
      const prData = await api.getProjects();
      if (Array.isArray(prData)) setProjects(prData);
    } catch {}

    try {
      const achData = await api.getAchievements();
      if (Array.isArray(achData)) setAchievements(achData);
    } catch {}

    try {
      const certData = await api.getCertificates();
      if (Array.isArray(certData)) setCertificates(certData);
    } catch {}

    setLoading(false);
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleOpenModal = (field = 'name') => {
    setFieldName(field);
    setRequestedValue('');
    setReason('');
    setReqSuccess(false);
    setReqError(null);
    setModalOpen(true);
  };

  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedValue.trim() || !reason.trim() || !profile) return;
    setSubmittingReq(true);
    setReqError(null);

    const currentValue =
      fieldName === 'name'
        ? profile.name
        : fieldName === 'section'
        ? profile.section
        : fieldName === 'year'
        ? String(profile.year)
        : fieldName === 'branch'
        ? profile.branch
        : profile.rollNo;

    try {
      await api.submitChangeRequest({
        fieldName,
        currentValue,
        requestedValue: requestedValue.trim(),
        reason: reason.trim(),
      });
      setReqSuccess(true);
      fetchProfileData();
      setTimeout(() => {
        setModalOpen(false);
      }, 1800);
    } catch (err: any) {
      setReqError(err.response?.data?.message || 'Failed to submit correction request.');
    } finally {
      setSubmittingReq(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-44 bg-slate-200 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 bg-slate-200 rounded-2xl"></div>
          <div className="lg:col-span-4 h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ERROR BANNER WITH INLINE RETRY */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchProfileData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* 1. LARGE PROFILE BANNER HEADER */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        {/* Top Crimson Banner Accent */}
        <div className="h-28 sm:h-36 bg-gradient-to-r from-[#0B192C] via-[#1E293B] to-[#B5121B] relative px-6 sm:px-8 flex items-end">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-white/80 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
              Verified Student Account
            </span>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="px-6 sm:px-8 pb-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-6">
            {/* Avatar */}
            <div className="relative">
              {profile?.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white shadow-md bg-white shrink-0"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center font-black text-3xl sm:text-4xl border-4 border-white shadow-md shrink-0">
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
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to={`/students/${profile?.rollNo || ''}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-[#0B192C] hover:bg-neutral-50 text-xs font-bold transition-colors"
              >
                <span>Public Showcase</span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </Link>
              <Link
                to="/profile/edit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>

          {/* Name & Academic Tags */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B192C] tracking-tight">
                {profile?.name || 'Student'}
              </h1>
              <span className="text-xs font-mono font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
                {profile?.rollNo || 'IT Portal'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-600">
              <span className="bg-red-50 text-[#DC2626] px-2.5 py-1 rounded-md font-bold">
                Year {profile?.year || '1'} · Section {profile?.section || 'A'}
              </span>
              <span className="bg-neutral-100 px-2.5 py-1 rounded-md">
                {profile?.branch || 'Information Technology'}
              </span>
              <span className="bg-neutral-100 px-2.5 py-1 rounded-md">
                Sasi Institute of Technology & Engineering
              </span>
            </div>

            {/* Bio */}
            <div className="pt-2">
              {profile?.bio || (profile as any)?.biography ? (
                <p className="text-sm text-neutral-700 leading-relaxed max-w-4xl bg-neutral-50/80 p-4 rounded-xl border border-neutral-100 italic">
                  "{profile?.bio || (profile as any)?.biography}"
                </p>
              ) : (
                <p className="text-xs text-neutral-400 italic bg-neutral-50 p-3 rounded-xl border border-dashed border-neutral-200">
                  No biography provided yet. Click "Edit Profile" to add your introduction, career interests, and technical focus.
                </p>
              )}
            </div>

            {/* Social Links */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {profile?.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              )}
              {profile?.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
              {profile?.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Portfolio Site</span>
                </a>
              )}
              {!profile?.githubUrl && !profile?.linkedinUrl && !profile?.portfolioUrl && (
                <span className="text-xs text-neutral-400 italic">
                  No professional links added. Add your GitHub or LinkedIn in Edit Profile.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN LAYOUT: LEFT 7 COLS, RIGHT 5 COLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: SKILLS, PROJECTS & ACHIEVEMENTS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TECHNICAL SKILLS CARD */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#DC2626]" />
                <h2 className="text-base font-bold text-[#0B192C]">Technical Skills & Stacks</h2>
              </div>
              <Link
                to="/profile/edit"
                className="text-xs font-bold text-[#DC2626] hover:text-[#B5121B] flex items-center gap-0.5"
              >
                <span>Manage Skills</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {profile?.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <Sparkles className="w-6 h-6 text-neutral-300 mx-auto mb-1.5" />
                <div className="text-xs font-semibold text-neutral-600">No technical skills added yet</div>
                <p className="text-[11px] text-neutral-400 mt-0.5 mb-3">
                  Highlight languages, frameworks, databases, and developer tools.
                </p>
                <Link
                  to="/profile/edit"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DC2626] text-white rounded-lg text-xs font-bold hover:bg-[#B5121B]"
                >
                  <span>Add Skills</span>
                </Link>
              </div>
            )}
          </div>

          {/* PROJECT SHOWCASE PREVIEW */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-purple-600" />
                <div>
                  <h2 className="text-base font-bold text-[#0B192C]">Featured Projects</h2>
                  <p className="text-xs text-neutral-500">Live builds & repositories</p>
                </div>
              </div>
              <Link
                to="/portfolio"
                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
              >
                <span>View All ({projects.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-8 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <FolderGit2 className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <div className="text-xs font-bold text-neutral-700">No projects added yet</div>
                <p className="text-[11px] text-neutral-400 mt-0.5 mb-3">
                  Showcase software applications, AI models, hardware builds, or academic projects.
                </p>
                <Link
                  to="/portfolio"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <span>Add Project</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {projects.slice(0, 4).map((proj) => (
                  <div
                    key={proj.id}
                    className="border border-[#E2E8F0] rounded-xl p-4 flex flex-col justify-between hover:border-neutral-300 transition-all bg-white"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            proj.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {proj.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#0B192C] line-clamp-1">{proj.title}</h4>
                      <p className="text-[11px] text-neutral-500 line-clamp-2">{proj.description}</p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                      <div className="flex flex-wrap gap-1 max-w-[150px] overflow-hidden">
                        {proj.techStack?.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      {proj.githubUrl && (
                        <a
                          href={proj.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-500 hover:text-[#0B192C]"
                        >
                          <Github className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACHIEVEMENTS & CERTIFICATES SUMMARY */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <div>
                  <h2 className="text-base font-bold text-[#0B192C]">Honors & Certifications</h2>
                  <p className="text-xs text-neutral-500">Verified credentials & awards</p>
                </div>
              </div>
              <Link
                to="/portfolio"
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
              >
                <span>Manage ({achievements.length + certificates.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {achievements.length === 0 && certificates.length === 0 ? (
              <div className="text-center py-6 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <Award className="w-6 h-6 text-neutral-300 mx-auto mb-1.5" />
                <div className="text-xs font-semibold text-neutral-600">No credentials uploaded yet</div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Upload competition awards, hackathon ranks, and industry certifications.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {achievements.slice(0, 3).map((ach) => (
                  <div
                    key={ach.id}
                    className="p-3 rounded-xl border border-[#E2E8F0] flex items-center justify-between bg-white"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#0B192C]">{ach.title}</h4>
                      <p className="text-[11px] text-neutral-500">{ach.organization || ach.category}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                      {ach.status}
                    </span>
                  </div>
                ))}
                {certificates.slice(0, 2).map((cert) => (
                  <div
                    key={cert.id}
                    className="p-3 rounded-xl border border-[#E2E8F0] flex items-center justify-between bg-white"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#0B192C]">{cert.title}</h4>
                      <p className="text-[11px] text-neutral-500">{cert.issuer}</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full">
                      {cert.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACADEMIC DETAILS, DELIVERABLES & CHANGE REQUESTS (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* OFFICIAL ACADEMIC INFORMATION */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#0B192C]" />
                <h2 className="text-base font-bold text-[#0B192C]">Academic Records</h2>
              </div>
              <button
                onClick={() => handleOpenModal('name')}
                className="text-xs font-bold text-[#DC2626] hover:underline cursor-pointer"
              >
                Request Change
              </button>
            </div>

            <div className="space-y-3 divide-y divide-neutral-100 text-xs">
              <div className="flex items-center justify-between pt-2">
                <span className="text-neutral-500 font-medium">Roll Number</span>
                <span className="font-mono font-bold text-[#0B192C]">{profile?.rollNo || '—'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-neutral-500 font-medium">Full Name</span>
                <span className="font-bold text-[#0B192C]">{profile?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-neutral-500 font-medium">Year & Section</span>
                <span className="font-bold text-[#0B192C]">
                  Year {profile?.year || '—'}, Section {profile?.section || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-neutral-500 font-medium">Department</span>
                <span className="font-bold text-[#0B192C]">{profile?.branch || 'IT'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-neutral-500 font-medium">College Email</span>
                <span className="font-mono text-neutral-700 truncate max-w-[180px]">
                  {profile?.email || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-neutral-500 font-medium">Institution</span>
                <span className="font-bold text-[#0B192C]">SASI Institute</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleOpenModal('name')}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-400 bg-neutral-50 text-[11px] font-bold text-neutral-600 hover:text-[#0B192C] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-neutral-400" />
                <span>Incorrect record? Submit Official Change Request</span>
              </button>
            </div>
          </div>

          {/* DELIVERABLES STATUS: VIDEO & RESUME */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#0B192C]">Portal Deliverables</h2>

            {/* Video status item */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-50 text-[#DC2626]">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0B192C]">Introduction Video</h4>
                  <span className="text-[10px] text-neutral-500">
                    {profile?.submission?.status ? `Status: ${profile.submission.status}` : 'Not submitted'}
                  </span>
                </div>
              </div>
              <Link
                to="/video"
                className="px-3 py-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-[#0B192C] transition-colors"
              >
                {profile?.submission?.videoUrl ? 'View' : 'Upload'}
              </Link>
            </div>

            {/* Resume status item */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0B192C]">PDF Resume</h4>
                  <span className="text-[10px] text-neutral-500">
                    {resume?.fileUrl ? 'Verified Document' : 'Pending upload'}
                  </span>
                </div>
              </div>
              <Link
                to="/resume"
                className="px-3 py-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-[#0B192C] transition-colors"
              >
                {resume?.fileUrl ? 'View' : 'Upload'}
              </Link>
            </div>
          </div>

          {/* CHANGE REQUESTS AUDIT LOG */}
          {changeRequests.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-[#0B192C]">Submitted Change Requests</h2>
              <div className="space-y-2">
                {changeRequests.map((cr) => (
                  <div
                    key={cr.id}
                    className="p-3 rounded-xl border border-neutral-100 bg-neutral-50/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0B192C] uppercase text-[10px]">
                        Field: {cr.fieldName}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          cr.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cr.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cr.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-600">
                      Requested: <span className="font-semibold text-neutral-900">{cr.requestedValue}</span>
                    </div>
                    {cr.reason && (
                      <p className="text-[10px] text-neutral-400 italic">"{cr.reason}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. MODAL DIALOG: REQUEST ACADEMIC DETAIL CHANGE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
                <h3 className="text-base font-bold text-[#0B192C]">Request Academic Record Correction</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reqSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-[#0B192C]">Request Submitted Successfully!</h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  Your request has been routed to department administrators for verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitChangeRequest} className="space-y-4 pt-4">
                {reqError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{reqError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0B192C] mb-1.5">
                    Field to Correct
                  </label>
                  <select
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-[#CBD5E1] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="name">Full Name</option>
                    <option value="year">Year of Study</option>
                    <option value="section">Section</option>
                    <option value="branch">Branch / Department</option>
                    <option value="rollNo">Roll Number</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B192C] mb-1.5">
                    Requested New Value
                  </label>
                  <input
                    type="text"
                    required
                    value={requestedValue}
                    onChange={(e) => setRequestedValue(e.target.value)}
                    placeholder="Enter the correct spelling or value"
                    className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B192C] mb-1.5">
                    Reason for Correction
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this change is necessary (e.g. Typo in admission records, section transfer)..."
                    className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReq || !requestedValue.trim() || !reason.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {submittingReq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Submit Request</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
