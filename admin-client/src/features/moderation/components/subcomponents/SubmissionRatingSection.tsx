import React from 'react';
import { Circle } from 'lucide-react';
import { SubmissionRating } from '@/types';

export const ratingOptions: Array<{
  value: SubmissionRating;
  label: string;
  description: string;
  activeClass: string;
  dotClass: string;
}> = [
  {
    value: 'GOOD',
    label: 'Good',
    description: 'Confident, clear, excellent introduction',
    activeClass: 'bg-status-approved text-on-primary border-status-approved',
    dotClass: 'bg-status-approved',
  },
  {
    value: 'AVERAGE',
    label: 'Average',
    description: 'Acceptable, decent communication',
    activeClass: 'bg-status-pending text-on-primary border-status-pending',
    dotClass: 'bg-status-pending',
  },
  {
    value: 'POOR',
    label: 'Poor',
    description: 'Needs improvement, weak delivery',
    activeClass: 'bg-status-rejected text-on-primary border-status-rejected',
    dotClass: 'bg-status-rejected',
  },
];

interface SubmissionRatingSectionProps {
  rating: SubmissionRating | null;
  onRate: (value: SubmissionRating | null) => void;
  disabled: boolean;
  updating: boolean;
}

export const SubmissionRatingSection: React.FC<SubmissionRatingSectionProps> = ({
  rating,
  onRate,
  disabled,
  updating,
}) => {
  return (
    <div className="surface p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-status-bg-approved text-status-approved flex items-center justify-center shrink-0">
          <Circle className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink tracking-tight">Introduction rating</h3>
          <p className="text-xs text-ink-secondary">Assess the delivery and clarity.</p>
        </div>
      </div>

      <div className="pt-1 space-y-2">
        {ratingOptions.map((opt) => {
          const isActive = rating === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onRate(isActive ? null : opt.value)}
              className={`w-full py-3 px-4 rounded-lg text-left transition-colors flex items-start gap-3 border cursor-pointer disabled:opacity-50 ${
                isActive ? opt.activeClass : 'bg-surface border-edge hover:border-edge-strong'
              }`}
            >
              <Circle
                className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-on-primary' : 'text-ink-muted'}`}
              />
              <div className="min-w-0">
                <div className={`font-semibold text-xs ${isActive ? 'text-on-primary' : 'text-ink'}`}>
                  {opt.label}
                </div>
                <div
                  className={`text-xs mt-0.5 ${
                    isActive ? 'text-on-primary/80' : 'text-ink-secondary'
                  }`}
                >
                  {opt.description}
                </div>
              </div>
            </button>
          );
        })}

        {updating && <div className="text-xs text-ink-muted font-mono pt-1">Saving rating…</div>}
      </div>
    </div>
  );
};
