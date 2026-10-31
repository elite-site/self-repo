import React, { useMemo } from 'react';
import { Card } from '@/shared/ui/Card';
import type { CodeChefDetails } from '../types';

interface CodeChefHeatmapProps {
  heatmap: CodeChefDetails['heatmap'];
}

export const CodeChefHeatmap: React.FC<CodeChefHeatmapProps> = ({ heatmap }) => {
  const contributionsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of heatmap.dailyContributions || []) {
      map.set(d.date, d.count);
    }
    return map;
  }, [heatmap.dailyContributions]);

  // Generate 52 weeks of dates leading up to today
  const weeks = useMemo(() => {
    const days: Array<{ date: string; count: number; level: number }> = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = contributionsMap.get(dateStr) || 0;
      let level = 0;
      if (count >= 7) level = 4;
      else if (count >= 4) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;
      days.push({ date: dateStr, count, level });
    }

    const weekBuckets: Array<typeof days> = [];
    for (let i = 0; i < days.length; i += 7) {
      weekBuckets.push(days.slice(i, i + 7));
    }
    return weekBuckets;
  }, [contributionsMap]);

  const levelColors = [
    'bg-surface-muted/60 border-border/40',
    'bg-emerald-300 dark:bg-emerald-900 border-emerald-400/30',
    'bg-emerald-400 dark:bg-emerald-700 border-emerald-500/30',
    'bg-emerald-500 dark:bg-emerald-600 border-emerald-600/30',
    'bg-emerald-600 dark:bg-emerald-500 border-emerald-700/30',
  ];

  return (
    <Card className="p-5 border border-border bg-surface text-foreground shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-bold text-base text-foreground">Submission Heatmap</h3>
          <p className="text-xs text-foreground-muted">
            {heatmap.totalSubmissions.toLocaleString()} submissions in the last 12 months • Current streak: {heatmap.currentStreak} days
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <span>Less</span>
          {levelColors.map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm border ${color}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-grid grid-flow-col gap-1 min-w-[700px]">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-rows-7 gap-1">
              {week.map((day, dIdx) => (
                <div
                  key={dIdx}
                  className={`w-3 h-3 rounded-sm border transition-colors ${levelColors[day.level]}`}
                  title={`${day.date}: ${day.count} submissions`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
