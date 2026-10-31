import React from 'react';
import { Trophy, ExternalLink } from 'lucide-react';
import type { CodeChefLeaderboardItem } from '../types';

interface CodeChefLeaderboardCardProps {
  leaderboard: CodeChefLeaderboardItem[];
  loading: boolean;
  selectedYear?: number;
  onSelectYear: (year?: number) => void;
  onSelectStudent: (id: string) => void;
}

export const CodeChefLeaderboardCard: React.FC<CodeChefLeaderboardCardProps> = ({
  leaderboard,
  loading,
  selectedYear,
  onSelectYear,
  onSelectStudent,
}) => {
  return (
    <div className="p-5 bg-surface rounded-xl border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-base text-ink">CodeChef Rating Leaderboard</h3>
        </div>

        <div className="flex items-center gap-1 text-xs">
          {[undefined, 1, 2, 3, 4].map((y) => (
            <button
              key={y ?? 'all'}
              type="button"
              onClick={() => onSelectYear(y)}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                selectedYear === y
                  ? 'bg-primary text-white'
                  : 'bg-surface-muted text-ink-muted hover:text-ink'
              }`}
            >
              {y ? `Year ${y}` : 'All Years'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-ink-muted animate-pulse">Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">No verified CodeChef ratings found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-ink-muted uppercase">
                <th className="py-2 px-3 w-12 text-center">Rank</th>
                <th className="py-2 px-3">Student</th>
                <th className="py-2 px-3">Handle</th>
                <th className="py-2 px-3 text-right">Rating</th>
                <th className="py-2 px-3 text-right">Solved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaderboard.map((item) => (
                <tr
                  key={item.studentId}
                  onClick={() => onSelectStudent(item.studentId)}
                  className="hover:bg-surface-muted/50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 text-center font-bold text-ink">
                    {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-ink hover:text-primary transition-colors">{item.name}</div>
                    <div className="text-xs text-ink-muted">{item.rollNo} • Year {item.year}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                      @{item.handle} <ExternalLink className="w-3 h-3 opacity-60" />
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="font-bold text-primary">{item.currentRating}</div>
                    <div className="text-[11px] text-amber-500 font-semibold">{item.stars}★</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-ink-muted">
                    {item.totalSolved.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
