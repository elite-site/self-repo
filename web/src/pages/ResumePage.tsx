import React, { useEffect, useState, useRef } from 'react';
import { api, resolveMediaUrl } from '../services/api';
import {
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Download,
  Loader2,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { SkeletonPage } from '../components/ui/Skeleton';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { selectVariantsByName } from '../lib/motion';

export const ResumePage: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerItem');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Withdraw the submitted resume. The server deletes the file and DB row. */
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete your resume?',
      description: 'Your uploaded resume will be removed from your profile. This cannot be undone.',
      confirmLabel: 'Delete resume',
      tone: 'danger',
    });
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteResume();
      setResumeData(null);
      setUploadSuccess(false);
      setError(null);
      // Show a transient notice by reloading (will show empty state)
      await loadResume();
      showToast('Your resume has been deleted.');
    } catch (err: any) {
      const notice = err?.response?.data?.message || 'Could not delete your resume. Please try again.';
      setError(notice);
      showToast(notice, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const loadResume = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getResume();
      if (Array.isArray(data)) {
        setResumeData(data.length > 0 ? data[0] : null);
      } else {
        setResumeData(data);
      }
    } catch {
      setError('Could not load resume document status.');
      showToast('Could not load resume document status.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResume();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      // Must return, not just set the error: without it a non-PDF falls through
      // to the upload and the student watches a rejected file upload anyway.
      setError('Only PDF documents are accepted for resumes.');
      showToast('Only PDF documents are accepted for resumes.', 'error');
      // Reset the input so re-picking the same file fires `change` again. The
      // value is only cleared in the upload's `finally`, which a validation
      // rejection never reaches.
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const notice = `Resume PDF must be under 10MB (yours is ${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
      setError(notice);
      showToast(notice, 'error');
      e.target.value = '';
      return;
    }

    setError(null);
    setUploading(true);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      await api.uploadResume(formData);
      setUploadSuccess(true);
      showToast('Resume uploaded successfully!');
      await loadResume();
    } catch (err: any) {
      const notice = err.response?.data?.message || 'Failed to upload resume document.';
      setError(notice);
      showToast(notice, 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <SkeletonPage label="Loading resume" cards={2} rows={3} />;
  }

  const hasValidFile = Boolean(
    resumeData && (resumeData.viewUrl || resumeData.fileUrl || resumeData.hasFile || resumeData.id || resumeData.driveFileId)
  );

  // The API returns a root-relative masked proxy path. It must be resolved against the API
  // origin before it goes into <iframe src>.
  const drivePreview = (resumeData as any)?.previewUrl ||
    ((resumeData as any)?.driveFileId && !(resumeData as any).driveFileId.startsWith('mock_')
      ? `https://drive.google.com/file/d/${(resumeData as any).driveFileId}/preview`
      : null);
  const rawUrl =
    drivePreview ||
    resumeData?.viewUrl ||
    (resumeData?.id ? `/api/public/media/resume/${resumeData.id}` : resumeData?.fileUrl);
  const fileUrl = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : resolveMediaUrl(rawUrl)) : null;
  const embedUrl = fileUrl;

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

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'CHANGES_REQUESTED': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'REJECTED': return <AlertCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'CHANGES_REQUESTED': return 'Revision Requested';
      case 'REJECTED': return 'Rejected';
      case 'APPROVED': return 'Approved';
      default: return status || 'Under Review';
    }
  };

  return (
    <div className="space-y-6 text-left page-enter">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink font-heading">Professional Resume</h1>
          <p className="text-xs text-ink-secondary">
            One-page curriculum vitae rendered for campus recruiters and department records
          </p>
        </div>

        {hasValidFile && (
          <div className="flex items-center gap-3 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(resumeData.status)}`}>
              {getStatusIcon(resumeData.status)}
              <span>{getStatusLabel(resumeData.status)}</span>
            </span>

            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-secondary"
              aria-label="Replace your resume PDF"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resumeData.status === 'CHANGES_REQUESTED' ? 'Re-upload Resume' : 'Replace Resume'}</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting || uploading}
              className="btn btn-ghost text-status-rejected hover:bg-status-bg-rejected hover:border-status-rejected"
              aria-label="Delete your submitted resume"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Delete Resume</span>
            </button>
          </div>
        )}
      </div>

      {resumeData && resumeData.status === 'CHANGES_REQUESTED' && (
        <div className="p-4 bg-status-bg-changes border border-status-changes rounded-lg text-status-changes text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Faculty Revision Requested: </span>
              <span>{resumeData.reviewNote || 'The admin requested updates on your resume. Please upload a revised copy.'}</span>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary text-xs shrink-0"
          >
            Upload Revision
          </button>
        </div>
      )}

      {resumeData && resumeData.status === 'REJECTED' && (
        <div className="p-4 bg-status-bg-rejected border border-status-rejected rounded-lg text-status-rejected text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-bold">Resume Returned by Administrator: </span>
              <span>{resumeData.reviewNote || 'Please upload a revised, single-page PDF document.'}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-status-rejected rounded-lg text-status-rejected text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadResume} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-4 bg-status-bg-approved border border-status-approved rounded-lg text-status-approved text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Resume uploaded successfully!</span>
        </div>
      )}

      {/* VIEWER OR UPLOADER */}
      {!hasValidFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="surface border-2 border-dashed border-edge hover:border-brand bg-surface p-16 flex flex-col items-center text-center justify-center min-h-[350px] transition-colors cursor-pointer shadow-card"
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-card">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-ink font-heading">Upload your Curriculum Vitae / Resume</h3>
          <p className="text-xs text-ink-secondary max-w-sm mt-1.5 mb-6">
            PDF documents only (max 10MB). Clean ATS-friendly single-page format is recommended for technical placements.
          </p>
          <button
            type="button"
            disabled={uploading}
            className="btn btn-primary"
          >
            {uploading ? 'Uploading...' : 'Upload Resume'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="surface p-4 flex items-center justify-between shadow-card">
            <div className="flex items-center gap-3">
              {resumeData.thumbnailUrl ? (
                <div className="w-10 h-14 rounded-lg bg-surface-sunken overflow-hidden shrink-0 border border-edge shadow-sm">
                  <img
                    src={resolveMediaUrl(resumeData.thumbnailUrl)}
                    alt="Resume thumbnail"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-brand-soft text-brand-soft-text">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-xs text-ink font-heading">{resumeData.filename || 'resume.pdf'}</h4>
                <span className="text-[11px] text-ink-secondary">
                  Submitted {resumeData.submittedAt ? new Date(resumeData.submittedAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>
            </div>

            {fileUrl && (
              <div className="flex items-center gap-2">
                <a
                  href={`${fileUrl}${fileUrl.includes('?') ? '&' : '?'}download=1`}
                  rel="noreferrer"
                  className="btn btn-primary"
                  download
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>
            )}
          </div>

          {/* Embedded PDF Viewer */}
          {embedUrl && (
            <div className="surface rounded-lg shadow-card border border-edge overflow-hidden h-[750px] w-full relative">
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                title="Resume Document Viewer"
                allow="autoplay"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumePage;
