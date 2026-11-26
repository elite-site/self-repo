import React from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/lib/cn';

export interface CodeChefDashboardSummary {
  connected: boolean;
  verified: boolean;
  handle?: string;
  currentRating?: number | null;
  stars?: number | null;
  totalSolved?: number | null;
}

interface CodeChefDashboardCardProps {
  data?: CodeChefDashboardSummary | null;
  className?: string;
}

export const CodeChefDashboardCard: React.FC<CodeChefDashboardCardProps> = ({ data, className }) => {
  if (!data || !data.connected) {
    return null;
  }

  return (
    <Card className={cn('rounded-xl p-4 sm:p-5 border border-edge bg-surface text-ink shadow-xs flex flex-col justify-between gap-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 shrink-0 rounded-lg bg-status-bg-pending text-status-pending flex items-center justify-center font-ui font-bold text-sm tabular-nums">
            {data.stars ? `${data.stars}★` : 'CC'}
          </div>
          <div className="min-w-0">
            <h4 className="font-ui font-semibold text-sm text-ink flex items-center gap-1">
              <span>CodeChef</span>
              {data.verified && <ShieldCheck className="w-3.5 h-3.5 text-status-approved shrink-0" aria-label="Verified" />}
            </h4>
            <p className="text-xs text-ink-muted truncate">@{data.handle}</p>
          </div>
        </div>

        <Link
          to="/codechef"
          className="text-xs text-brand hover:underline inline-flex items-center gap-1 font-semibold shrink-0"
        >
          <span>View</span>
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-edge text-center">
        <div className="p-2 bg-surface-sunken rounded-lg">
          <div className="flex items-center justify-center gap-1 text-xs text-ink-muted mb-0.5">
            <Star className="w-3 h-3 text-status-pending" aria-hidden="true" />
            <span>Rating</span>
          </div>
          <span className="font-ui font-bold text-base text-ink tabular-nums">
            {data.currentRating ? Math.round(data.currentRating) : 'Unrated'}
          </span>
        </div>

        <div className="p-2 bg-surface-sunken rounded-lg">
          <div className="flex items-center justify-center gap-1 text-xs text-ink-muted mb-0.5">
            <CheckCircle className="w-3 h-3 text-status-approved" aria-hidden="true" />
            <span>Solved</span>
          </div>
          <span className="font-ui font-bold text-base text-ink tabular-nums">
            {data.totalSolved ?? 0}
          </span>
        </div>
      </div>
    </Card>
  );
};
