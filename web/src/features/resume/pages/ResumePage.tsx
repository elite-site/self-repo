import React from 'react';
import { AlertCircle } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { useResume } from '../hooks/useResume';
import { ResumeUploadCard, ResumeStatusCard } from '../components';

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

  return (
    <div className="space-y-6 text-left page-enter max-w-4xl mx-auto" role="main">
      <div>
        <h1 className="text-headline-md font-black text-ink font-heading">Resume & Credentials</h1>
        <p className="text-body-sm text-ink-muted">
          Upload and maintain your official academic and professional resume for department recruiters
        </p>
      </div>

      {error && (
        <div className="p-4 bg-status-bg-rejected border border-edge-strong rounded-lg text-status-rejected text-body-sm flex items-center justify-between" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={loadResume} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {resumeData && (
        <ResumeStatusCard
          resume={resumeData}
          deleting={deleting}
          onDelete={handleDelete}
        />
      )}

      <ResumeUploadCard
        uploading={uploading}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        hasResume={Boolean(resumeData)}
      />
    </div>
  );
};

export default ResumePage;
