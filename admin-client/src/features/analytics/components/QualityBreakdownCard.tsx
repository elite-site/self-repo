import React from 'react';
import { Star } from 'lucide-react';
import { AnalyticsResponse } from '../types';

interface QualityBreakdownCardProps {
  ratings: AnalyticsResponse['ratings'];
  summary: AnalyticsResponse['summary'];
}

export const QualityBreakdownCard: React.FC<QualityBreakdownCardProps> = ({ ratings, summary }) => {
  const ratingTotal = (ratings.good || 0) + (ratings.average || 0) + (ratings.poor || 0);
  const goodPct = ratingTotal > 0 ? Math.round(((ratings.good || 0) / ratingTotal) * 100) : 0;
  const avgPct = ratingTotal > 0 ? Math.round(((ratings.average || 0) / ratingTotal) * 100) : 0;
  const poorPct = ratingTotal > 0 ? Math.round(((ratings.poor || 0) / ratingTotal) * 100) : 0;

  return (
    <div className="p-6 bg-surface border border-edge rounded-xl shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Star className="w-4 h-4 text-status-pending" />
              Evaluation Quality Breakdown
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Faculty ratings distribution across evaluated submissions
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-surface-sunken text-ink-secondary rounded-full border border-edge">
            {ratingTotal} Rated
          </span>
        </div>

        <div className="space-y-4 pt-2">
          {/* Good */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-status-approved flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-status-approved inline-block" />
                GOOD (Exemplary Delivery)
              </span>
              <span className="text-ink-secondary font-bold">
                {ratings.good} ({goodPct}%)
              </span>
            </div>
            <div className="w-full h-3 bg-surface-sunken rounded-full overflow-hidden">
              <div
                className="h-full bg-status-approved rounded-full transition-colors duration-slower"
                style={{ width: `${goodPct}%` }}
              />
            </div>
          </div>

          {/* Average */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-status-pending flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-status-pending inline-block" />
                AVERAGE (Satisfactory Effort)
              </span>
              <span className="text-ink-secondary font-bold">
                {ratings.average} ({avgPct}%)
              </span>
            </div>
            <div className="w-full h-3 bg-surface-sunken rounded-full overflow-hidden">
              <div
                className="h-full bg-status-pending rounded-full transition-colors duration-slower"
                style={{ width: `${avgPct}%` }}
              />
            </div>
          </div>

          {/* Poor */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-status-rejected flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-status-rejected inline-block" />
                POOR (Needs Re-submission)
              </span>
              <span className="text-ink-secondary font-bold">
                {ratings.poor} ({poorPct}%)
              </span>
            </div>
            <div className="w-full h-3 bg-surface-sunken rounded-full overflow-hidden">
              <div
                className="h-full bg-status-rejected rounded-full transition-colors duration-slower"
                style={{ width: `${poorPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-edge flex items-center justify-between text-xs text-ink-muted">
        <span>Unrated pending review:</span>
        <span className="font-semibold text-ink">
          {Math.max(0, summary.totalSubmissions - summary.totalRated)} submissions
        </span>
      </div>
    </div>
  );
};
