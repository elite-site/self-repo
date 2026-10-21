import React from 'react';
import { HardDrive, RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { DriveConnectorCard } from '../components/DriveConnectorCard';
import { MediaInventoryGrid } from '../components/MediaInventoryGrid';
import { CacheDirectoryTable } from '../components/CacheDirectoryTable';

export const StoragePage: React.FC = () => {
  const {
    stats,
    loading,
    refreshing,
    clearingCache,
    syncingPermissions,
    cacheMessage,
    setCacheMessage,
    error,
    loadStorage,
    handleClearCache,
    handleSyncPermissions,
  } = useStorage();

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="space-y-2">
          <div className="skeleton h-8 w-72 rounded-lg" />
          <div className="skeleton h-4 w-96 rounded-lg" />
        </div>
        <div className="skeleton h-48 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
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
      <DriveConnectorCard
        drive={drive}
        system={system}
        syncingPermissions={syncingPermissions}
        clearingCache={clearingCache}
        onSyncPermissions={handleSyncPermissions}
        onClearCache={handleClearCache}
      />

      {/* Media Inventory Grid */}
      <MediaInventoryGrid inventory={inventory} />

      {/* Recent Folder Cache Lookups Table */}
      <CacheDirectoryTable recentCache={drive.recentCache} />

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

export default StoragePage;
