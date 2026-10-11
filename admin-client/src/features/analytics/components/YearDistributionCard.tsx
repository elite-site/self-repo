import React from 'react';
import { TrendingUp } from 'lucide-react';
import { AnalyticsResponse } from '../types';

interface YearDistributionCardProps {
  yearDistribution: AnalyticsResponse['yearDistribution'];
  totalSubmissions: number;
}

export const YearDistributionCard: React.FC<YearDistributionCardProps> = ({
  yearDistribution,
  totalSubmissions,
}) => {
  return (
    <div className="p-6 bg-surface border border-edge rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-ink-brand" />
            Submission Yield By Academic Year
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Distribution of uploaded videos across cohort years
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-surface-sunken text-ink-secondary rounded-full">
          {totalSubmissions} Total
        </span>
      </div>

      <div className="space-y-4 pt-2">
        {yearDistribution.length === 0 ? (
          <p className="text-sm text-ink-muted py-6 text-center">No submissions recorded yet</p>
        ) : (
          yearDistribution.map((y) => {
            const pct = totalSubmissions > 0
              ? Math.round((y.count / totalSubmissions) * 100)
              : 0;
            return (
              <div key={y.year}>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-ink">
                    Year {y.year} Students
                  </span>
                  <span className="text-ink-secondary font-mono">
                    {y.count} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-surface-sunken rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-colors duration-slower"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-edge flex items-center justify-between text-xs text-ink-muted">
        <span>Active Academic Cohort:</span>
        <span className="font-semibold text-ink">
          Department of Information Technology
        </span>
      </div>
    </div>
  );
};
