import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { StorageStatsResponse } from '../types';
import { useConfirm } from '../components/ui/ConfirmDialog';
import {
  HardDrive,
  Cloud,
  CheckCircle,
  Trash2,
  RefreshCw,
  FileVideo,
  FileText,
  Award,
  Image as ImageIcon,
  Layers,
  AlertCircle,
  Database,
  Eye,
} from 'lucide-react';

export const Storage: React.FC = () => {
  const confirm = useConfirm();
  const [stats, setStats] = useState<StorageStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStorage = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getStorageStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load storage statistics:', err);
      setError(err?.response?.data?.message || 'Failed to connect to storage service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStorage();
  }, []);

  const handleClearCache = async () => {
    const confirmed = await confirm({
      title: 'Purge the Drive folder cache?',
      description: 'Folders are re-resolved automatically on the next request, so this only costs one extra Drive lookup per folder.',
      confirmLabel: 'Purge cache',
    });
    if (!confirmed) return;
    setClearingCache(true);
    setCacheMessage(null);
    try {
      const res = await adminApi.clearStorageCache();
      setCacheMessage(res.message || 'Drive folder cache cleared.');
      await loadStorage(true);
    } catch (err: any) {
      console.error('Failed to clear cache:', err);
      setError(err?.response?.data?.message || 'Failed to purge cache');
    } finally {
      setClearingCache(false);
    }
  };

  const [syncingPermissions, setSyncingPermissions] = useState(false);

  const handleSyncPermissions = async () => {
    setSyncingPermissions(true);
    setCacheMessage(null);
    try {
      const res = await adminApi.ensureDriveViewerPermissions();
      setCacheMessage(res.message || 'Viewer permissions synced for all Drive files and folders.');
    } catch (err: any) {
      console.error('Failed to sync permissions:', err);
      setError(err?.response?.data?.message || 'Failed to sync viewer permissions');
    } finally {
      setSyncingPermissions(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${seconds % 60}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-ink-muted">Inspecting Google Drive & file inventory…</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-status-bg-rejected text-status-rejected flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-ink mb-2">Storage Inspection Failed</h3>
        <p className="text-sm text-ink-muted mb-6">{error}</p>
        <button
          onClick={() => loadStorage(true)}
          className="px-4 py-2 bg-brand text-on-primary text-sm font-semibold rounded-lg hover:bg-brand-hover transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const { drive, inventory, system } = stats!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-edge">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <HardDrive className="w-7 h-7 text-ink-brand" />
            Cloud Storage & Drive Infrastructure
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Monitor Google Drive OAuth integration, folder resolution cache, and student media inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadStorage(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary bg-surface border border-edge-strong rounded-lg hover:bg-surface-sunken transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-ink-brand' : ''}`} />
            Refresh Status
          </button>
        </div>
      </div>

      {cacheMessage && (
        <div className="p-4 rounded-xl bg-status-bg-approved border border-edge flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-status-approved shrink-0" />
            <span>{cacheMessage}</span>
          </div>
          <button onClick={() => setCacheMessage(null)} className="font-bold underline text-status-approved">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Google Drive Connection Card */}
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
              onClick={handleSyncPermissions}
              disabled={syncingPermissions}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-status-approved bg-status-bg-approved border border-edge rounded-lg hover:bg-status-bg-approved transition-colors disabled:opacity-50 cursor-pointer"
              title="Grant reader/viewer permissions across all files and folders on Drive"
            >
              <Eye className="w-3.5 h-3.5" />
              {syncingPermissions ? 'Syncing…' : 'Sync Viewer Access'}
            </button>
            <button
              onClick={handleClearCache}
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
            <span className="text-xs font-semibold  text-ink-muted block mb-1">
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
            <span className="text-xs font-semibold  text-ink-muted block mb-1">
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
            <span className="text-xs font-semibold  text-ink-muted block mb-1">
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

      {/* Media Inventory Grid */}
      <div>
        <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-ink-brand" />
          Indexed Cloud Media Inventory
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Submission Videos */}
          <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-status-bg-rejected text-status-rejected flex items-center justify-center mb-3">
              <FileVideo className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold text-ink">
              {inventory.submissionVideos}
            </div>
            <div className="text-xs font-medium text-ink-muted mt-0.5">
              Intro Videos
            </div>
          </div>

          {/* Student Profile Intro Videos */}
          <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-status-bg-review text-status-review flex items-center justify-center mb-3">
              <FileVideo className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold text-ink">
              {inventory.introVideos}
            </div>
            <div className="text-xs font-medium text-ink-muted mt-0.5">
              Portfolio Videos
            </div>
          </div>

          {/* Resumes */}
          <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-status-bg-approved text-status-approved flex items-center justify-center mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold text-ink">
              {inventory.resumes}
            </div>
            <div className="text-xs font-medium text-ink-muted mt-0.5">
              PDF Resumes
            </div>
          </div>

          {/* Certificates */}
          <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-status-bg-approved text-status-approved flex items-center justify-center mb-3">
              <Award className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold text-ink">
              {inventory.certificates}
            </div>
            <div className="text-xs font-medium text-ink-muted mt-0.5">
              Certificates
            </div>
          </div>

          {/* Achievement Proofs */}
          <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-status-bg-pending text-status-pending flex items-center justify-center mb-3">
              <Award className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold text-ink">
              {inventory.achievementProofs}
            </div>
            <div className="text-xs font-medium text-ink-muted mt-0.5">
              Award Evidence
            </div>
          </div>

          {/* Profile Photos */}
          <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-brand-soft text-ink-brand flex items-center justify-center mb-3">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold text-ink">
              {inventory.profilePhotos}
            </div>
            <div className="text-xs font-medium text-ink-muted mt-0.5">
              Profile Photos
            </div>
          </div>
        </div>
      </div>

      {/* Recent Folder Cache Lookups Table */}
      <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-edge flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">
              Recent Cache Directory Map
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Recently mapped Google Drive folder lookup paths cached in PostgreSQL
            </p>
          </div>
          <span className="text-xs font-mono text-ink-muted">
            {drive.recentCache.length} samples
          </span>
        </div>

        {drive.recentCache.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted">
            No folder cache entries found. Cache will populate upon next student upload or video stream.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sunken text-ink-secondary font-semibold border-b border-edge">
                <tr>
                  <th className="px-5 py-3">Folder Path Key</th>
                  <th className="px-5 py-3">Google Drive Folder ID</th>
                  <th className="px-5 py-3">Cached At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge text-ink-secondary">
                {drive.recentCache.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-sunken/50 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-ink">
                      {entry.folderKey}
                    </td>
                    <td className="px-5 py-3 font-mono text-ink-muted">
                      {entry.folderId}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {new Date(entry.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System info bar */}
      <div className="p-4 rounded-xl bg-surface-sunken border border-edge flex flex-col sm:flex-row items-center justify-between text-xs text-ink-secondary gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-status-approved" />
          <span>Database Engine: <strong className="text-ink">{system.database}</strong></span>
        </div>
        <span className="text-ink-muted">Total Indexed Cloud Assets: {inventory.totalFiles}</span>
      </div>
    </div>
  );
};
