import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit3,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
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
  GraduationCap
} from 'lucide-react';
import { api, resolveMediaUrl } from '../services/api';
import { StudentProfile, Project, Certificate, Achievement } from '../types';
import { getPhotoStyle } from '../utils/photoStyle';
import { BrandedLoading } from '../components/BrandedLoading';

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

    const [pResult, rResult, prResult, achResult, certResult] = await Promise.allSettled([
      api.getProfile(),
      api.getResume(),
      api.getProjects(),
      api.getAchievements(),
      api.getCertificates(),
    ]);

    if (pResult.status === 'fulfilled') {
      const pData = pResult.value;
      setProfile(pData);
      if (pData.changeRequests) setChangeRequests(pData.changeRequests);
    } else {
      setError('Could not load profile details. Please retry.');
    }

    if (rResult.status === 'fulfilled') {
      const rData = rResult.value;
      const activeResume = Array.isArray(rData) ? (rData.length > 0 ? rData[0] : null) : rData;
      setResume(activeResume);
    }

    if (prResult.status === 'fulfilled' && Array.isArray(prResult.value)) {
      setProjects(prResult.value);
    }

    if (achResult.status === 'fulfilled' && Array.isArray(achResult.value)) {
      setAchievements(achResult.value);
    }

    if (certResult.status === 'fulfilled' && Array.isArray(certResult.value)) {
      setCertificates(certResult.value);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleOpenModal = (field = 'name') => {
    setFieldName(field);
    setRequestedValue('');
    setReason('');
    setReqError(null);
    setReqSuccess(false);
    setModalOpen(true);
  };

  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedValue.trim() || !reason.trim()) return;

    setSubmittingReq(true);
    setReqError(null);

    try {
      await api.submitChangeRequest({
        fieldName,
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
      <div className="py-24">
        <BrandedLoading fullScreen={false} message="Loading Student Profile..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#0F172A]">
      {/* ERROR BANNER WITH INLINE RETRY */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#E11D48] shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchProfileData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* 1. LARGE PROFILE BANNER HEADER */}
      <div className="bg-white border border-[#E4E7F2] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Top Crimson Banner Accent */}
        <div className="h-28 sm:h-36 bg-gradient-to-r from-[#1E1B4B] via-[#312E81] to-[#3730A3] relative px-6 sm:px-8 flex items-end">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-white/90 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
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
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-4 border-white shadow-md bg-white shrink-0">
                  <img
                    src={resolveMediaUrl(profile.photoUrl)}
                    alt={profile.name}
                    style={getPhotoStyle(profile)}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-black text-3xl sm:text-4xl border-4 border-white shadow-md shrink-0 font-heading">
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E4E7F2] text-[#0F172A] hover:bg-[#F7F8FC] text-xs font-bold transition-colors"
              >
                <span>Public Showcase</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
              </Link>
              <Link
                to="/profile/edit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold transition-opacity shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>

          {/* Name & Academic Tags */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] font-heading tracking-tight">
                {profile?.name || 'Student'}
              </h1>
              <span className="text-xs font-semibold text-[#475569] bg-[#F7F8FC] px-2.5 py-1 rounded-md border border-[#E4E7F2]">
                {profile?.rollNo || 'IT Portal'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#475569]">
              <span className="bg-rose-50 text-[#E11D48] border border-rose-100 px-2.5 py-1 rounded-md font-bold">
                Year {profile?.year || '1'} · Section {profile?.section || 'A'}
              </span>
              <span className="bg-[#F7F8FC] border border-[#E4E7F2] px-2.5 py-1 rounded-md">
                {profile?.branch || 'Information Technology'}
              </span>
              <span className="bg-[#F7F8FC] border border-[#E4E7F2] px-2.5 py-1 rounded-md">
                Sasi Institute of Technology & Engineering
              </span>
            </div>

            {/* Bio */}
            <div className="pt-2">
              {profile?.bio || (profile as any)?.biography ? (
                <p className="text-sm text-[#475569] leading-relaxed max-w-4xl bg-[#F7F8FC] p-4 rounded-lg border border-[#E4E7F2] italic">
                  "{profile?.bio || (profile as any)?.biography}"
                </p>
              ) : (
                <p className="text-xs text-[#94A3B8] italic bg-[#F7F8FC] p-3 rounded-lg border border-dashed border-[#E4E7F2]">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F8FC] hover:bg-[#EEF2FF] border border-[#E4E7F2] text-xs font-bold text-[#0F172A] transition-colors"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] text-xs font-bold text-[#4F46E5] transition-colors"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-800 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Portfolio Site</span>
                </a>
              )}
              {!profile?.githubUrl && !profile?.linkedinUrl && !profile?.portfolioUrl && (
                <span className="text-xs text-[#94A3B8] italic">
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
          <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                <h2 className="text-base font-bold text-[#0F172A] font-heading">Technical Skills & Stacks</h2>
              </div>
              <Link
                to="/profile/edit"
                className="text-xs font-bold text-[#4F46E5] hover:text-[#3730A3] flex items-center gap-0.5"
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
                    className="px-3 py-1.5 bg-[#EEF2FF] border border-[#E0E7FF] text-[#4F46E5] rounded-md text-xs font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-[#F7F8FC] rounded-lg border border-dashed border-[#E4E7F2]">
                <Sparkles className="w-6 h-6 text-[#94A3B8] mx-auto mb-1.5" />
                <div className="text-xs font-semibold text-[#475569]">No technical skills added yet</div>
                <p className="text-[11px] text-[#94A3B8] mt-0.5 mb-3">
                  Highlight languages, frameworks, databases, and developer tools.
                </p>
                <Link
                  to="/profile/edit"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] text-white rounded-lg text-xs font-bold hover:bg-[#3730A3]"
                >
                  <span>Add Skills</span>
                </Link>
              </div>
            )}
          </div>

          {/* PROJECT SHOWCASE PREVIEW */}
          <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-[#4F46E5]" />
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] font-heading">Featured Projects</h2>
                  <p className="text-xs text-[#475569]">Live builds & repositories</p>
                </div>
              </div>
              <Link
                to="/portfolio"
                className="text-xs font-bold text-[#4F46E5] hover:text-[#3730A3] flex items-center gap-0.5"
              >
                <span>View All ({projects.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-8 px-4 bg-[#F7F8FC] rounded-lg border border-dashed border-[#E4E7F2]">
                <FolderGit2 className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                <div className="text-xs font-bold text-[#475569]">No projects added yet</div>
                <p className="text-[11px] text-[#94A3B8] mt-0.5 mb-3">
                  Showcase software applications, AI models, hardware builds, or academic projects.
                </p>
                <Link
                  to="/portfolio"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-bold hover:bg-[#3730A3] transition-colors shadow-xs"
                >
                  <span>Add Project</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {projects.slice(0, 4).map((proj) => (
                  <div
                    key={proj.id}
                    className="border border-[#E4E7F2] rounded-lg p-4 flex flex-col justify-between hover:border-[#4F46E5]/40 transition-all bg-[#F7F8FC]"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            proj.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : proj.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {proj.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#0F172A] font-heading line-clamp-1">{proj.title}</h4>
                      <p className="text-[11px] text-[#475569] line-clamp-2">{proj.description}</p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-[#E4E7F2] flex items-center justify-between text-xs">
                      <div className="flex flex-wrap gap-1 max-w-[150px] overflow-hidden">
                        {proj.techStack?.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] bg-white border border-[#E4E7F2] text-[#475569] px-1.5 py-0.5 rounded"
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
                          className="text-[#475569] hover:text-[#4F46E5]"
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
          <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] font-heading">Honors & Certifications</h2>
                  <p className="text-xs text-[#475569]">Verified credentials & awards</p>
                </div>
              </div>
              <Link
                to="/portfolio"
                className="text-xs font-bold text-[#4F46E5] hover:text-[#3730A3] flex items-center gap-0.5"
              >
                <span>Manage ({achievements.length + certificates.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {achievements.length === 0 && certificates.length === 0 ? (
              <div className="text-center py-6 px-4 bg-[#F7F8FC] rounded-lg border border-dashed border-[#E4E7F2]">
                <Award className="w-6 h-6 text-[#94A3B8] mx-auto mb-1.5" />
                <div className="text-xs font-semibold text-[#475569]">No credentials uploaded yet</div>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Upload competition awards, hackathon ranks, and industry certifications.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {achievements.slice(0, 3).map((ach) => (
                  <div
                    key={ach.id}
                    className="p-3 rounded-lg border border-[#E4E7F2] flex items-center justify-between bg-[#F7F8FC]"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A] font-heading">{ach.title}</h4>
                      <p className="text-[11px] text-[#475569]">{ach.organization || ach.category}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {ach.status}
                    </span>
                  </div>
                ))}
                {certificates.slice(0, 2).map((cert) => (
                  <div
                    key={cert.id}
                    className="p-3 rounded-lg border border-[#E4E7F2] flex items-center justify-between bg-[#F7F8FC]"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#0F172A] font-heading">{cert.title}</h4>
                      <p className="text-[11px] text-[#475569]">{cert.issuer}</p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-800 bg-[#EEF2FF] border border-[#E0E7FF] px-2 py-0.5 rounded-full">
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
          <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#4F46E5]" />
                <h2 className="text-base font-bold text-[#0F172A] font-heading">Academic Records</h2>
              </div>
              <button
                onClick={() => handleOpenModal('name')}
                className="text-xs font-bold text-[#E11D48] hover:underline cursor-pointer"
              >
                Request Change
              </button>
            </div>

            <div className="space-y-3 divide-y divide-[#E4E7F2] text-xs">
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#475569] font-medium">Roll Number</span>
                <span className="font-semibold text-[#0F172A]">{profile?.rollNo || '—'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#475569] font-medium">Full Name</span>
                <span className="font-bold text-[#0F172A]">{profile?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#475569] font-medium">Year & Section</span>
                <span className="font-bold text-[#0F172A]">
                  Year {profile?.year || '—'}, Section {profile?.section || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#475569] font-medium">Department</span>
                <span className="font-bold text-[#0F172A]">{profile?.branch || 'IT'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#475569] font-medium">College Email</span>
                <span className="text-[#475569] truncate max-w-[180px]">
                  {profile?.email || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#475569] font-medium">Institution</span>
                <span className="font-bold text-[#0F172A]">SASI Institute</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleOpenModal('name')}
                className="w-full py-2 px-3 rounded-lg border border-dashed border-[#E4E7F2] hover:border-[#4F46E5] bg-[#F7F8FC] text-[11px] font-bold text-[#475569] hover:text-[#4F46E5] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Incorrect record? Submit Official Change Request</span>
              </button>
            </div>
          </div>

          {/* DELIVERABLES STATUS: VIDEO & RESUME */}
          <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <h2 className="text-base font-bold text-[#0F172A] font-heading">Portal Deliverables</h2>

            {/* Video status item */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-[#E4E7F2] bg-[#F7F8FC]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-50 text-[#E11D48]">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] font-heading">Introduction Video</h4>
                  <span className="text-[10px] text-[#475569]">
                    {profile?.submission?.status ? `Status: ${profile.submission.status}` : 'Not submitted'}
                  </span>
                </div>
              </div>
              <Link
                to="/intro-video"
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E4E7F2] hover:bg-[#EEF2FF] text-xs font-bold text-[#4F46E5] transition-colors"
              >
                {profile?.submission?.videoUploaded ? 'View / Replace' : 'Upload'}
              </Link>
            </div>

            {/* Resume status item */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-[#E4E7F2] bg-[#F7F8FC]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] font-heading">PDF Resume</h4>
                  <span className="text-[10px] text-[#475569]">
                    {(resume?.fileUrl || resume?.driveFileId) ? 'Uploaded Document' : 'Pending upload'}
                  </span>
                </div>
              </div>
              <Link
                to="/resume"
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E4E7F2] hover:bg-[#EEF2FF] text-xs font-bold text-[#4F46E5] transition-colors"
              >
                {(resume?.fileUrl || resume?.driveFileId) ? 'View / Replace' : 'Upload'}
              </Link>
            </div>
          </div>

          {/* CHANGE REQUESTS AUDIT LOG */}
          {changeRequests.length > 0 && (
            <div className="bg-white border border-[#E4E7F2] rounded-lg p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
              <h2 className="text-sm font-bold text-[#0F172A] font-heading">Submitted Change Requests</h2>
              <div className="space-y-2">
                {changeRequests.map((cr) => (
                  <div
                    key={cr.id}
                    className="p-3 rounded-lg border border-[#E4E7F2] bg-[#F7F8FC] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A] uppercase text-[10px]">
                        Field: {cr.fieldName}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          cr.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cr.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cr.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#475569]">
                      Requested: <span className="font-semibold text-[#0F172A]">{cr.requestedValue}</span>
                    </div>
                    {cr.reason && (
                      <p className="text-[10px] text-[#94A3B8] italic">"{cr.reason}"</p>
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
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl border border-[#E4E7F2] animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7F2]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#E11D48]" />
                <h3 className="text-base font-bold text-[#0F172A] font-heading">Request Academic Record Correction</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F7F8FC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reqSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-[#0F172A] font-heading">Request Submitted Successfully!</h4>
                <p className="text-xs text-[#475569] max-w-xs mx-auto">
                  Your request has been routed to department administrators for verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitChangeRequest} className="space-y-4 pt-4">
                {reqError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-[#E11D48] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{reqError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5 font-heading">
                    Field to Correct
                  </label>
                  <select
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    className="w-full p-2.5 bg-[#F7F8FC] border border-[#E4E7F2] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="name">Full Name</option>
                    <option value="year">Year of Study</option>
                    <option value="section">Section</option>
                    <option value="branch">Branch / Department</option>
                    <option value="rollNo">Roll Number</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5 font-heading">
                    Requested New Value
                  </label>
                  <input
                    type="text"
                    required
                    value={requestedValue}
                    onChange={(e) => setRequestedValue(e.target.value)}
                    placeholder="Enter the correct spelling or value"
                    className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5 font-heading">
                    Reason for Correction
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this change is necessary (e.g. Typo in admission records, section transfer)..."
                    className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-[#475569] hover:bg-[#F7F8FC] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReq || !requestedValue.trim() || !reason.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
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

export default ProfilePage;
