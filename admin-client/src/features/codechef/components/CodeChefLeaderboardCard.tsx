import React from 'react';
import { Trophy } from 'lucide-react';
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
    <div className="surface rounded-xl border border-edge overflow-hidden shadow-xs">
      <div className="p-5 border-b border-edge bg-surface-sunken flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-status-pending/10 text-status-pending flex items-center justify-center border border-status-pending/20">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-ink">CodeChef Rating Leaderboard</h3>
            <p className="text-xs text-ink-muted">Highest competitive programming ratings in department</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          {[undefined, 1, 2, 3, 4].map((y) => (
            <button
              key={y ?? 'all'}
              type="button"
              onClick={() => onSelectYear(y)}
              className={`px-3 py-1.5 min-h-[34px] rounded-lg transition-all duration-quick font-semibold cursor-pointer ${
                selectedYear === y
                  ? 'bg-brand text-on-primary shadow-xs'
                  : 'bg-surface border border-edge text-ink-secondary hover:text-ink hover:bg-surface-sunken'
              }`}
            >
              {y ? `Year ${y}` : 'All Years'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-ink-muted">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading leaderboard...
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="py-12 text-center text-sm text-ink-muted">No verified CodeChef ratings found.</div>
      ) : (
        <div className="table-responsive">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-edge bg-surface-sunken text-xs font-semibold text-ink-secondary">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Handle</th>
                <th className="py-3 px-4 text-right">Rating</th>
                <th className="py-3 px-4 text-right">Solved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {leaderboard.map((item, idx) => (
                <tr
                  key={item.studentId}
                  onClick={() => onSelectStudent(item.studentId)}
                  className="hover:bg-brand-soft/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-xs">
                    {idx === 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-pending text-on-primary shadow-xs">
                        1
                      </span>
                    ) : idx === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-on-primary shadow-xs">
                        2
                      </span>
                    ) : idx === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-on-primary shadow-xs">
                        3
                      </span>
                    ) : (
                      <span className="text-ink-muted">{idx + 1}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-ink group-hover:text-brand transition-colors">
                      {item.name}
                    </div>
                    <div className="text-xs text-ink-muted font-mono">{item.rollNo}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs">
                    <span className="text-brand font-semibold">@{item.handle}</span>
                    {item.stars && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-pending/10 text-status-pending border border-status-pending/20">
                        {item.stars}★
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-ink tabular-nums">
                    {item.currentRating ?? '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-ink-secondary tabular-nums">
                    {item.totalSolved ?? 0}
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

export default CodeChefLeaderboardCard;
