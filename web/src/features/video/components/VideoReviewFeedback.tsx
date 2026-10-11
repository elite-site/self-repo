import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { StudentSubmission } from '../types';

interface VideoReviewFeedbackProps {
  submission: StudentSubmission | null;
}

export const VideoReviewFeedback: React.FC<VideoReviewFeedbackProps> = ({ submission }) => {
  if (!submission || (!submission.reviewText && !submission.adminNotes && !submission.reviewPros?.length && !submission.reviewCons?.length)) {
    return null;
  }

  return (
    <div className="surface p-6 space-y-4">
      <h2 className="text-sm font-bold text-ink font-heading">Faculty Review Feedback</h2>

      {submission.reviewText && (
        <div className="p-3.5 bg-surface-canvas rounded-lg border border-edge text-xs text-ink-secondary italic">
          "{submission.reviewText}"
        </div>
      )}

      {submission.adminNotes && (
        <div className="p-3.5 bg-status-bg-changes rounded-lg border border-edge text-xs text-ink">
          <span className="font-bold block mb-1">Reviewer Note:</span>
          {submission.adminNotes}
        </div>
      )}

      {submission.reviewPros && submission.reviewPros.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5 text-status-approved" /> Strengths
          </span>
          <ul className="space-y-1">
            {submission.reviewPros.map((pro, i) => (
              <li key={i} className="text-xs text-ink-secondary pl-2 border-l-2 border-status-approved">
                {pro}
              </li>
            ))}
          </ul>
        </div>
      )}

      {submission.reviewCons && submission.reviewCons.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <span className="text-xs font-bold text-ink flex items-center gap-1">
            <ThumbsDown className="w-3.5 h-3.5 text-status-pending" /> Suggestions
          </span>
          <ul className="space-y-1">
            {submission.reviewCons.map((con, i) => (
              <li key={i} className="text-xs text-ink-secondary pl-2 border-l-2 border-status-pending">
                {con}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
