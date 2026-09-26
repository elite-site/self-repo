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
} from 'lucide-react';
import { adminApi } from '../services/api';

interface StudentDetailProps {
  studentId: string;
  onBack?: () => void;
}

const ItemStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    APPROVED: {
      label: 'Approved',
      cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    PENDING: {
      label: 'Pending',
      cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      cls: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    },
    CHANGES_REQUESTED: {
      label: 'Changes Requested',
      cls: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    },
    REJECTED: {
      label: 'Rejected',
      cls: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    },
  };
  const s = map[status] ?? {
    label: status,
    cls: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${s.cls}`}>
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
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
      showToast('Please provide a note explaining what needs to be changed.');
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
      showToast('Change request sent to student successfully.');
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
      showToast(`${deleteModal.title} deleted successfully.`);
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-elite-red" />
        <p className="text-xs font-semibold text-neutral-500">Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">Student Not Found</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-5">{error || 'Unable to retrieve student profile.'}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold rounded-xl cursor-pointer"
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
        <div className="fixed top-5 right-5 z-50 bg-[#0B192C] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-3">
          {toast}
        </div>
      )}

      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Roster</span>
            </button>
          )}
          <span className="text-xs text-neutral-400">/</span>
          <span className="text-xs font-mono font-bold text-elite-red uppercase">{student.rollNo}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStudent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold cursor-pointer"
            title="Refresh student data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <a
            href={`/students/${student.rollNo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-elite-red hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <span>Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Student Profile Header Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={student.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-neutral-200 dark:border-neutral-700 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-elite-red flex items-center justify-center text-2xl font-black border border-red-100 dark:border-red-900/40">
                {student.name?.charAt(0) || 'S'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#0B192C] dark:text-white font-display">
                  {student.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {student.status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-1">
                Roll No: <span className="font-bold text-neutral-800 dark:text-neutral-200">{student.rollNo}</span> • Year{' '}
                {student.year} Section {student.section} • {student.branch || 'IT'}
              </p>
              {student.email && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{student.email}</p>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200"
              >
                <Github className="w-3.5 h-3.5" /> GitHub
              </a>
            )}
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200"
              >
                <Linkedin className="w-3.5 h-3.5 text-blue-600" /> LinkedIn
              </a>
            )}
            {profile.portfolioUrl && (
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" /> Website
              </a>
            )}
          </div>
        </div>

        {/* Bio & Skills */}
        {(profile.biography || skillsList.length > 0) && (
          <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Biography</h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {profile.biography || 'No biography written yet.'}
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Skills ({skillsList.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((s: any) => (
                  <span
                    key={s.id || s.skill?.id}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  >
                    {s.skill?.name || s.name}
                  </span>
                ))}
                {skillsList.length === 0 && (
                  <span className="text-xs text-neutral-400 italic">No skills added</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending Revisions Banner (if any item was flagged with CHANGES_REQUESTED) */}
      {pendingChanges.length > 0 && (
        <div className="p-4 bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold text-orange-900 dark:text-orange-200">
              {pendingChanges.length} Revision Request{pendingChanges.length > 1 ? 's' : ''} Pending on Student
            </p>
            <div className="space-y-1 pt-1">
              {pendingChanges.map((item, i) => (
                <div key={i} className="text-orange-800 dark:text-orange-300">
                  • <strong>{item.type} ({item.title}):</strong> {item.note || 'Awaiting revised submission'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Video & Resume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. INTRODUCTION VIDEO CARD */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-elite-red" />
                <h3 className="font-extrabold text-sm text-[#0B192C] dark:text-white">Introduction Video</h3>
              </div>
              {introVideo ? (
                <ItemStatusBadge status={introVideo.status} />
              ) : (
                <span className="text-[11px] font-semibold text-neutral-400">Not Uploaded</span>
              )}
            </div>

            {introVideo ? (
              <div className="space-y-3">
                {/* Video embed / player */}
                <div className="bg-neutral-900 rounded-xl overflow-hidden aspect-video relative flex items-center justify-center">
                  {introVideo.streamUrl ? (
                    <video
                      src={introVideo.streamUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-neutral-400 text-xs flex flex-col items-center gap-2">
                      <Film className="w-8 h-8 opacity-40" />
                      <span>Video uploaded to Drive</span>
                    </div>
                  )}
                </div>

                {/* Metadata & Links */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 pt-1">
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
                        className="text-blue-600 hover:underline font-bold text-xs inline-flex items-center gap-1"
                      >
                        <span>Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Revision Note Callout */}
                {introVideo.status === 'CHANGES_REQUESTED' && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-xl text-xs text-orange-800 dark:text-orange-300">
                    <strong>Revision Note:</strong>{' '}
                    {introVideo.reviewNote || introVideo.changeRequestNote || 'Please re-upload your introduction video.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-neutral-400 text-xs italic">
                No introduction video has been submitted by this student yet.
              </div>
            )}
          </div>

          {/* Video Admin Actions */}
          {introVideo && (
            <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800/80 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 text-orange-700 dark:text-orange-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Request Revision</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Video</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. RESUME CARD */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-elite-red" />
                <h3 className="font-extrabold text-sm text-[#0B192C] dark:text-white">Professional Resume</h3>
              </div>
              {resume ? (
                <ItemStatusBadge status={resume.status} />
              ) : (
                <span className="text-[11px] font-semibold text-neutral-400">Not Uploaded</span>
              )}
            </div>

            {resume ? (
              <div className="space-y-3">
                {/* Resume preview / file box */}
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8FAFC] dark:bg-neutral-800/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/60 text-elite-red flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0B192C] dark:text-white truncate" title={resume.filename}>
                        {resume.filename || 'Student_Resume.pdf'}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </a>
                    )}
                    {resume.fileUrl && (
                      <a
                        href={`${resume.fileUrl}?download=1`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Revision Note Callout */}
                {resume.status === 'CHANGES_REQUESTED' && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-xl text-xs text-orange-800 dark:text-orange-300">
                    <strong>Revision Note:</strong>{' '}
                    {resume.reviewNote || 'The student was asked to revise and re-upload an updated resume.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-neutral-400 text-xs italic">
                No resume has been uploaded by this student yet.
              </div>
            )}
          </div>

          {/* Resume Admin Actions */}
          {resume && (
            <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800/80 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 text-orange-700 dark:text-orange-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Request Revision</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Resume</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. ACHIEVEMENTS SECTION */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-extrabold text-sm text-[#0B192C] dark:text-white">
              Honors & Achievements ({achievements.length})
            </h3>
          </div>
        </div>

        {achievements.length > 0 ? (
          <div className="space-y-3">
            {achievements.map((a: any) => (
              <div
                key={a.id}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8FAFC] dark:bg-neutral-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs sm:text-sm text-[#0B192C] dark:text-white">{a.title}</h4>
                    <ItemStatusBadge status={a.status} />
                    {a.category && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                        {a.category.name}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{a.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 pt-1">
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
                    {a.proofUrl && (
                      <>
                        <span>•</span>
                        <a
                          href={a.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#DC2626] font-bold hover:underline"
                        >
                          <span>Proof Document</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}
                    {a.watchUrl && (
                      <>
                        <span>•</span>
                        <a
                          href={a.watchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                        >
                          <span>Drive Proof</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}
                  </div>

                  {a.status === 'CHANGES_REQUESTED' && (
                    <div className="mt-2 p-2.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-lg text-xs text-orange-800 dark:text-orange-300">
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
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800/80 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 text-orange-700 dark:text-orange-300 text-xs font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request Revision</span>
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
                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 cursor-pointer"
                    title="Delete Achievement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-neutral-400 text-xs italic">
            No honors or achievements have been recorded yet.
          </div>
        )}
      </div>

      {/* 4. CERTIFICATES SECTION */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-elite-red" />
            <h3 className="font-extrabold text-sm text-[#0B192C] dark:text-white">
              Certifications & Credentials ({certificates.length})
            </h3>
          </div>
        </div>

        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((c: any) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8FAFC] dark:bg-neutral-800/30 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <ItemStatusBadge status={c.status} />
                    {c.issuedAt && (
                      <span className="text-[10px] text-neutral-400">
                        {new Date(c.issuedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-[#0B192C] dark:text-white line-clamp-2" title={c.title}>
                    {c.title}
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-1">{c.issuer || 'Credential Issuer'}</p>

                  {/* Certificate Link */}
                  {(c.fileUrl || c.watchUrl) && (
                    <div className="mt-3 flex items-center gap-2">
                      {c.fileUrl && (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626] hover:underline"
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
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                        >
                          <span>Drive File</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {c.status === 'CHANGES_REQUESTED' && (
                    <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-lg text-[11px] text-orange-800 dark:text-orange-300">
                      <strong>Revision Note:</strong> {c.reviewNote || 'Student was asked to revise this certificate.'}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700/60 flex items-center justify-end gap-2">
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-800/80 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 text-orange-700 dark:text-orange-300 text-xs font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request Revision</span>
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
                    className="p-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 cursor-pointer"
                    title="Delete Certificate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-neutral-400 text-xs italic">
            No certificates have been uploaded yet.
          </div>
        )}
      </div>

      {/* 5. PROJECTS SECTION */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-600" />
            <h3 className="font-extrabold text-sm text-[#0B192C] dark:text-white">
              Projects ({projects.length})
            </h3>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p: any) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8FAFC] dark:bg-neutral-800/30 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-xs sm:text-sm text-[#0B192C] dark:text-white">{p.title}</h4>
                    <ItemStatusBadge status={p.status || 'APPROVED'} />
                  </div>
                  {p.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3 mb-2">{p.description}</p>
                  )}
                  {Array.isArray(p.technologies) && p.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.technologies.map((t: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
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
                        className="inline-flex items-center gap-1 font-bold text-neutral-700 dark:text-neutral-200 hover:text-black hover:underline"
                      >
                        <Github className="w-3.5 h-3.5" /> Repository
                      </a>
                    )}
                    {p.driveVideoUrl && (
                      <a
                        href={p.driveVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Demo Video
                      </a>
                    )}
                  </div>

                  {p.status === 'CHANGES_REQUESTED' && (
                    <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-lg text-xs text-orange-800 dark:text-orange-300">
                      <strong>Revision Note:</strong> {p.reviewNote || 'Student was asked to revise this project.'}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700/60 flex items-center justify-end gap-2">
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-800/80 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 text-orange-700 dark:text-orange-300 text-xs font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Request Revision</span>
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
                    className="p-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 cursor-pointer"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-neutral-400 text-xs italic">
            No projects have been added by this student yet.
          </div>
        )}
      </div>

      {/* ── MODAL: REQUEST CHANGES ── */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-extrabold text-[#0B192C] dark:text-white">
                  Request Revision
                </h3>
              </div>
              <button
                onClick={() => setRequestModal(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestChangeSubmit} className="space-y-4 pt-4">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                  Item to revise: <strong className="text-neutral-900 dark:text-white">{requestModal.title}</strong>
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">
                  The student will receive an in-portal notification with your note and instructions to submit a corrected version.
                </p>

                {/* Quick preset suggestions */}
                <div className="mb-3 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">Quick suggestions:</span>
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
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-bold text-[#0B192C] dark:text-white mb-1">
                  Revision Instructions for Student *
                </label>
                <textarea
                  required
                  rows={4}
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Explain clearly what the student should correct before re-uploading..."
                  className="w-full text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl p-3 resize-none focus:outline-none focus:border-orange-500 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setRequestModal(null)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !requestNote.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-extrabold">Delete {deleteModal.title}?</h3>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4 pt-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-800 dark:text-red-300 leading-relaxed">
                <strong>Warning:</strong> This permanently deletes the database entry and removes any associated file from Google Drive storage. This action cannot be undone.
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Optional Reason (sent to student)
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Duplicate upload / Policy violation"
                  className="w-full text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl p-2.5 focus:outline-none focus:border-red-500 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Delete Permanently</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
