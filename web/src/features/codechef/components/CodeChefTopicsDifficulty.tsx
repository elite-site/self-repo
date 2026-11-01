import React from 'react';
import { Card } from '@/shared/ui/Card';
import type { CodeChefDetails } from '../types';

interface CodeChefTopicsDifficultyProps {
  difficulty: CodeChefDetails['difficulty'];
  topics: CodeChefDetails['topics'];
}

export const CodeChefTopicsDifficulty: React.FC<CodeChefTopicsDifficultyProps> = ({ difficulty = {}, topics = [] }) => {
  const easy = difficulty?.Easy || difficulty?.easy || 0;
  const medium = difficulty?.Medium || difficulty?.medium || 0;
  const hard = difficulty?.Hard || difficulty?.hard || 0;
  const total = easy + medium + hard || 1;

  const topTopics = (topics || []).slice(0, 6);
  const maxTopicCount = topTopics.length > 0 ? Math.max(...topTopics.map((t) => t.count), 1) : 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Difficulty Breakdown */}
      <Card className="p-5 border border-border bg-surface text-foreground shadow-sm">
        <h3 className="font-bold text-base text-foreground mb-1">Difficulty Breakdown</h3>
        <p className="text-xs text-foreground-muted mb-4">Distribution of solved problems</p>

        <div className="space-y-3.5">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-emerald-500">Easy</span>
              <span className="font-semibold text-foreground">{easy} ({Math.round((easy / total) * 100)}%)</span>
            </div>
            <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(easy / total) * 100}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-amber-500">Medium</span>
              <span className="font-semibold text-foreground">{medium} ({Math.round((medium / total) * 100)}%)</span>
            </div>
            <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(medium / total) * 100}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-rose-500">Hard</span>
              <span className="font-semibold text-foreground">{hard} ({Math.round((hard / total) * 100)}%)</span>
            </div>
            <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(hard / total) * 100}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Top Topics */}
      <Card className="p-5 border border-border bg-surface text-foreground shadow-sm">
        <h3 className="font-bold text-base text-foreground mb-1">Top Problem Topics</h3>
        <p className="text-xs text-foreground-muted mb-4">Algorithms and data structures focus</p>

        {topTopics.length === 0 ? (
          <p className="text-sm text-foreground-muted py-4 text-center">No topic analysis available yet.</p>
        ) : (
          <div className="space-y-2.5">
            {topTopics.map((t, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-foreground truncate max-w-[200px]">{t.topic}</span>
                  <span className="text-foreground-muted font-semibold">{t.count} solved</span>
                </div>
                <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(t.count / maxTopicCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
