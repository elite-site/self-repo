import React from 'react';
import { FileText, CheckCircle2, Clock, Trash2, Download, Loader2 } from 'lucide-react';
import { ResumeData } from '../types';
import { resolveMediaUrl } from '@/shared/api';
import { formatSubmittedAt } from '@/shared/utils/formatDate';

interface ResumeStatusCardProps {
  resume: ResumeData;
  deleting: boolean;
  onDelete: () => void;
}

export const ResumeStatusCard: React.FC<ResumeStatusCardProps> = ({
  resume,
  deleting,
  onDelete,
}) => {
  const isApproved = resume.status === 'APPROVED';
  const url = resume.fileUrl ? resolveMediaUrl(resume.fileUrl) : null;

  return (
    <div className="surface p-6 sm:p-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-soft text-brand rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-body-md font-bold text-ink">
              {resume.filename || 'Curriculum Vitae'}
            </h3>
            <p className="text-label-xs text-ink-muted">
              Uploaded on {formatSubmittedAt(resume.submittedAt || resume.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isApproved ? (
            <span className="badge badge-approved inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
            </span>
          ) : (
            <span className="badge badge-pending inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> In Review
            </span>
          )}

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}

          <button
            onClick={onDelete}
            disabled={deleting}
            className="btn btn-ghost text-status-rejected hover:bg-status-bg-rejected inline-flex items-center gap-1.5 text-xs py-1.5"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Delete</span>
          </button>
        </div>
      </div>

      {resume.reviewNotes && (
        <div className="surface-sunken p-4 rounded-lg border border-edge text-body-sm text-ink-secondary">
          <span className="font-bold text-ink block mb-1">Feedback from reviewers:</span>
          {resume.reviewNotes}
        </div>
      )}
    </div>
  );
};
