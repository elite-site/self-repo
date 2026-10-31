import React, { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import type { CodeChefContestEntry } from '../types';

interface CodeChefRatingChartProps {
  contests: CodeChefContestEntry[];
}

export const CodeChefRatingChart: React.FC<CodeChefRatingChartProps> = ({ contests }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const ratedContests = contests.filter((c) => c.rating !== null && c.rating > 0);
  if (ratedContests.length < 2) {
    return (
      <Card className="p-6 border border-border bg-surface text-center text-sm text-foreground-muted">
        Participate in at least 2 rated CodeChef contests to view your rating progression chart.
      </Card>
    );
  }

  const ratings = ratedContests.map((c) => c.rating as number);
  const minRating = Math.max(0, Math.floor(Math.min(...ratings) / 100) * 100 - 100);
  const maxRating = Math.ceil(Math.max(...ratings) / 100) * 100 + 100;
  const ratingRange = maxRating - minRating || 1;

  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 25;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const points = ratedContests.map((c, i) => {
    const x = paddingX + (i / (ratedContests.length - 1)) * plotWidth;
    const y = height - paddingY - (((c.rating as number) - minRating) / ratingRange) * plotHeight;
    return { x, y, contest: c };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Card className="p-5 border border-border bg-surface text-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-foreground">Rating Progress</h3>
          <p className="text-xs text-foreground-muted">Performance across {ratedContests.length} rated contests</p>
        </div>
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div className="text-right text-xs">
            <span className="font-semibold text-primary">{points[hoveredIndex].contest.rating}</span>
            <span className="text-foreground-muted ml-1.5">({points[hoveredIndex].contest.name})</span>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          {/* Rating Guideline Lines */}
          {[1400, 1600, 1800, 2000].map((tier) => {
            if (tier < minRating || tier > maxRating) return null;
            const y = height - paddingY - ((tier - minRating) / ratingRange) * plotHeight;
            return (
              <g key={tier}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-border" strokeWidth={1} />
                <text x={paddingX - 6} y={y + 3} fill="currentColor" textAnchor="end" className="text-[10px] text-foreground-muted fill-current opacity-60">
                  {tier}
                </text>
              </g>
            );
          })}

          {/* Trend Polyline */}
          <polyline fill="none" stroke="#6366f1" strokeWidth={2.5} points={polylinePoints} strokeLinecap="round" strokeLinejoin="round" />

          {/* Points */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === idx ? 5 : 3}
              className="fill-indigo-500 cursor-pointer transition-all hover:r-6"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>
      </div>
    </Card>
  );
};
