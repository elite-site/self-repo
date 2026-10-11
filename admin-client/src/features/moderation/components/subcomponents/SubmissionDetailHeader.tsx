import React from 'react';
import { X, UserRound } from 'lucide-react';
import { Submission } from '@/types';
import { ratingOptions } from './SubmissionRatingSection';

interface SubmissionDetailHeaderProps {
  submission: Submission;
  rating: string | null;
  onClose: () => void;
}

export const SubmissionDetailHeader: React.FC<SubmissionDetailHeaderProps> = ({
  submission,
  rating,
  onClose,
}) => {
  const activeRating = ratingOptions.find((r) => r.value === rating);
  const initials = submission.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="p-4 sm:p-5 border-b border-edge bg-surface-sunken flex items-center justify-between flex-none shrink-0">
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="w-11 h-11 rounded-xl bg-brand text-on-primary flex items-center justify-center text-base font-semibold shrink-0">
          {initials || <UserRound className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-ink tracking-tight truncate">
              {submission.name}
            </h2>
            {activeRating ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold shrink-0 ${
                  activeRating.value === 'GOOD'
                    ? 'badge badge-approved'
                    : activeRating.value === 'AVERAGE'
                    ? 'badge badge-pending'
                    : 'badge badge-rejected'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeRating.dotClass}`} />
                {activeRating.label}
              </span>
            ) : (
              <span className="badge badge-draft shrink-0">Not rated</span>
            )}
          </div>
          <div className="text-xs text-ink-secondary mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
            <span className="font-semibold">{submission.rollNo}</span>
            <span>•</span>
            <span>
              {submission.branch}-{submission.section} (Year {submission.year})
            </span>
          </div>
        </div>
      </div>

      <button onClick={onClose} aria-label="Close modal" className="btn btn-ghost p-2">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
