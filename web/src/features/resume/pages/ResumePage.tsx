import React from 'react';
import { AlertCircle, FileCheck2, Sparkles, Download, CheckCircle2 } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
import { useResume } from '../hooks/useResume';
import { ResumeUploadCard, ResumeStatusCard } from '../components';
import { resolveMediaUrl } from '@/shared/api';

export const ResumePage: React.FC = () => {
  const {
    resumeData,
    loading,
    uploading,
    deleting,
    error,
    fileInputRef,
    loadResume,
    handleDelete,
    handleFileSelect,
  } = useResume();

  if (loading) {
    return <SkeletonPage label="Loading resume details" cards={2} rows={3} />;
  }

  const downloadUrl = resumeData?.fileUrl ? resolveMediaUrl(resumeData.fileUrl) : null;

  return (
    <div className="space-y-8 text-left page-enter max-w-6xl mx-auto pb-12" role="main">
      {/* 1. ASYMMETRICAL ATS SCORE & DOWNLOAD HEADER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <div className="space-y-4">
            <header className="space-y-2">
              <span className="badge badge-brand text-xs font-semibold">Career Credentials</span>
              <h1 className="text-headline-md font-black text-ink font-heading sm:text-headline-lg">
                Resume & ATS Readiness
              </h1>
              <p className="text-body-md text-ink-secondary max-w-xl">
                Upload and maintain your official academic and professional resume for department campus placement drives.
              </p>
            </header>

            {resumeData && (
              <div className="card-lift">
                <ResumeStatusCard
                  resume={resumeData}
                  deleting={deleting}
                  onDelete={handleDelete}
                />
              </div>
            )}
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <FileCheck2 size={16} aria-hidden="true" />
                  ATS Readiness
                </span>
                <span className={`badge ${resumeData?.status === 'APPROVED' ? 'badge-approved' : 'badge-pending'} text-[11px]`}>
                  {resumeData?.status === 'APPROVED' ? 'Verified' : resumeData ? 'Under Review' : 'Missing'}
                </span>
              </div>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Recruiters filter resumes using Automated Tracking Systems (ATS). Use clean headers, bulleted impact metrics, and standard PDF formatting.
              </p>
              <div className="space-y-1.5 pt-1 text-label-xs font-mono text-ink-secondary">
                <div>Format: <span className="font-bold text-ink">Standard PDF</span></div>
                <div>Status: <span className="text-ink">{resumeData?.status || 'NOT UPLOADED'}</span></div>
              </div>
            </div>

            {downloadUrl && (
              <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between">
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 min-h-[36px]"
                >
                  <Download size={13} />
                  <span>Download Active Resume</span>
                </a>
              </div>
            )}
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-2xl text-status-rejected text-body-sm flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={loadResume} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* 2. MASONRY SECTION EDITOR & GUIDELINES */}
      <MasonryGrid cols={2}>
        <MasonryItem>
          <div className="card-lift">
            <ResumeUploadCard
              uploading={uploading}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              hasResume={Boolean(resumeData)}
            />
          </div>
        </MasonryItem>

        <MasonryItem>
          <div className="surface p-6 sm:p-8 space-y-4 rounded-2xl border border-edge card-lift">
            <h3 className="font-heading text-body-md font-bold text-ink flex items-center gap-2">
              <Sparkles size={16} className="text-brand" />
              ATS Best Practices & Guidelines
            </h3>
            <ul className="space-y-2.5 text-xs text-ink-secondary leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-status-approved shrink-0 mt-0.5" />
                <span><strong>Clear Section Headings:</strong> Education, Technical Skills, Projects, Experience, and Certifications.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-status-approved shrink-0 mt-0.5" />
                <span><strong>Impact Statements:</strong> Use action verbs and quantify outcomes (e.g., "Reduced latency by 35%").</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-status-approved shrink-0 mt-0.5" />
                <span><strong>Machine Readable:</strong> Avoid tables, multi-column nesting, icons as text replacements, or scanned images.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-status-approved shrink-0 mt-0.5" />
                <span><strong>Live Links:</strong> Ensure GitHub profile, LinkedIn, and project deployment URLs are hyperlinked.</span>
              </li>
            </ul>
          </div>
        </MasonryItem>
      </MasonryGrid>
    </div>
  );
};

export default ResumePage;
