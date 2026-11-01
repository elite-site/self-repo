import React, { useState, useMemo } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CodeChefContestEntry } from '../types';

interface CodeChefContestTableProps {
  contests: CodeChefContestEntry[];
}

export const CodeChefContestTable: React.FC<CodeChefContestTableProps> = ({ contests = [] }) => {
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 10;

  const sorted = useMemo(() => {
    return [...(contests || [])].sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [contests, sortOrder]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);

  if (!contests || contests.length === 0) {
    return null;
  }

  return (
    <Card className="p-5 border border-border bg-surface text-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-foreground">Contest History</h3>
          <p className="text-xs text-foreground-muted">Last {contests.length} rated CodeChef contests</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          className="text-xs flex items-center gap-1"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-foreground-muted uppercase">
              <th className="py-2.5 px-3">Contest</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3 text-right">Rating</th>
              <th className="py-2.5 px-3 text-right">Rank</th>
              <th className="py-2.5 px-3 text-right">Solved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map((c, i) => (
              <tr key={i} className="hover:bg-surface-muted/50 transition-colors">
                <td className="py-2.5 px-3 font-medium text-foreground max-w-xs truncate">{c.name}</td>
                <td className="py-2.5 px-3 text-foreground-muted whitespace-nowrap">{c.date || '—'}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-primary">{c.rating ?? '—'}</td>
                <td className="py-2.5 px-3 text-right text-foreground-muted">{c.ranking ? `#${c.ranking.toLocaleString()}` : '—'}</td>
                <td className="py-2.5 px-3 text-right text-foreground-muted">
                  {c.problemsSolved !== null ? `${c.problemsSolved}${c.totalProblems ? `/${c.totalProblems}` : ''}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-border mt-3 text-xs text-foreground-muted">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
