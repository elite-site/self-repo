import React from 'react';
import { RefreshCw, ShieldCheck, Unlink, ExternalLink } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import type { CodeChefStatus } from '../types';

interface CodeChefAccountCardProps {
  status: CodeChefStatus;
  cooldownText: string | null;
  canSync: boolean;
  syncing: boolean;
  onSync: () => void;
  onOpenVerify: () => void;
  onTogglePublic: (val: boolean) => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}

export const CodeChefAccountCard: React.FC<CodeChefAccountCardProps> = ({
  status,
  cooldownText,
  canSync,
  syncing,
  onSync,
  onOpenVerify,
  onTogglePublic,
  onDisconnect,
  disconnecting,
}) => {
  const getStatusBadge = () => {
    if (!status.verified) {
      return <Badge variant="warning" label="Unverified" />;
    }
    if (status.status === 'ERROR') {
      return <Badge variant="danger" label="Sync Error" />;
    }
    if (status.status === 'STALE') {
      return <Badge variant="neutral" label="Stale" />;
    }
    return <Badge variant="success" label="Connected" />;
  };

  return (
    <Card className="p-5 border border-border bg-surface text-foreground shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            {status.avatarUrl ? (
              <img src={status.avatarUrl} alt={status.handle || 'Avatar'} className="w-14 h-14 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                {status.handle?.charAt(0).toUpperCase()}
              </div>
            )}
            {status.verified && (
              <span className="absolute -bottom-1 -right-1 bg-success text-white rounded-full p-0.5" title="Verified Account">
                <ShieldCheck className="w-4 h-4" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">{status.displayName || status.handle}</h2>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground-muted mt-0.5">
              <span>@{status.handle}</span>
              {status.institution && <span>• {status.institution}</span>}
              <a
                href={`https://www.codechef.com/users/${status.handle}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-0.5 ml-1"
              >
                CodeChef <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {status.lastSyncedAt && (
              <p className="text-xs text-foreground-muted mt-1">
                Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!status.verified && (
            <Button size="sm" variant="secondary" onClick={onOpenVerify}>
              Verify Ownership
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={onSync}
            disabled={!canSync || syncing}
            title={cooldownText || 'Sync CodeChef Data'}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : cooldownText ? cooldownText : 'Sync Now'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={onDisconnect}
            disabled={disconnecting}
            title="Unlink account"
          >
            <Unlink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
        <span className="text-foreground-muted">Show CodeChef stats on my public profile</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={status.showPublic}
            onChange={(e) => onTogglePublic(e.target.checked)}
          />
          <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>
    </Card>
  );
};
