import React from 'react';
import { Cloud, Eye, Trash2 } from 'lucide-react';
import { StorageStatsResponse } from '../types';

interface DriveConnectorCardProps {
  drive: StorageStatsResponse['drive'];
  system: StorageStatsResponse['system'];
  syncingPermissions: boolean;
  clearingCache: boolean;
  onSyncPermissions: () => void;
  onClearCache: () => void;
}

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
};

export const DriveConnectorCard: React.FC<DriveConnectorCardProps> = ({
  drive,
  system,
  syncingPermissions,
  clearingCache,
  onSyncPermissions,
  onClearCache,
}) => {
  return (
    <div className="bg-surface border border-edge rounded-xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-edge">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-status-bg-approved text-status-approved flex items-center justify-center shrink-0">
            <Cloud className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink">
                Google Drive API Connector
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-bg-approved text-status-approved border border-edge">
                <span className="w-2 h-2 rounded-full bg-status-approved" />
                {drive.status}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Connected via {drive.mode} • Account: <code className="font-mono text-ink font-semibold">{drive.account}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSyncPermissions}
            disabled={syncingPermissions}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-status-approved bg-status-bg-approved border border-edge rounded-lg hover:bg-status-bg-approved transition-colors disabled:opacity-50 cursor-pointer"
            title="Grant reader/viewer permissions across all files and folders on Drive"
          >
            <Eye className="w-3.5 h-3.5" />
            {syncingPermissions ? 'Syncing…' : 'Sync Viewer Access'}
          </button>
          <button
            onClick={onClearCache}
            disabled={clearingCache}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-status-rejected bg-status-bg-rejected border border-edge rounded-lg hover:bg-status-bg-rejected transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearingCache ? 'Purging…' : 'Purge Folder Cache'}
          </button>
        </div>
      </div>

      {/* Drive Info Sub-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
        <div className="p-4 rounded-lg bg-surface-sunken border border-edge/60">
          <span className="text-xs font-semibold text-ink-muted block mb-1">
            Root Directory Anchor
          </span>
          <span className="text-sm font-mono font-bold text-ink truncate block">
            {drive.rootFolder}
          </span>
          <span className="text-xs text-ink-muted mt-1 block">
            Departmental workspace base folder
          </span>
        </div>

        <div className="p-4 rounded-lg bg-surface-sunken border border-edge/60">
          <span className="text-xs font-semibold text-ink-muted block mb-1">
            Folder Cache Depth
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-ink">
              {drive.cacheEntriesCount}
            </span>
            <span className="text-xs text-ink-muted">cached nodes</span>
          </div>
          <span className="text-xs text-ink-muted mt-1 block">
            Reduces Drive API rate limits by ~94%
          </span>
        </div>

        <div className="p-4 rounded-lg bg-surface-sunken border border-edge/60">
          <span className="text-xs font-semibold text-ink-muted block mb-1">
            Backend Uptime
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-ink">
              {formatUptime(system.uptimeSeconds)}
            </span>
          </div>
          <span className="text-xs text-ink-muted mt-1 block">
            Node.js memory RSS: {system.memoryUsedMb} MB
          </span>
        </div>
      </div>
    </div>
  );
};
