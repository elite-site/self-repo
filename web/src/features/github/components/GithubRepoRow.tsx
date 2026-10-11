import React from 'react';
import { Star, GitFork, ExternalLink, Check, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { GithubRepoItem } from '../types';

interface GithubRepoRowProps {
  repo: GithubRepoItem;
  isShowcased: boolean;
  showcaseRank?: number;
  onToggleShowcase: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export const GithubRepoRow: React.FC<GithubRepoRowProps> = ({
  repo: r,
  isShowcased,
  showcaseRank,
  onToggleShowcase,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  return (
    <div
      className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isShowcased
          ? 'border-brand bg-brand-soft/30'
          : 'border-edge hover:border-brand-hover bg-surface'
      }`}
    >
      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={r.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="font-heading text-body-md font-bold text-ink hover:text-brand transition-colors inline-flex items-center gap-1.5"
          >
            <span>{r.name}</span>
            <ExternalLink size={13} className="text-ink-muted" />
          </a>
          {r.isFork && <span className="badge badge-draft text-xs">Fork</span>}
          {r.language && <span className="badge badge-neutral text-xs">{r.language}</span>}
        </div>

        {r.description && (
          <p className="text-body-sm text-ink-secondary line-clamp-2">{r.description}</p>
        )}

        <div className="flex items-center gap-3 text-label-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Star size={12} /> {r.stargazersCount || 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitFork size={12} /> {r.forksCount || 0}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isShowcased && onMoveUp && onMoveDown && (
          <div className="flex items-center gap-1 mr-2">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="p-1 rounded hover:bg-surface-sunken disabled:opacity-30 text-ink-secondary"
              aria-label="Move up in showcase"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="p-1 rounded hover:bg-surface-sunken disabled:opacity-30 text-ink-secondary"
              aria-label="Move down in showcase"
            >
              <ArrowDown size={14} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => onToggleShowcase(r.id)}
          className={`btn ${isShowcased ? 'btn-primary' : 'btn-secondary'} text-xs py-1.5 px-3 inline-flex items-center gap-1.5`}
        >
          {isShowcased ? <Check size={14} /> : <Plus size={14} />}
          <span>{isShowcased ? 'Showcased' : 'Add to showcase'}</span>
        </button>
      </div>
    </div>
  );
};
