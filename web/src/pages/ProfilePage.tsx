import React, { useEffect, useState, useMemo } from 'react';
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
import { StudentProfile, Project, Certificate, Achievement, StudentIntroVideo } from '../types';
import { getPhotoStyle } from '../utils/photoStyle';
import { formatContentStatus, getContentStatusBadgeClass } from '../utils/status';
import { SkeletonPage } from '../components/ui/Skeleton';
import { createPortal } from 'react-dom';
import { LeetCodeIcon, CodeChefIcon } from '../components/icons/PlatformIcons';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { selectVariantsByName } from '../lib/motion';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [video, setVideo] = useState<StudentIntroVideo | null>(null);
  const [useVideoProxy, setUseVideoProxy] = useState(false);
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [resume, setResume] = useState<any | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setImageError(false);
  }, [profile?.photoUrl]);

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

    const [pResult, rResult, prResult, achResult, certResult, meResult] = await Promise.allSettled([
      api.getProfile(),
      api.getResume(),
      api.getProjects(),
      api.getAchievements(),
      api.getCertificates(),
      api.getMe(),
    ]);

    if (pResult.status === 'fulfilled') {
      const pData = pResult.value;
      setProfile(pData);
      if (pData.changeRequests) setChangeRequests(pData.changeRequests);
    } else {
      setError('Could not load profile details. Please retry.');
    }

    if (meResult.status === 'fulfilled' && meResult.value?.student?.video) {
      setVideo(meResult.value.student.video);
    }

    if (rResult.status === 'fulfilled') {
      const rData = rResult.value;
      const activeResume = Array.isArray(rData) ? (rData.length > 0 ? rData[0] : null) : rData;
      setResume(activeResume);
    }

    if (prResult.status === 'fulfilled' && Array.isArray(prResult.value)) {
      const sorted = [...prResult.value].sort((a, b) => {
        if (typeof (a as any).displayOrder === 'number' && typeof (b as any).displayOrder === 'number') {
          return (a as any).displayOrder - (b as any).displayOrder;
        }
        return new Date((b as any).createdAt || 0).getTime() - new Date((a as any).createdAt || 0).getTime();
      });
      setProjects(sorted);
    }

    if (achResult.status === 'fulfilled' && Array.isArray(achResult.value)) {
      setAchievements(achResult.value);
    }

    if (certResult.status === 'fulfilled' && Array.isArray(certResult.value)) {
      setCertificates(certResult.value);
    }

    setLoading(false);
  };

  const videoPlaybackUrl = useMemo(() => {
    if (!video?.hasFile && !video?.driveFileId) return null;
    const base = resolveMediaUrl('/api/student/submission/media/video');
    const stamp = new Date(video.submittedAt || 0).getTime() || 0;
    const token = localStorage.getItem('student_token');
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const proxyParam = useVideoProxy ? '&proxy=1' : '';
    return `${base}?v=${encodeURIComponent(video.id || '')}-${stamp}${tokenParam}${proxyParam}`;
  }, [video?.id, video?.submittedAt, video?.hasFile, video?.driveFileId, useVideoProxy]);

  const handleVideoPlaybackError = () => {
    if (!useVideoProxy) {
      setUseVideoProxy(true);
      setVideoPlaybackError(false);
    } else {
      setVideoPlaybackError(true);
    }
  };

  const handleRetryVideoPlayback = () => {
    setVideoPlaybackError(false);
    setUseVideoProxy(false);
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Reduced-motion-aware greeting: the stagger container uses the registry
  // from motion.ts; the individual item variants drop travel and keep only
  // opacity changes so they are safe for vestibular sensitivity.
  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerItem');

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
    return <SkeletonPage label="Loading student profile" cards={2} rows={3} />;
  }

  // Helper to map status to badge class
  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'APPROVED': return 'badge badge-approved';
      case 'PENDING':
      case 'SUBMITTED': return 'badge badge-pending';
      case 'REVIEW': return 'badge badge-review';
      case 'REJECTED': return 'badge badge-rejected';
      case 'CHANGES_REQUESTED': return 'badge badge-changes';
      case 'DRAFT': return 'badge badge-draft';
      default: return 'badge badge-draft';
    }
  };

  // Helper to map project/certificate status to badge class
  const getItemStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'APPROVED': return 'badge badge-approved';
      case 'REJECTED': return 'badge badge-rejected';
      case 'PENDING':
      case 'SUBMITTED': return 'badge badge-pending';
      case 'REVIEW': return 'badge badge-review';
      default: return 'badge badge-draft';
    }
  };

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-8 text-ink page-enter pb-12">
      {/* ERROR BANNER WITH INLINE RETRY */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-status-bg-rejected border border-status-rejected rounded-lg text-status-rejected text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchProfileData}
            className="btn btn-danger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* 1. PROFILE HEADER CARD */}
      <div className="surface overflow-hidden rounded-2xl border border-edge shadow-card">
        {/* Cover banner */}
        <div className="h-28 sm:h-36 bg-gradient-to-br from-red-950 via-red-900/80 to-slate-900 relative px-6 sm:px-8 flex items-end">
        </div>

        {/* Profile Details Container */}
        <div className="px-4 sm:px-8 pb-6 pt-0 relative">
          {/* Avatar row — on mobile, avatar + buttons stack vertically */}
          <div className="flex flex-col gap-3 -mt-12 sm:-mt-16 mb-5 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar */}
            <div className="relative shrink-0">
              {profile?.photoUrl && !imageError ? (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-surface shadow-card bg-surface">
                  <img
                    src={resolveMediaUrl(profile.photoUrl)}
                    alt={profile.name}
                    style={getPhotoStyle(profile)}
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-brand-soft text-brand-soft-text flex items-center justify-center font-black text-3xl sm:text-4xl border-4 border-surface shadow-card font-heading">
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

            {/* Action Buttons — on mobile these wrap below the avatar in a row */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/students/${profile?.rollNo || ''}`}
                className="btn btn-secondary text-xs"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Public Showcase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/profile/edit"
                className="btn btn-primary text-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>


          {/* Name & Academic Tags */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-ink font-heading tracking-tight">
                {profile?.name || 'Student'}
              </h1>
              <span className="font-mono text-xs font-semibold text-ink-secondary bg-surface-sunken px-2.5 py-1 rounded-md border border-edge">
                {profile?.rollNo || 'IT Portal'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-secondary">
              <span className="bg-surface-sunken border border-edge px-2.5 py-1 rounded-md">
                Year {profile?.year || '1'} · Section {profile?.section || 'A'}
              </span>
              <span className="bg-surface-sunken border border-edge px-2.5 py-1 rounded-md">
                {profile?.branch || 'Information Technology'}
              </span>
              <span className="bg-surface-sunken border border-edge px-2.5 py-1 rounded-md">
                Sasi Institute of Technology & Engineering
              </span>
            </div>

            {/* Bio */}
            {Boolean(profile?.bio || (profile as any)?.biography) && (
              <p className="text-sm text-ink-secondary leading-relaxed max-w-3xl pt-1">
                {profile?.bio || (profile as any)?.biography}
              </p>
            )}

            {/* Social Links */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {profile?.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary px-3 py-1.5 text-xs"
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
                  className="btn btn-secondary px-3 py-1.5 text-xs"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
              {profile?.leetcodeUrl && (
                <a
                  href={profile.leetcodeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary px-3 py-1.5 text-xs hover:border-amber-500/40"
                >
                  <LeetCodeIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>LeetCode</span>
                </a>
              )}
              {profile?.codechefUrl && (
                <a
                  href={profile.codechefUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary px-3 py-1.5 text-xs hover:border-amber-700/40"
                >
                  <CodeChefIcon className="w-3.5 h-3.5 text-amber-700" />
                  <span>CodeChef</span>
                </a>
              )}
              {profile?.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary px-3 py-1.5 text-xs"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Portfolio Site</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTRODUCTION VIDEO SECTION */}
      <div className="surface p-4 sm:p-6 rounded-2xl border border-edge shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-ink-brand" />
            <h2 className="text-base font-bold text-ink font-heading">Introduction Video</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={getContentStatusBadgeClass(video?.status)}>
              {formatContentStatus(video?.status)}
            </span>
            <Link
              to="/intro-video"
              className="btn btn-secondary px-3 py-1.5 text-xs"
            >
              <span>Go to video</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {(video?.driveFileId && !video.driveFileId.startsWith('mock_')) ? (
          <div className="w-full overflow-hidden rounded-xl border border-edge bg-surface-inverse aspect-[4/3] min-h-[240px] sm:aspect-video sm:min-h-0 shadow-card">
            <iframe
              src={`https://drive.google.com/file/d/${video.driveFileId}/preview`}
              allow="autoplay; fullscreen"
              className="w-full h-full border-0 rounded-xl"
              title="Introduction video preview"
            />
          </div>
        ) : videoPlaybackUrl ? (
          videoPlaybackError ? (
            <div className="w-full rounded-xl border border-status-rejected/30 bg-surface-canvas p-6 flex flex-col items-center justify-center text-center aspect-video space-y-3 shadow-card">
              <AlertCircle className="w-8 h-8 text-status-rejected" />
              <div>
                <p className="text-sm font-semibold text-ink">This video won't play right now.</p>
                <p className="text-xs text-ink-muted mt-1 max-w-sm">
                  Check your connection and try again.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetryVideoPlayback}
                className="btn btn-secondary min-h-[44px] text-xs font-semibold inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-xl border border-edge bg-surface-inverse aspect-video shadow-card">
              <video
                key={videoPlaybackUrl}
                src={videoPlaybackUrl}
                poster={video?.thumbnailUrl ? resolveMediaUrl(video.thumbnailUrl) : undefined}
                controls
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                preload="metadata"
                playsInline
                onError={handleVideoPlaybackError}
                className="w-full h-full object-contain"
              >
                Your browser cannot play this video.
              </video>
            </div>
          )
        ) : (
          <div className="text-center py-8 px-4 bg-surface-sunken rounded-xl border border-dashed border-edge">
            <Video className="w-8 h-8 text-ink-muted mx-auto mb-2" />
            <div className="text-xs font-bold text-ink-secondary">No introduction video uploaded yet</div>
            <p className="text-xs text-ink-muted mt-0.5 mb-3">
              Upload your 60-90 second introduction video to showcase on your profile.
            </p>
            <Link to="/intro-video" className="btn btn-primary text-xs">
              <span>Upload Video</span>
            </Link>
          </div>
        )}
      </div>

      {/* 3. TECHNICAL SKILLS */}
      <div className="surface p-4 sm:p-6 rounded-2xl border border-edge shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ink-brand" />
            <h2 className="text-base font-bold text-ink font-heading">Technical Skills</h2>
          </div>
        </div>

        {profile?.skills && profile.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 bg-surface border border-edge text-ink rounded-lg text-xs font-semibold shadow-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 px-4 bg-surface-sunken rounded-xl border border-dashed border-edge">
            <Sparkles className="w-6 h-6 text-ink-muted mx-auto mb-1.5" />
            <div className="text-xs font-semibold text-ink-secondary">No technical skills added yet</div>
            <p className="text-xs text-ink-muted mt-0.5">
              Connect your GitHub account to automatically detect your skills.
            </p>
          </div>
        )}
      </div>

      {/* 4. FEATURED PROJECTS */}
      <div className="surface p-4 sm:p-6 rounded-2xl border border-edge shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-ink-brand" />
            <div>
              <h2 className="text-base font-bold text-ink font-heading">Featured Projects</h2>
              <p className="text-xs text-ink-secondary">Live builds & repositories</p>
            </div>
          </div>
          <Link
            to="/portfolio"
            className="text-xs font-bold text-ink-brand hover:text-brand-hover flex items-center gap-0.5"
          >
            <span>Manage ({projects.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-8 px-4 bg-surface-sunken rounded-xl border border-dashed border-edge">
            <FolderGit2 className="w-8 h-8 text-ink-muted mx-auto mb-2" />
            <div className="text-xs font-bold text-ink-secondary">No projects added yet</div>
            <p className="text-xs text-ink-muted mt-0.5 mb-3">
              Showcase software applications, AI models, hardware builds, or academic projects.
            </p>
            <Link to="/portfolio" className="btn btn-primary text-xs">
              <span>Add Project</span>
            </Link>
          </div>
        ) : (
          <div className={`grid gap-4 auto-rows-fr ${projects.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {projects.slice(0, 4).map((proj, index) => (
              <div
                key={proj.id}
                className="surface p-4 rounded-xl border border-edge flex flex-col justify-between hover:border-edge-strong transition-colors bg-surface-sunken h-full"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={getItemStatusBadgeClass(proj.status)}>
                      {proj.status}
                    </span>
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                      Project #{index + 1}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-ink font-heading line-clamp-1">{proj.title}</h4>
                  <p className="text-xs text-ink-secondary line-clamp-2">{proj.description}</p>
                </div>

                <div className="pt-3 mt-2 border-t border-edge flex items-center justify-between text-xs">
                  <div className="flex flex-wrap gap-1 max-w-[150px] overflow-hidden">
                    {proj.techStack?.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-surface border border-edge text-ink-secondary px-1.5 py-0.5 rounded"
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
                      className="text-ink-secondary hover:text-ink-brand"
                      aria-label="View project on GitHub"
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

      {/* 5. HONORS & CERTIFICATIONS */}
      <div className="surface p-4 sm:p-6 rounded-2xl border border-edge shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-soft-text" />
            <div>
              <h2 className="text-base font-bold text-ink font-heading">Honors & Certifications</h2>
              <p className="text-xs text-ink-secondary">Credentials and awards</p>
            </div>
          </div>
          <Link
            to="/portfolio"
            className="text-xs font-bold text-ink-brand hover:text-brand-hover flex items-center gap-0.5"
          >
            <span>Manage ({achievements.length + certificates.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {achievements.length === 0 && certificates.length === 0 ? (
          <div className="text-center py-6 px-4 bg-surface-sunken rounded-xl border border-dashed border-edge">
            <Award className="w-6 h-6 text-ink-muted mx-auto mb-1.5" />
            <div className="text-xs font-semibold text-ink-secondary">No credentials uploaded yet</div>
            <p className="text-xs text-ink-muted mt-0.5">
              Upload competition awards, hackathon ranks, and industry certifications.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.slice(0, 3).map((ach) => (
              <div
                key={ach.id}
                className="surface-sunken p-3 rounded-xl border border-edge flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-ink font-heading">{ach.title}</h4>
                  <p className="text-xs text-ink-secondary">{ach.organization || ach.category}</p>
                </div>
                <span className={getItemStatusBadgeClass(ach.status)}>
                  {ach.status}
                </span>
              </div>
            ))}
            {certificates.slice(0, 2).map((cert) => (
              <div
                key={cert.id}
                className="surface-sunken p-3 rounded-xl border border-edge flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-ink font-heading">{cert.title}</h4>
                  <p className="text-xs text-ink-secondary">{cert.issuer}</p>
                </div>
                <span className={getItemStatusBadgeClass(cert.status)}>
                  {cert.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. ACADEMIC INFORMATION, RESUME & OFFICIAL REQUESTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OFFICIAL ACADEMIC INFORMATION */}
        <div className="surface p-4 sm:p-6 rounded-2xl border border-edge shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-ink-brand" />
              <h2 className="text-base font-bold text-ink font-heading">Academic Records</h2>
            </div>
            <button
              onClick={() => handleOpenModal('name')}
              className="text-xs font-bold text-status-rejected hover:underline cursor-pointer"
            >
              Request Change
            </button>
          </div>

          <div className="space-y-3 divide-y divide-edge text-xs">
            <div className="flex items-center justify-between pt-2">
              <span className="text-ink-secondary font-medium">Roll Number</span>
              <span className="font-semibold text-ink font-mono">{profile?.rollNo || '—'}</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-ink-secondary font-medium">Full Name</span>
              <span className="font-bold text-ink">{profile?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-ink-secondary font-medium">Year & Section</span>
              <span className="font-bold text-ink">
                Year {profile?.year || '1'}, Section {profile?.section || 'A'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-ink-secondary font-medium">Department</span>
              <span className="font-bold text-ink">{profile?.branch || 'IT'}</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-ink-secondary font-medium">College Email</span>
              <span className="text-ink-secondary truncate max-w-[180px]">
                {profile?.email || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-ink-secondary font-medium">Institution</span>
              <span className="font-bold text-ink">SASI Institute</span>
            </div>
          </div>
        </div>

        {/* DELIVERABLES & CHANGE REQUESTS */}
        <div className="space-y-6">
          <div className="surface p-4 sm:p-6 rounded-2xl border border-edge shadow-card space-y-4">
            <h2 className="text-base font-bold text-ink font-heading">Resume Document</h2>
            <div className="surface-sunken p-3.5 rounded-xl border border-edge flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-soft text-brand-soft-text">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink font-heading">PDF Resume</h4>
                  <span className="text-xs text-ink-secondary">
                    {(resume?.fileUrl || resume?.driveFileId) ? 'Uploaded Document' : 'Pending upload'}
                  </span>
                </div>
              </div>
              <Link
                to="/resume"
                className="btn btn-secondary px-3 py-1.5 text-xs"
              >
                Go to resume
              </Link>
            </div>
          </div>

          {changeRequests.length > 0 && (
            <div className="surface p-4 sm:p-6 rounded-2xl border border-edge shadow-card space-y-3">
              <h2 className="text-sm font-bold text-ink font-heading">Submitted Change Requests</h2>
              <div className="space-y-2">
                {changeRequests.map((cr) => (
                  <div
                    key={cr.id}
                    className="surface-sunken p-3 rounded-lg border border-edge text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink uppercase text-xs">
                        Field: {cr.fieldName}
                      </span>
                      <span className={getItemStatusBadgeClass(cr.status)}>
                        {cr.status}
                      </span>
                    </div>
                    <div className="text-xs text-ink-secondary">
                      Requested: <span className="font-semibold text-ink">{cr.requestedValue}</span>
                    </div>
                    {cr.reason && (
                      <p className="text-xs text-ink-muted italic">"{cr.reason}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* 3. MODAL DIALOG: REQUEST ACADEMIC DETAIL CHANGE */}
      {modalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-scrim backdrop-blur-xs overflow-y-auto animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !submittingReq) setModalOpen(false);
            }}
          >
            <div
              className="surface bg-surface text-ink max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge animate-scale-in text-left my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-edge">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-status-rejected" />
                  <h3 id="modal-title" className="text-base font-bold text-ink font-heading">Request Academic Record Correction</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-surface-sunken cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reqSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-status-approved mx-auto" />
                  <h4 className="text-base font-bold text-ink font-heading">Request submitted</h4>
                  <p className="text-xs text-ink-secondary max-w-xs mx-auto">
                    Your request has been routed to faculty for review.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitChangeRequest} className="space-y-4 pt-4">
                  {reqError && (
                    <div className="p-3 bg-status-bg-rejected border border-status-rejected rounded-lg text-xs text-status-rejected flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{reqError}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="field-name" className="label font-heading">
                      Field to Correct
                    </label>
                    <select
                      id="field-name"
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                      className="select"
                    >
                      <option value="name">Full Name</option>
                      <option value="year">Year of Study</option>
                      <option value="section">Section</option>
                      <option value="branch">Branch / Department</option>
                      <option value="rollNo">Roll Number</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="requested-value" className="label font-heading">
                      Requested New Value
                    </label>
                    <input
                      id="requested-value"
                      type="text"
                      required
                      value={requestedValue}
                      onChange={(e) => setRequestedValue(e.target.value)}
                      placeholder="Enter the correct spelling or value"
                      className="input"
                    />
                  </div>

                  <div>
                    <label htmlFor="reason" className="label font-heading">
                      Reason for Correction
                    </label>
                    <textarea
                      id="reason"
                      required
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why this change is necessary (e.g. Typo in admission records, section transfer)..."
                      className="textarea"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="btn btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReq || !requestedValue.trim() || !reason.trim()}
                      className="btn btn-primary text-xs"
                    >
                      {submittingReq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Submit Request</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ProfilePage;
