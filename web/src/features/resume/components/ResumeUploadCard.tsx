import React from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

interface ResumeUploadCardProps {
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasResume?: boolean;
}

export const ResumeUploadCard: React.FC<ResumeUploadCardProps> = ({
  uploading,
  fileInputRef,
  onFileSelect,
  hasResume,
}) => {
  return (
    <div className="surface p-6 sm:p-8 space-y-4">
      <h2 className="font-heading text-body-md font-bold text-ink">
        {hasResume ? 'Replace Resume' : 'Upload Resume'}
      </h2>
      <p className="text-body-sm text-ink-secondary">
        Upload your latest professional resume in PDF format (maximum 10 MB).
      </p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept="application/pdf"
        className="hidden"
        id="resume-file-input"
      />

      <label
        htmlFor="resume-file-input"
        className="border-2 border-dashed border-edge hover:border-brand rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group bg-surface-sunken"
      >
        {uploading ? (
          <Loader2 className="w-10 h-10 text-brand animate-spin mb-3" />
        ) : (
          <UploadCloud className="w-10 h-10 text-ink-muted group-hover:text-brand transition-colors mb-3" />
        )}
        <span className="font-bold text-body-sm text-ink group-hover:text-brand transition-colors">
          {uploading ? 'Uploading resume…' : 'Choose a PDF file or drag and drop'}
        </span>
        <span className="text-label-xs text-ink-muted mt-1">PDF up to 10 MB</span>
      </label>
    </div>
  );
};
