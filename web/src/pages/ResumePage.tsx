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
import { BrandedLoading } from '../components/BrandedLoading';

export const ResumePage: React.FC = () => {
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Withdraw the submitted resume. The server deletes the file and DB row. */
  const handleDelete = async () => {
    if (!window.confirm('Delete your submitted resume? This cannot be undone.')) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await api.deleteResume();
      setResumeData(null);
      setUploadSuccess(false);
      setError(null);
      // Show a transient notice by reloading (will show empty state)
      await loadResume();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not delete your resume. Please try again.');
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
      setError('Only PDF documents are accepted for resumes.');
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Resume PDF must be under 10MB.');
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
      await loadResume();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload resume document.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <BrandedLoading fullScreen={false} message="Loading Resume..." />
      </div>
    );
  }

  const hasValidFile = Boolean(
    resumeData && (resumeData.viewUrl || resumeData.fileUrl || resumeData.hasFile || resumeData.id || resumeData.driveFileId)
  );

  // The API returns a root-relative masked proxy path. It must be resolved against the API
  // origin before it goes into <iframe src>.
  const rawUrl =
    resumeData?.viewUrl ||
    (resumeData?.id ? `/api/public/media/resume/${resumeData.id}` : resumeData?.fileUrl);
  const fileUrl = rawUrl ? resolveMediaUrl(rawUrl) : null;
  const embedUrl = fileUrl;

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] font-heading">Professional Resume</h1>
          <p className="text-xs text-[#475569]">
            One-page curriculum vitae rendered for campus recruiters and department records
          </p>
        </div>

        {hasValidFile && (
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                resumeData.status === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : resumeData.status === 'CHANGES_REQUESTED'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : resumeData.status === 'REJECTED'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {resumeData.status === 'APPROVED' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : resumeData.status === 'CHANGES_REQUESTED' ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              <span>{resumeData.status === 'CHANGES_REQUESTED' ? 'Revision Requested' : (resumeData.status || 'Under Review')}</span>
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E4E7F2] bg-white hover:bg-[#F7F8FC] text-xs font-bold text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replace PDF</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting || uploading}
              title="Delete your submitted resume"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E4E7F2] bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-bold text-[#94A3B8] hover:text-[#E11D48] transition-colors cursor-pointer disabled:opacity-50"
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
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-orange-600 mt-0.5" />
            <div>
              <span className="font-bold">Faculty Revision Requested: </span>
              <span>{resumeData.reviewNote || 'The admin requested updates on your resume. Please click "Replace PDF" to upload a revised copy.'}</span>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 px-3.5 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold rounded-lg text-xs cursor-pointer transition-colors self-start sm:self-auto"
          >
            Upload Revision
          </button>
        </div>
      )}

      {resumeData && resumeData.status === 'REJECTED' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <div>
              <span className="font-bold">Resume Returned by Administrator: </span>
              <span>{resumeData.reviewNote || 'Please upload a revised, single-page PDF document.'}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadResume} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Resume uploaded successfully!</span>
        </div>
      )}

      {/* VIEWER OR UPLOADER */}
      {!hasValidFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#E4E7F2] hover:border-[#4F46E5] bg-white rounded-lg p-16 flex flex-col items-center text-center justify-center min-h-[350px] transition-all cursor-pointer group shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-lg bg-[#E0E7FF]/50 text-[#4F46E5] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-[#0F172A] font-heading">Upload your Curriculum Vitae / Resume</h3>
          <p className="text-xs text-[#475569] max-w-sm mt-1.5 mb-6">
            PDF documents only (max 10MB). Clean ATS-friendly single-page format is recommended for technical placements.
          </p>
          <button
            type="button"
            disabled={uploading}
            className="px-6 py-2.5 bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold rounded-lg shadow-xs transition-opacity cursor-pointer"
          >
            {uploading ? 'Uploading...' : 'Select PDF File'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-[#E4E7F2] rounded-lg p-4 flex items-center justify-between shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              {resumeData.thumbnailUrl ? (
                <div className="w-10 h-14 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-[#E4E7F2] shadow-2xs">
                  <img
                    src={resolveMediaUrl(resumeData.thumbnailUrl)}
                    alt="Resume thumbnail"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#E0E7FF] text-[#4F46E5]">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-xs text-[#0F172A] font-heading">{resumeData.filename || 'resume.pdf'}</h4>
                <span className="text-[11px] text-[#475569]">
                  Submitted {resumeData.submittedAt ? new Date(resumeData.submittedAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>
            </div>

            {fileUrl && (
              <div className="flex items-center gap-2">
                <a
                  href={`${fileUrl}${fileUrl.includes('?') ? '&' : '?'}download=1`}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold transition-opacity shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>
            )}
          </div>

          {/* Embedded PDF Viewer */}
          {embedUrl && (
            <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)] border border-[#E4E7F2] overflow-hidden h-[750px] w-full relative">
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

