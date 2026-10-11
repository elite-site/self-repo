import React from 'react';
import { Mail, Phone, ShieldCheck, Folder } from 'lucide-react';
import { Submission } from '@/types';

interface SubmissionIdentityCardProps {
  submission: Submission;
  hasVideo: boolean;
}

export const SubmissionIdentityCard: React.FC<SubmissionIdentityCardProps> = ({
  submission,
  hasVideo,
}) => {
  return (
    <div className="surface p-4 sm:p-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs items-start">
        <div className="min-w-0">
          <div className="text-ink-muted text-xs font-semibold">Roll number</div>
          <div className="text-ink font-mono font-bold mt-0.5 truncate">{submission.rollNo}</div>
        </div>
        <div className="min-w-0">
          <div className="text-ink-muted text-xs font-semibold">Section &amp; year</div>
          <div className="text-ink font-semibold mt-0.5 truncate">
            {submission.branch}-{submission.section} • Year {submission.year}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-ink-muted text-xs font-semibold flex items-center gap-1">
            <Mail className="w-3 h-3" /> Email
          </div>
          <div className="text-ink mt-0.5 break-all">{submission.email}</div>
        </div>
        <div className="min-w-0">
          <div className="text-ink-muted text-xs font-semibold flex items-center gap-1">
            <Phone className="w-3 h-3" /> Phone
          </div>
          <div className="text-ink font-mono font-semibold mt-0.5">{submission.phoneNo || '—'}</div>
        </div>
        <div className="min-w-0">
          <div className="text-ink-muted text-xs font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Video status
          </div>
          <div
            className={`font-semibold mt-0.5 text-xs ${
              hasVideo ? 'text-status-approved' : 'text-status-rejected'
            }`}
          >
            {hasVideo ? 'Available' : 'No video'}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-edge flex items-center gap-1.5 text-xs text-ink-secondary font-mono min-w-0">
        <Folder className="w-3 h-3 text-ink-muted shrink-0" />
        <span className="truncate">{submission.driveFolderPath}</span>
      </div>
    </div>
  );
};
