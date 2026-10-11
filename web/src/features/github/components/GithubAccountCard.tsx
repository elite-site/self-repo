import React from 'react';
import {
  Github,
  RefreshCw,
  ExternalLink,
  Unlink,
  Star,
  Loader2,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { GithubAccountInfo, GithubSkillItem } from '../types';

interface GithubAccountCardProps {
  account?: GithubAccountInfo | null;
  skills?: GithubSkillItem[];
  syncing: boolean;
  isSyncActive: boolean;
  isCooldown: boolean;
  cooldownText: string;
  disconnecting: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Never';
  const diffSec = Math.round((Date.now() - time) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.round(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const GithubAccountCard: React.FC<GithubAccountCardProps> = ({
  account,
  syncing,
  isSyncActive,
  isCooldown,
  cooldownText,
  disconnecting,
  onSync,
  onDisconnect,
}) => {
  return (
    <Card className="p-6 sm:p-8 border border-edge bg-surface shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          {account?.avatarUrl ? (
            <img
              src={account.avatarUrl}
              alt={account.login}
              className="size-16 sm:size-20 rounded-full border-2 border-edge object-cover bg-surface-sunken shrink-0"
            />
          ) : (
            <div className="size-16 sm:size-20 rounded-full bg-brand-soft text-brand-soft-text flex items-center justify-center font-bold text-2xl shrink-0">
              <Github size={32} />
            </div>
          )}

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-headline-md text-ink font-bold">
                @{account?.login}
              </h1>
              <a
                href={`https://github.com/${account?.login}`}
                target="_blank"
                rel="noreferrer"
                className="text-ink-muted hover:text-ink transition-colors p-1"
                title="Open GitHub profile"
                aria-label="Open GitHub profile"
              >
                <ExternalLink size={16} />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-secondary">
              <span>{account?.publicReposCount ?? 0} public repos</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                {account?.totalStarsCount ?? 0} stars
              </span>
              <span>•</span>
              <span>Last synced {formatRelativeTime(account?.lastSyncedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSync}
            disabled={syncing || isSyncActive || isCooldown}
            title={cooldownText || undefined}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw size={16} className={isSyncActive || syncing ? 'animate-spin' : ''} />
            <span>{isSyncActive || syncing ? 'Syncing…' : 'Sync now'}</span>
          </button>

          <button
            type="button"
            onClick={onDisconnect}
            disabled={disconnecting}
            className="btn btn-ghost text-status-rejected hover:bg-status-bg-rejected inline-flex items-center gap-1.5"
          >
            {disconnecting ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    </Card>
  );
};
