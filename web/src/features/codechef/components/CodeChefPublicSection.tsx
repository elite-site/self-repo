import React from 'react';
import { Trophy, Star, CheckCircle, Calendar, ExternalLink } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

export interface CodeChefPublicData {
  handle: string;
  currentRating?: number | null;
  stars?: number | null;
  totalSolved?: number | null;
  totalContests?: number | null;
  globalRank?: number | null;
}

interface CodeChefPublicSectionProps {
  data?: CodeChefPublicData | null;
}

export const CodeChefPublicSection: React.FC<CodeChefPublicSectionProps> = ({ data }) => {
  if (!data) return null;

  return (
    <Card className="p-6 border border-border bg-surface text-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-lg">
            {data.stars ? `${data.stars}★` : 'CC'}
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Competitive Programming</h3>
            <p className="text-xs text-foreground-muted">CodeChef Verified Profile</p>
          </div>
        </div>

        <a
          href={`https://www.codechef.com/users/${data.handle}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          @{data.handle} <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-foreground-muted mb-1">
            <Star className="w-3.5 h-3.5 text-amber-500" /> CodeChef Rating
          </div>
          <span className="text-xl font-bold text-foreground">
            {data.currentRating ? Math.round(data.currentRating) : 'Unrated'}
          </span>
          {data.stars && (
            <p className="text-[11px] text-amber-500 font-semibold mt-0.5">{data.stars} Star Coder</p>
          )}
        </div>

        <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-foreground-muted mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Problems Solved
          </div>
          <span className="text-xl font-bold text-foreground">
            {data.totalSolved?.toLocaleString() || '0'}
          </span>
          <p className="text-[11px] text-foreground-muted mt-0.5">Challenges</p>
        </div>

        <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-foreground-muted mb-1">
            <Calendar className="w-3.5 h-3.5 text-sky-500" /> Contests
          </div>
          <span className="text-xl font-bold text-foreground">
            {data.totalContests?.toLocaleString() || '0'}
          </span>
          <p className="text-[11px] text-foreground-muted mt-0.5">Rated Rounds</p>
        </div>

        <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-foreground-muted mb-1">
            <Trophy className="w-3.5 h-3.5 text-primary" /> Global Rank
          </div>
          <span className="text-xl font-bold text-foreground">
            {data.globalRank ? `#${data.globalRank.toLocaleString()}` : '—'}
          </span>
          <p className="text-[11px] text-foreground-muted mt-0.5">Worldwide</p>
        </div>
      </div>
    </Card>
  );
};
