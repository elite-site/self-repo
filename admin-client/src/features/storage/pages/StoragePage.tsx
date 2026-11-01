import React from 'react';
import { HardDrive, RefreshCw, CheckCircle, AlertCircle, Database, ShieldCheck, Cloud } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { DriveConnectorCard } from '../components/DriveConnectorCard';
import { MediaInventoryGrid } from '../components/MediaInventoryGrid';
import { CacheDirectoryTable } from '../components/CacheDirectoryTable';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

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
      <div className="space-y-6 animate-fade-in" aria-busy="true">
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
      <div className="p-8 max-w-xl mx-auto text-center surface rounded-xl border border-edge shadow-sm mt-8">
        <div className="w-12 h-12 rounded-full bg-status-rejected/10 text-status-rejected flex items-center justify-center mx-auto mb-4 border border-status-rejected/20">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-ink mb-2 font-sans">Storage Inspection Failed</h3>
        <p className="text-sm text-ink-muted mb-6">{error}</p>
        <button
          onClick={() => loadStorage(true)}
          className="btn btn-primary min-h-[40px] px-4 inline-flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const { drive, inventory, system } = stats!;

  return (
    <div className="space-y-8 animate-fade-in-up text-left">
      {/* 1. TOP ASYMMETRICAL OVERVIEW */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Cloud Storage Infrastructure</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink font-sans">
                Storage & Drive Operations
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
                Google Drive service account integration, folder cache index, and media asset registry
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadStorage(true)}
                disabled={refreshing}
                className="btn btn-secondary min-h-[40px] px-4 inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          <DriveConnectorCard
            drive={drive}
            system={system}
            syncingPermissions={syncingPermissions}
            clearingCache={clearingCache}
            onSyncPermissions={handleSyncPermissions}
            onClearCache={handleClearCache}
          />
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Cloud size={13} />
                  Drive Gateway
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  {drive.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Zero-Direct-Link Security</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                All client requests route through secure backend streaming proxies. Drive IDs and private storage tokens are never leaked to browsers.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Cached Folders</span>
                  <span className="font-bold text-ink text-sm tabular-nums">{drive.cacheEntriesCount}</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Database Host</span>
                  <span className="font-bold text-status-approved text-sm">{system.database}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <ShieldCheck size={14} className="text-brand shrink-0" />
              <span>Drive API proxy enforced (SEC-4)</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {cacheMessage && (
        <div className="p-4 rounded-xl bg-status-approved/10 border border-status-approved/20 flex items-center justify-between text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-status-approved shrink-0" />
            <span className="font-medium">{cacheMessage}</span>
          </div>
          <button onClick={() => setCacheMessage(null)} className="font-bold underline text-status-approved cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. MEDIA INVENTORY SECTION */}
      <MediaInventoryGrid inventory={inventory} />

      {/* 3. RECENT FOLDER CACHE DIRECTORY MAP (Strict Container Scrolling) */}
      <CacheDirectoryTable recentCache={drive.recentCache} />

      {/* 4. SYSTEM INFO STATUS BAR */}
      <div className="p-4 rounded-xl surface border border-edge flex flex-col sm:flex-row items-center justify-between text-xs text-ink-secondary gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-status-approved" />
          <span>PostgreSQL Adapter: <strong className="text-ink">{system.database}</strong></span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-ink-muted">Indexed Assets: <strong className="text-ink">{inventory.totalFiles.toLocaleString()}</strong></span>
          <span className="text-ink-muted">Driver Mode: <strong className="text-ink">{drive.mode}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default StoragePage;
