import React from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

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
}

export const CodeChefDashboardCard: React.FC<CodeChefDashboardCardProps> = ({ data }) => {
  if (!data || !data.connected) {
    return null;
  }

  return (
    <Card className="p-4 border border-border bg-surface text-foreground shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm">
            {data.stars ? `${data.stars}★` : 'CC'}
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1">
              CodeChef
              {data.verified && <ShieldCheck className="w-3.5 h-3.5 text-success" />}
            </h4>
            <p className="text-xs text-foreground-muted">@{data.handle}</p>
          </div>
        </div>

        <Link
          to="/codechef"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-center">
        <div className="p-2 bg-surface-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-xs text-foreground-muted mb-0.5">
            <Star className="w-3 h-3 text-amber-500" /> Rating
          </div>
          <span className="font-bold text-base text-foreground">
            {data.currentRating ? Math.round(data.currentRating) : 'Unrated'}
          </span>
        </div>

        <div className="p-2 bg-surface-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-xs text-foreground-muted mb-0.5">
            <CheckCircle className="w-3 h-3 text-emerald-500" /> Solved
          </div>
          <span className="font-bold text-base text-foreground">
            {data.totalSolved ?? 0}
          </span>
        </div>
      </div>
    </Card>
  );
};
