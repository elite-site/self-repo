import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { StorageStatsResponse } from '../types';
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
} from 'lucide-react';

export const Storage: React.FC = () => {
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
    if (!window.confirm('Are you sure you want to purge the Google Drive folder cache? Folders will be re-resolved automatically upon next request.')) {
      return;
    }
    setClearingCache(true);
    setCacheMessage(null);
    try {
      const res = await adminApi.clearStorageCache();
      setCacheMessage(res.message || 'Drive folder cache cleared successfully.');
      await loadStorage(true);
    } catch (err: any) {
      console.error('Failed to clear cache:', err);
      setError(err?.response?.data?.message || 'Failed to purge cache');
    } finally {
      setClearingCache(false);
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
        <div className="w-10 h-10 border-3 border-elite-red border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Inspecting Google Drive & file inventory...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Storage Inspection Failed</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
        <button
          onClick={() => loadStorage(true)}
          className="px-4 py-2 bg-elite-red text-white text-sm font-semibold rounded-lg hover:bg-elite-red-dark transition-colors inline-flex items-center gap-2"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <HardDrive className="w-7 h-7 text-elite-red" />
            Cloud Storage & Drive Infrastructure
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Monitor Google Drive OAuth integration, folder resolution cache, and student media inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadStorage(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-elite-red' : ''}`} />
            Refresh Status
          </button>
        </div>
      </div>

      {cacheMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{cacheMessage}</span>
          </div>
          <button onClick={() => setCacheMessage(null)} className="font-bold underline text-emerald-700 dark:text-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Google Drive Connection Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Google Drive API Connector
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {drive.status}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Connected via {drive.mode} • Account: <code className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold">{drive.account}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearingCache ? 'Purging...' : 'Purge Folder Cache'}
            </button>
          </div>
        </div>

        {/* Drive Info Sub-Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Root Directory Anchor
            </span>
            <span className="text-sm font-mono font-bold text-neutral-900 dark:text-white truncate block">
              {drive.rootFolder}
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Departmental workspace base folder
            </span>
          </div>

          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Folder Cache Depth
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                {drive.cacheEntriesCount}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">cached nodes</span>
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Reduces Drive API rate limits by ~94%
            </span>
          </div>

          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Backend Uptime
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                {formatUptime(system.uptimeSeconds)}
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
              Node.js memory RSS: {system.memoryUsedMb} MB
            </span>
          </div>
        </div>
      </div>

      {/* Media Inventory Grid */}
      <div>
        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-elite-red" />
          Indexed Cloud Media Inventory
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Submission Videos */}
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <FileVideo className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
              {inventory.submissionVideos}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              Intro Videos
            </div>
          </div>

          {/* Student Profile Intro Videos */}
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <FileVideo className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
              {inventory.introVideos}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              Portfolio Videos
            </div>
          </div>

          {/* Resumes */}
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
              {inventory.resumes}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              PDF Resumes
            </div>
          </div>

          {/* Certificates */}
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Award className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
              {inventory.certificates}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              Certificates
            </div>
          </div>

          {/* Achievement Proofs */}
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Award className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
              {inventory.achievementProofs}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              Award Evidence
            </div>
          </div>

          {/* Profile Photos */}
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">
              {inventory.profilePhotos}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              Profile Photos
            </div>
          </div>
        </div>
      </div>

      {/* Recent Folder Cache Lookups Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Recent Cache Directory Map
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Recently mapped Google Drive folder lookup paths cached in PostgreSQL
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
            {drive.recentCache.length} samples
          </span>
        </div>

        {drive.recentCache.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
            No folder cache entries found. Cache will populate upon next student upload or video stream.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 uppercase font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="px-5 py-3">Folder Path Key</th>
                  <th className="px-5 py-3">Google Drive Folder ID</th>
                  <th className="px-5 py-3">Cached At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                {drive.recentCache.map((entry) => (
                  <tr key={entry.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      {entry.folderKey}
                    </td>
                    <td className="px-5 py-3 font-mono text-neutral-500 dark:text-neutral-400">
                      {entry.folderId}
                    </td>
                    <td className="px-5 py-3 text-neutral-400">
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
      <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500" />
          <span>Database Engine: <strong className="text-neutral-800 dark:text-neutral-200">{system.database}</strong></span>
        </div>
        <span className="text-neutral-400">Total Indexed Cloud Assets: {inventory.totalFiles}</span>
      </div>
    </div>
  );
};
