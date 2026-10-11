import React from 'react';
import { MessageSquare, Send, Eraser } from 'lucide-react';

export const REVIEW_PROS = [
  'expressive posture',
  'commanding voice',
  'focused mindset',
  'perfect lighting & background',
];

export const REVIEW_CONS = [
  'unclear thoughts',
  'broken voice',
  'bad lighting',
];

interface SubmissionReviewSectionProps {
  reviewText: string;
  onChangeReviewText: (val: string) => void;
  reviewPros: string[];
  onTogglePros: (tag: string) => void;
  reviewCons: string[];
  onToggleCons: (tag: string) => void;
  onSubmitReview: (clear: boolean) => void;
  sendingReview: boolean;
  disabled: boolean;
}

export const SubmissionReviewSection: React.FC<SubmissionReviewSectionProps> = ({
  reviewText,
  onChangeReviewText,
  reviewPros,
  onTogglePros,
  reviewCons,
  onToggleCons,
  onSubmitReview,
  sendingReview,
  disabled,
}) => {
  return (
    <div className="surface p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-status-bg-rejected text-status-rejected flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink tracking-tight">Send to student</h3>
          <p className="text-xs text-ink-secondary">
            Text feedback plus hashtag keywords the student sees after submitting.
          </p>
        </div>
      </div>

      <textarea
        value={reviewText}
        onChange={(e) => onChangeReviewText(e.target.value)}
        rows={3}
        placeholder="Write your review. What did the student do well, and what to improve?"
        className="textarea bg-surface-sunken"
      />

      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold text-status-approved mb-1.5">
            Pros, select keywords
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REVIEW_PROS.map((tag) => {
              const on = reviewPros.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTogglePros(tag)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                    on
                      ? 'bg-status-approved text-on-primary border-status-approved'
                      : 'badge badge-approved hover:border-status-approved'
                  }`}
                >
                  # {tag}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-status-rejected mb-1.5">
            Cons, select keywords
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REVIEW_CONS.map((tag) => {
              const on = reviewCons.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleCons(tag)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                    on
                      ? 'bg-status-rejected text-on-primary border-status-rejected'
                      : 'badge badge-rejected hover:border-status-rejected'
                  }`}
                >
                  # {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={disabled || sendingReview}
          onClick={() => onSubmitReview(false)}
          className="flex-1 btn btn-primary"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{sendingReview ? 'Sending…' : 'Send to student'}</span>
        </button>
        <button
          type="button"
          disabled={disabled || sendingReview}
          onClick={() => onSubmitReview(true)}
          title="Clear the response (marks the submission as not yet reviewed)"
          className="btn btn-secondary"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </div>
  );
};
