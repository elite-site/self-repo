import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Film,
  FileText,
  Trophy,
  Award,
  Code2,
  AlertTriangle,
  Trash2,
  MessageSquare,
  Loader2,
  RefreshCw,
  Github,
  Linkedin,
  Globe,
  Calendar,
  Eye,
  Download,
  X,
  GitBranch,
  Star,
  CheckCircle,
  Info,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { LeetCodeIcon, CodeChefIcon } from '../components/icons/PlatformIcons';

interface StudentDetailProps {
  studentId: string;
  onBack?: () => void;
}

const ItemStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    APPROVED: {
      label: 'Approved',
      cls: 'bg-status-bg-approved text-status-approved border-edge',
    },
    PENDING: {
      label: 'Pending',
      cls: 'bg-status-bg-pending text-status-pending border-edge',
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      cls: 'bg-status-bg-review text-status-review border-edge',
    },
    CHANGES_REQUESTED: {
      label: 'Changes Requested',
      cls: 'bg-status-bg-changes text-status-changes border-edge',
    },
    REJECTED: {
      label: 'Rejected',
      cls: 'bg-status-bg-rejected text-status-rejected border-edge',
    },
  };
  const s = map[status] ?? {
    label: status,
    cls: 'bg-surface-canvas text-ink-secondary border-edge',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${s.cls}`}>
      {s.label}
    </span>
  );
};

export const StudentDetail: React.FC<StudentDetailProps> = ({ studentId, onBack }) => {
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modal states
  const [requestModal, setRequestModal] = useState<{
    open: boolean;
    type: string;
    itemId: string;
    title: string;
  } | null>(null);
  const [requestNote, setRequestNote] = useState('');

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    type: string;
    itemId: string;
    title: string;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'media'>('overview');
  const [videoError, setVideoError] = useState(false);
  const [videoRetryKey, setVideoRetryKey] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 6000);
  };

  const loadStudent = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getStudent(studentId);
      setStudent(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load student profile.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  // Handle request change submit
  const handleRequestChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModal || !student) return;
    if (!requestNote.trim()) {
      showToast('Add a note explaining what to change.');
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.requestItemChange(
        student.id,
        requestModal.type,
        requestModal.itemId,
        requestNote.trim()
      );
      showToast('Change request sent.');
      setRequestModal(null);
      setRequestNote('');
      await loadStudent();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to request changes.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete submit
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModal || !student) return;
    setActionLoading(true);
    try {
      await adminApi.deleteStudentItem(
        student.id,
        deleteModal.type,
        deleteModal.itemId,
        deleteReason.trim() || undefined
      );
      showToast(`Deleted ${deleteModal.title}.`);
      setDeleteModal(null);
      setDeleteReason('');
      await loadStudent();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete item.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only" role="status">Loading student profile</span>
        <div className="skeleton h-9 w-56" />
        <div className="bg-surface border border-edge rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="skeleton h-16 w-16 rounded-lg" />
            <div className="space-y-2">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-4 w-64" />
            </div>
          </div>
          <div className="skeleton h-12 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-56 w-full rounded-lg" />
          <div className="skeleton h-56 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8 text-center bg-surface border border-edge rounded-lg max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-status-rejected mx-auto mb-3" />
        <h3 className="text-base font-bold text-ink">Student Not Found</h3>
        <p className="text-xs text-ink-muted mt-1 mb-5">{error || 'Unable to retrieve student profile.'}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-inverse text-ink-inverse text-xs font-bold rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Roster
          </button>
        )}
      </div>
    );
  }

  const profile = student.profile || {};
  const skillsList = profile.skills || [];
  const introVideo = student.introVideos?.[0] || null;
  const resume = student.resumes?.[0] || null;
  const achievements = student.achievements || [];
  const certificates = student.certificates || [];
  const projects = student.projects || [];
  const githubAccount = student.githubAccount || null;
  const githubRepos: any[] = student.githubRepos || [];
  const githubSkills: any[] = student.githubSkills || [];
  const showcasedGithubRepos = githubRepos.filter((r: any) => r.isShowcased);

  // Collect any items that currently have CHANGES_REQUESTED
  const pendingChanges: { type: string; title: string; note?: string }[] = [];
  if (introVideo && introVideo.status === 'CHANGES_REQUESTED') {
    pendingChanges.push({
      type: 'Introduction Video',
      title: 'Introduction Video',
      note: introVideo.reviewNote || introVideo.changeRequestNote || undefined,
    });
  }
  if (resume && resume.status === 'CHANGES_REQUESTED') {
    pendingChanges.push({
      type: 'Resume',
      title: resume.filename || 'Professional Resume',
      note: resume.reviewNote || undefined,
    });
  }
  achievements.forEach((a: any) => {
    if (a.status === 'CHANGES_REQUESTED') {
      pendingChanges.push({
        type: 'Achievement',
        title: a.title,
        note: a.reviewNote || undefined,
      });
    }
  });
  certificates.forEach((c: any) => {
    if (c.status === 'CHANGES_REQUESTED') {
      pendingChanges.push({
        type: 'Certificate',
        title: c.title,
        note: c.reviewNote || undefined,
      });
    }
  });
  projects.forEach((p: any) => {
    if (p.status === 'CHANGES_REQUESTED') {
      pendingChanges.push({
        type: 'Project',
        title: p.title,
        note: p.reviewNote || undefined,
      });
    }
  });

  return (
    <div className="space-y-6 text-left pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-overlay bg-surface-inverse text-ink-inverse text-xs font-semibold px-4 py-3 rounded-lg shadow-modal animate-fade-in flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 hover:opacity-75 rounded ml-2 text-current cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-surface hover:bg-surface-sunken text-ink-secondary text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Roster</span>
            </button>
          )}
          <span className="text-xs text-ink-muted">/</span>
          <span className="text-xs font-mono font-bold text-ink-brand uppercase">{student.rollNo}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStudent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-surface hover:bg-surface-sunken text-ink-secondary text-xs font-semibold cursor-pointer"
            title="Refresh student data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <a
            href={`/students/${student.rollNo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand text-on-primary text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <span>Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Student Profile Header Card */}
      <div className="bg-surface border border-edge rounded-lg p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-lg bg-status-bg-rejected text-ink-brand flex items-center justify-center text-2xl font-semibold border border-edge overflow-hidden shadow-xs shrink-0">
              <span>{student.name?.charAt(0) || 'S'}</span>
              {profile.photoUrl && (
                <img
                  src={profile.photoUrl}
                  alt={student.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-semibold text-ink font-display">
                  {student.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-sunken text-ink-secondary">
                  {student.status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs font-mono text-ink-muted mt-1">
                Roll No: <span className="font-bold text-ink">{student.rollNo}</span> • Year{' '}
                {student.year} Section {student.section} • {student.branch || 'IT'}
              </p>
              {student.email && (
                <p className="text-xs text-ink-muted mt-0.5">{student.email}</p>
              )}
            </div>
          </div>

          {/* Social / Portfolio Links */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <Github className="w-3.5 h-3.5" /> GitHub
              </a>
            )}
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <Linkedin className="w-3.5 h-3.5 text-status-approved" /> LinkedIn
              </a>
            )}
            {profile.leetcodeUrl && (
              <a
                href={profile.leetcodeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-amber-500"
              >
                <LeetCodeIcon className="w-3.5 h-3.5" /> LeetCode
              </a>
            )}
            {profile.codechefUrl && (
              <a
                href={profile.codechefUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-amber-700"
              >
                <CodeChefIcon className="w-3.5 h-3.5" /> CodeChef
              </a>
            )}
            {profile.portfolioUrl && (
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <Globe className="w-3.5 h-3.5 text-status-approved" /> Website
              </a>
            )}
          </div>
        </div>

        {/* Bio & Skills */}
        {(profile.biography || skillsList.length > 0) && (
          <div className="mt-5 pt-5 border-t border-edge grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <h4 className="text-xs font-bold  text-ink-muted mb-1">Biography</h4>
              <p className="text-xs text-ink-secondary leading-relaxed">
                {profile.biography || 'No biography written yet.'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold  text-ink-muted mb-1.5">
                Skills ({skillsList.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((s: any) => (
                  <span
                    key={s.id || s.skill?.id}
                    className="px-2 py-0.5 rounded-md text-xs font-bold bg-surface-sunken text-ink-secondary"
                  >
                    {s.skill?.name || s.name}
                  </span>
                ))}
                {skillsList.length === 0 && (
                  <span className="text-xs text-ink-muted italic">No skills added</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1 border-b border-edge overflow-x-auto" role="tablist" aria-label="Student record sections">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'portfolio', label: 'Portfolio' },
          { id: 'media', label: 'Media' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 -mb-px whitespace-nowrap border-b-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.id === 'overview' && pendingChanges.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-status-bg-changes text-status-changes text-xs font-bold">
                {pendingChanges.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
      {/* Pending Revisions Banner (if any item was flagged with CHANGES_REQUESTED) */}
      {pendingChanges.length > 0 && (
        <div className="p-4 bg-status-bg-changes/80 border border-edge rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-status-changes shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-ink">
              {pendingChanges.length} Revision Request{pendingChanges.length > 1 ? 's' : ''} Pending on Student
            </p>
            <div className="space-y-1 pt-1">
              {pendingChanges.map((item, i) => (
                <div key={i} className="text-ink">
                  • <strong>{item.type} ({item.title}):</strong> {item.note || 'Awaiting revised submission'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

          {/* At a glance */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Projects', value: String(projects.length) },
              { label: 'Achievements', value: String(achievements.length) },
              { label: 'Certificates', value: String(certificates.length) },
              { label: 'Intro Video', value: introVideo ? introVideo.status.replace(/_/g, ' ') : 'Not uploaded' },
              { label: 'Resume', value: resume ? resume.status.replace(/_/g, ' ') : 'Not uploaded' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface border border-edge rounded-lg p-4">
                <p className="text-xs font-bold  text-ink-muted">{stat.label}</p>
                <p className="text-sm font-semibold text-ink mt-1 capitalize">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Video & Resume */}
      {activeTab === 'media' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. INTRODUCTION VIDEO CARD */}
        <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-ink-brand" />
                <h3 className="font-semibold text-sm text-ink">Introduction Video</h3>
              </div>
              {introVideo ? (
                <ItemStatusBadge status={introVideo.status} />
              ) : (
                <span className="text-xs font-semibold text-ink-muted">Not submitted</span>
              )}
            </div>

            {introVideo ? (() => {
              const videoStreamUrl = introVideo.streamUrl || (introVideo.driveFileId ? `/api/public/media/video/${introVideo.driveFileId.trim()}?stream=true` : (introVideo.id ? `/api/public/media/video/${introVideo.id}?stream=true` : null));
              const introDriveUrl = introVideo.watchUrl || (introVideo.driveFileId ? `https://drive.google.com/file/d/${introVideo.driveFileId}/view` : null);

              return (
              <div className="space-y-3">
                {/* Video embed / player */}
                <div className="bg-surface-inverse rounded-xl overflow-hidden aspect-video relative flex items-center justify-center">
                  {videoStreamUrl ? (
                    videoError ? (
                      <div className="text-center p-6 space-y-3">
                        <AlertTriangle className="w-8 h-8 text-status-changes mx-auto" />
                        <p className="text-xs text-ink-muted">Video could not be played in browser directly.</p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setVideoError(false);
                              setVideoRetryKey((k) => k + 1);
                            }}
                            className="btn btn-secondary text-xs inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                          {introDriveUrl && (
                            <a
                              href={introDriveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary text-xs inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open in Drive</span>
                            </a>
                          )}
                          <a
                            href={`${videoStreamUrl}${videoStreamUrl.includes('?') ? '&' : '?'}download=1`}
                            className="btn btn-ghost text-xs inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <video
                        key={`${introVideo.id}-${videoRetryKey}`}
                        src={`${videoStreamUrl}${videoRetryKey > 0 ? (videoStreamUrl.includes('?') ? '&' : '?') + `retry=${videoRetryKey}` : ''}`}
                        controls
                        preload="metadata"
                        playsInline
                        onError={() => setVideoError(true)}
                        className="w-full h-full object-contain bg-black"
                      />
                    )
                  ) : (
                    <div className="text-ink-muted text-xs flex flex-col items-center gap-2">
                      <Film className="w-8 h-8 opacity-40" />
                      <span>Video uploaded</span>
                    </div>
                  )}
                </div>

                {/* Metadata & Links */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted pt-1">
                  <span>
                    Size: {introVideo.sizeMb ? `${introVideo.sizeMb} MB` : 'Recorded video'} • Submitted:{' '}
                    {new Date(introVideo.submittedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {introVideo.watchUrl && (
                      <a
                        href={introVideo.watchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-status-approved hover:underline font-bold text-xs inline-flex items-center gap-1"
                      >
                        <span>Open in Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Revision Note Callout */}
                {introVideo.status === 'CHANGES_REQUESTED' && (
                  <div className="p-3 bg-status-bg-changes border border-edge rounded-xl text-xs text-ink">
                    <strong>Revision Note:</strong>{' '}
                    {introVideo.reviewNote || introVideo.changeRequestNote || 'Please re-upload your introduction video.'}
                  </div>
                )}
              </div>
              );
            })() : (
              <div className="py-12 text-center text-ink-muted text-xs italic">
                No introduction video has been submitted by this student yet.
              </div>
            )}
          </div>

          {/* Video Admin Actions */}
          {introVideo && (
            <div className="pt-4 mt-4 border-t border-edge flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setRequestModal({
                    open: true,
                    type: 'video',
                    itemId: introVideo.id,
                    title: 'Introduction Video',
                  });
                  setRequestNote(introVideo.reviewNote || introVideo.changeRequestNote || '');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Request new upload</span>
              </button>
              <button
                onClick={() => {
                  setDeleteModal({
                    open: true,
                    type: 'video',
                    itemId: introVideo.id,
                    title: 'Introduction Video',
                  });
                  setDeleteReason('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete file</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. RESUME CARD */}
        <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-ink-brand" />
                <h3 className="font-semibold text-sm text-ink">Professional Resume</h3>
              </div>
              {resume ? (
                <ItemStatusBadge status={resume.status} />
              ) : (
                <span className="text-xs font-semibold text-ink-muted">Not submitted</span>
              )}
            </div>

            {resume ? (
              <div className="space-y-3">
                {/* Resume preview / file box */}
                <div className="p-4 rounded-xl border border-edge bg-surface-canvas flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-status-bg-rejected text-ink-brand flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate" title={resume.filename}>
                        {resume.filename || 'Student_Resume.pdf'}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {resume.sizeMb ? `${resume.sizeMb} MB` : 'PDF'} • Submitted{' '}
                        {new Date(resume.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(resume.watchUrl || resume.previewUrl) && (
                      <a
                        href={resume.watchUrl || resume.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-status-bg-approved text-status-approved rounded-lg text-xs font-bold hover:bg-status-bg-approved transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </a>
                    )}
                    {resume.fileUrl && (
                      <a
                        href={`${resume.fileUrl}?download=1`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-sunken text-ink-secondary rounded-lg text-xs font-bold hover:bg-surface-inset transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Revision Note Callout */}
                {resume.status === 'CHANGES_REQUESTED' && (
                  <div className="p-3 bg-status-bg-changes border border-edge rounded-xl text-xs text-ink">
                    <strong>Revision Note:</strong>{' '}
                    {resume.reviewNote || 'The student was asked to revise and re-upload an updated resume.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-ink-muted text-xs italic">
                No resume has been uploaded by this student yet.
              </div>
            )}
          </div>

          {/* Resume Admin Actions */}
          {resume && (
            <div className="pt-4 mt-4 border-t border-edge flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setRequestModal({
                    open: true,
                    type: 'resume',
                    itemId: resume.id,
                    title: 'Resume',
                  });
                  setRequestNote(resume.reviewNote || '');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Request new upload</span>
              </button>
              <button
                onClick={() => {
                  setDeleteModal({
                    open: true,
                    type: 'resume',
                    itemId: resume.id,
                    title: 'Resume',
                  });
                  setDeleteReason('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete file</span>
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 3. ACHIEVEMENTS SECTION */}
      {activeTab === 'portfolio' && (
        <>
      {/* 2.5 GITHUB PORTFOLIO (READ-ONLY) */}
      <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-ink" />
            <h3 className="font-semibold text-sm text-ink">
              GitHub Integration {githubAccount && `(@${githubAccount.login})`}
            </h3>
          </div>
          {githubAccount ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-bg-approved text-status-approved border border-edge">
                <span className="w-1.5 h-1.5 rounded-full bg-status-approved" />
                Connected
              </span>
              <span className="text-xs text-ink-muted">
                Status: <strong className="text-ink-secondary">{githubAccount.syncStatus || 'IDLE'}</strong>
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-inset text-ink-muted border border-edge">
              Not Connected
            </span>
          )}
        </div>

        {githubAccount ? (
          <div className="space-y-5">
            {/* Sync Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-secondary bg-surface-canvas p-3 rounded-lg border border-edge">
              <div>
                <span className="text-ink-muted">GitHub Account: </span>
                <a
                  href={`https://github.com/${githubAccount.login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-ink hover:underline inline-flex items-center gap-1"
                >
                  @{githubAccount.login}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <span>•</span>
              <div>
                <span className="text-ink-muted">Connected: </span>
                <span>{new Date(githubAccount.connectedAt).toLocaleDateString()}</span>
              </div>
              <span>•</span>
              <div>
                <span className="text-ink-muted">Last Synced: </span>
                <span>
                  {githubAccount.lastSyncedAt
                    ? new Date(githubAccount.lastSyncedAt).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              <span>•</span>
              <div>
                <span className="text-ink-muted">Synced Repositories: </span>
                <span className="font-semibold text-ink">{githubRepos.length}</span>
              </div>
            </div>

            {/* Computed Skills */}
            <div>
              <h4 className="text-xs font-bold text-ink mb-2">
                Computed Skills ({githubSkills.length})
              </h4>
              {githubSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {githubSkills.map((gs: any) => (
                    <span
                      key={gs.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-inset text-ink border border-edge"
                    >
                      <span>{gs.skill?.name || 'Skill'}</span>
                      <span className="text-ink-muted text-[10px]">({gs.repoCount} repos)</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted italic">No skills mapped from repository codebase yet.</p>
              )}
            </div>

            {/* Showcased Repositories with Quality Hints */}
            <div>
              <h4 className="text-xs font-bold text-ink mb-2">
                Showcased Repositories ({showcasedGithubRepos.length}/5)
              </h4>
              {showcasedGithubRepos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {showcasedGithubRepos.map((repo: any) => {
                    const isFork = Boolean(repo.isFork);
                    const isLowCommit = Number(repo.commitCount ?? 0) < 3;
                    const isEmpty =
                      Number(repo.commitCount ?? 0) === 0 ||
                      (!repo.primaryLanguage && (!repo.languages || Object.keys(repo.languages || {}).length === 0));

                    return (
                      <div
                        key={repo.id}
                        className="p-3.5 rounded-xl border border-edge bg-surface-canvas flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <a
                              href={repo.htmlUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-xs text-ink hover:underline inline-flex items-center gap-1 min-w-0 truncate"
                            >
                              <span className="truncate">{repo.name}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            <div className="flex items-center gap-2 shrink-0">
                              {repo.primaryLanguage && (
                                <span className="text-[11px] font-semibold text-ink-secondary px-1.5 py-0.5 rounded bg-surface-inset">
                                  {repo.primaryLanguage}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted">
                                <Star className="w-3 h-3 text-status-pending" />
                                {repo.stars ?? 0}
                              </span>
                            </div>
                          </div>

                          {repo.description && (
                            <p className="text-xs text-ink-secondary line-clamp-2 mb-2">
                              {repo.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                            <GitBranch className="w-3 h-3" />
                            <span>{repo.commitCount ?? 0} commits</span>
                          </div>

                          {/* Quality Hints */}
                          {(isFork || isLowCommit || isEmpty) && (
                            <div className="mt-2.5 pt-2 border-t border-edge flex flex-wrap gap-1">
                              {isFork && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-status-bg-review text-status-review border border-edge">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Forked repository
                                </span>
                              )}
                              {isEmpty ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-status-bg-rejected text-status-rejected border border-edge">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Empty repository
                                </span>
                              ) : isLowCommit ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-status-bg-pending text-status-pending border border-edge">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  &lt; 3 commits
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-ink-muted text-xs italic bg-surface-canvas rounded-lg border border-edge">
                  Student has not selected any showcased repositories yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-ink-muted text-xs italic">
            Student has not connected a GitHub account.
          </div>
        )}
      </div>

      <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-status-pending" />
            <h3 className="font-semibold text-sm text-ink">
              Honors & Achievements ({achievements.length})
            </h3>
          </div>
        </div>

        {achievements.length > 0 ? (
          <div className="space-y-3">
            {achievements.map((a: any) => (
              <div
                key={a.id}
                className="p-4 rounded-xl border border-edge bg-surface-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs sm:text-sm text-ink">{a.title}</h4>
                    <ItemStatusBadge status={a.status} />
                    {a.category && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-inset text-ink-secondary">
                        {a.category.name}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-ink-secondary leading-relaxed">{a.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted pt-1">
                    <span>{a.organization || 'Department / Institution'}</span>
                    {a.achievedAt && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(a.achievedAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>

                  {a.status === 'CHANGES_REQUESTED' && (
                    <div className="mt-2 p-2.5 bg-status-bg-changes border border-edge rounded-lg text-xs text-ink">
                      <strong>Revision Note:</strong> {a.reviewNote || 'Student was asked to revise this achievement.'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setRequestModal({
                        open: true,
                        type: 'achievement',
                        itemId: a.id,
                        title: a.title,
                      });
                      setRequestNote(a.reviewNote || '');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request new upload</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeleteModal({
                        open: true,
                        type: 'achievement',
                        itemId: a.id,
                        title: a.title,
                      });
                      setDeleteReason('');
                    }}
                    className="p-1.5 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-ink-muted text-xs italic">
            No honors or achievements have been recorded yet.
          </div>
        )}
      </div>

      {/* 4. CERTIFICATES SECTION */}
      <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-ink-brand" />
            <h3 className="font-semibold text-sm text-ink">
              Certifications & Credentials ({certificates.length})
            </h3>
          </div>
        </div>

        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((c: any) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-edge bg-surface-canvas flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <ItemStatusBadge status={c.status} />
                    {c.issuedAt && (
                      <span className="text-xs text-ink-muted">
                        {new Date(c.issuedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-ink line-clamp-2" title={c.title}>
                    {c.title}
                  </h4>
                  <p className="text-xs text-ink-muted mt-1">{c.issuer || 'Credential Issuer'}</p>

                  {/* Certificate Link */}
                  {(c.fileUrl || c.watchUrl) && (
                    <div className="mt-3 flex items-center gap-2">
                      {c.fileUrl && (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-status-rejected hover:underline"
                        >
                          <span>View Certificate</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {c.watchUrl && (
                        <a
                          href={c.watchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-status-approved hover:underline"
                        >
                          <span>File</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {c.status === 'CHANGES_REQUESTED' && (
                    <div className="mt-3 p-2 bg-status-bg-changes border border-edge rounded-lg text-xs text-ink">
                      <strong>Revision Note:</strong> {c.reviewNote || 'Student was asked to revise this certificate.'}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-edge flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setRequestModal({
                        open: true,
                        type: 'certificate',
                        itemId: c.id,
                        title: c.title,
                      });
                      setRequestNote(c.reviewNote || '');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request new upload</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeleteModal({
                        open: true,
                        type: 'certificate',
                        itemId: c.id,
                        title: c.title,
                      });
                      setDeleteReason('');
                    }}
                    className="p-1 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-ink-muted text-xs italic">
            No certificates have been uploaded yet.
          </div>
        )}
      </div>

      {/* 5. PROJECTS SECTION */}
      <div className="bg-surface border border-edge rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-status-approved" />
            <h3 className="font-semibold text-sm text-ink">
              Projects ({projects.length})
            </h3>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p: any) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-edge bg-surface-canvas flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-xs sm:text-sm text-ink">{p.title}</h4>
                    <ItemStatusBadge status={p.status || 'APPROVED'} />
                  </div>
                  {p.description && (
                    <p className="text-xs text-ink-secondary line-clamp-3 mb-2">{p.description}</p>
                  )}
                  {Array.isArray(p.technologies) && p.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.technologies.map((t: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-xs font-semibold bg-surface-inset text-ink-secondary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs">
                    {p.githubUrl && (
                      <a
                        href={p.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-ink-secondary hover:text-ink hover:underline"
                      >
                        <Github className="w-3.5 h-3.5" /> Repository
                      </a>
                    )}
                    {p.driveVideoUrl && (
                      <a
                        href={p.driveVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-status-approved hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Demo Video
                      </a>
                    )}
                  </div>

                  {p.status === 'CHANGES_REQUESTED' && (
                    <div className="mt-3 p-2 bg-status-bg-changes border border-edge rounded-lg text-xs text-ink">
                      <strong>Revision Note:</strong> {p.reviewNote || 'Student was asked to revise this project.'}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-edge flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setRequestModal({
                        open: true,
                        type: 'project',
                        itemId: p.id,
                        title: p.title,
                      });
                      setRequestNote(p.reviewNote || '');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-edge bg-status-bg-changes hover:bg-status-bg-changes text-status-changes text-xs font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request new upload</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeleteModal({
                        open: true,
                        type: 'project',
                        itemId: p.id,
                        title: p.title,
                      });
                      setDeleteReason('');
                    }}
                    className="p-1 rounded-lg border border-edge bg-status-bg-rejected hover:bg-status-bg-rejected text-status-rejected cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-ink-muted text-xs italic">
            No projects have been added by this student yet.
          </div>
        )}
      </div>

        </>
      )}

      {/* ── MODAL: REQUEST CHANGES ── */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
          <div className="bg-surface text-ink rounded-lg max-w-lg w-full p-6 shadow-2xl border border-edge text-left animate-scale-in duration-fast">
            <div className="flex items-center justify-between pb-3 border-b border-edge">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-status-changes" />
                <h3 className="text-base font-semibold text-ink">
                  Request new upload
                </h3>
              </div>
              <button
                onClick={() => setRequestModal(null)}
                className="p-1 text-ink-muted hover:text-ink-secondary rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestChangeSubmit} className="space-y-4 pt-4">
              <div>
                <p className="text-xs text-ink-muted mb-2">
                  Item to revise: <strong className="text-ink">{requestModal.title}</strong>
                </p>
                <p className="text-xs text-ink-muted mb-3">
                  The student will receive an in-portal notification with your note and instructions to submit a corrected version.
                </p>

                {/* Quick preset suggestions */}
                <div className="mb-3 space-y-1">
                  <span className="text-xs font-bold text-ink-muted ">Quick suggestions:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Please upload a clearer, high-resolution copy',
                      'Dates or organization details need verification',
                      'File is unreadable or truncated, please re-upload',
                      'Please ensure professional formatting is followed',
                    ].map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setRequestNote(preset)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-surface-sunken hover:bg-surface-inset text-ink-secondary font-medium transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-bold text-ink mb-1">
                  Revision Instructions for Student *
                </label>
                <textarea
                  required
                  rows={4}
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Explain clearly what the student should correct before re-uploading..."
                  className="w-full text-xs border border-edge-strong bg-surface rounded-xl p-3 resize-none focus:outline-none focus:border-status-changes text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                <button
                  type="button"
                  onClick={() => setRequestModal(null)}
                  className="px-4 py-2 text-xs font-bold text-ink-secondary hover:bg-surface-sunken rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !requestNote.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-status-solid-changes hover:bg-status-solid-changes disabled:opacity-50 text-on-primary text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Send Revision Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE ITEM ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
          <div className="bg-surface text-ink rounded-lg max-w-md w-full p-6 shadow-2xl border border-edge text-left animate-scale-in duration-fast">
            <div className="flex items-center justify-between pb-3 border-b border-edge">
              <div className="flex items-center gap-2 text-status-rejected">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-semibold">Delete {deleteModal.title}?</h3>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="p-1 text-ink-muted hover:text-ink-secondary rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4 pt-4">
              <div className="p-3 bg-status-bg-rejected border border-edge rounded-xl text-xs text-ink leading-relaxed">
                This permanently deletes the record and its file. It can't be undone.
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1">
                  Optional Reason (sent to student)
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Duplicate upload / Policy violation"
                  className="w-full text-xs border border-edge-strong bg-surface rounded-xl p-2.5 focus:outline-none focus:border-status-rejected text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 text-xs font-bold text-ink-secondary hover:bg-surface-sunken rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand disabled:opacity-50 text-on-primary text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Delete file</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
