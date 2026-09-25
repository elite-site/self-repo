import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Download,
  Loader2,
  RotateCcw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const ResumePage: React.FC = () => {
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return;
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
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  const hasValidFile = Boolean(resumeData && resumeData.driveFileId);
  const fileUrl = resumeData?.fileUrl || (resumeData?.driveFileId ? `/api/public/media/resume/${resumeData.driveFileId}` : null);

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B192C]">Professional Resume</h1>
          <p className="text-xs text-neutral-500">
            One-page curriculum vitae rendered for campus recruiters and department records
          </p>
        </div>

        {hasValidFile && (
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                resumeData.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : resumeData.status === 'REJECTED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {resumeData.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              <span>{resumeData.status || 'Under Review'}</span>
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-bold text-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replace PDF</span>
            </button>
          </div>
        )}
      </div>

      {resumeData && resumeData.status === 'REJECTED' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <div>
              <span className="font-bold">Resume Returned by Administrator: </span>
              <span>{resumeData.reviewNote || 'Please upload a revised, single-page PDF document.'}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadResume} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Resume uploaded successfully!</span>
        </div>
      )}

      {/* VIEWER OR UPLOADER */}
      {!hasValidFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-300 hover:border-[#DC2626] bg-white rounded-2xl p-16 flex flex-col items-center text-center justify-center min-h-[350px] transition-all cursor-pointer group"
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-[#0B192C]">Upload your Curriculum Vitae / Resume</h3>
          <p className="text-xs text-neutral-500 max-w-sm mt-1.5 mb-6">
            PDF documents only (max 10MB). Clean ATS-friendly single-page format is recommended for technical placements.
          </p>
          <button
            type="button"
            disabled={uploading}
            className="px-6 py-2.5 bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {uploading ? 'Uploading...' : 'Select PDF File'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#0B192C]">{resumeData.filename || 'resume.pdf'}</h4>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Submitted {resumeData.submittedAt ? new Date(resumeData.submittedAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>
            </div>

            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-neutral-800 text-white text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open / Download PDF</span>
              </a>
            )}
          </div>

          {/* Embedded PDF iframe or preview card */}
          {fileUrl && (
            <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] overflow-hidden h-[750px] w-full">
              <iframe src={fileUrl} className="w-full h-full border-none" title="Resume Document Viewer" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
