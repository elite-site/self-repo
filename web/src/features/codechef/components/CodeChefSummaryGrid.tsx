import React from 'react';
import { Trophy, Award, Star, Flame, Calendar, CheckSquare, TrendingUp, Percent } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import type { CodeChefDetails } from '../types';

interface CodeChefSummaryGridProps {
  summary: CodeChefDetails['summary'];
}

export const CodeChefSummaryGrid: React.FC<CodeChefSummaryGridProps> = ({ summary }) => {
  const items = [
    {
      title: 'Current Rating',
      value: summary.currentRating !== null ? summary.currentRating : 'Unrated',
      subtitle: summary.stars ? `${summary.stars}★ CodeChef Division` : 'No rating yet',
      icon: <Star className="w-5 h-5 text-amber-500" />,
      color: 'border-amber-500/20 bg-amber-500/5',
    },
    {
      title: 'Max Rating',
      value: summary.maxRating !== null ? summary.maxRating : '—',
      subtitle: 'Peak Contest Rating',
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      color: 'border-emerald-500/20 bg-emerald-500/5',
    },
    {
      title: 'Global Rank',
      value: summary.globalRanking ? `#${summary.globalRanking.toLocaleString()}` : '—',
      subtitle: summary.topPercentage ? `Top ${summary.topPercentage}%` : 'Worldwide Rank',
      icon: <Trophy className="w-5 h-5 text-primary" />,
      color: 'border-primary/20 bg-primary/5',
    },
    {
      title: 'Problems Solved',
      value: summary.totalSolved.toLocaleString(),
      subtitle: 'Practice & Contests',
      icon: <CheckSquare className="w-5 h-5 text-indigo-500" />,
      color: 'border-indigo-500/20 bg-indigo-500/5',
    },
    {
      title: 'Contests Participated',
      value: summary.totalContests.toLocaleString(),
      subtitle: 'Rated Contests',
      icon: <Calendar className="w-5 h-5 text-sky-500" />,
      color: 'border-sky-500/20 bg-sky-500/5',
    },
    {
      title: 'Submission Streak',
      value: `${summary.currentStreak} days`,
      subtitle: `Longest: ${summary.longestStreak} days`,
      icon: <Flame className="w-5 h-5 text-rose-500" />,
      color: 'border-rose-500/20 bg-rose-500/5',
    },
    {
      title: 'Active Days',
      value: summary.totalActiveDays.toLocaleString(),
      subtitle: 'Problem solving activity',
      icon: <Percent className="w-5 h-5 text-teal-500" />,
      color: 'border-teal-500/20 bg-teal-500/5',
    },
    {
      title: 'Badges Earned',
      value: summary.badgesCount.toLocaleString(),
      subtitle: 'CodeChef Achievements',
      icon: <Award className="w-5 h-5 text-violet-500" />,
      color: 'border-violet-500/20 bg-violet-500/5',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {items.map((it, idx) => (
        <Card key={idx} className={`p-4 border ${it.color} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground-muted">{it.title}</span>
            <div className="p-1.5 rounded-lg bg-surface">{it.icon}</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{it.value}</div>
            <p className="text-xs text-foreground-muted mt-0.5 truncate">{it.subtitle}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
