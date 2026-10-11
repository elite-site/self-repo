import React from 'react';
import { StorageStatsResponse } from '../types';

interface CacheDirectoryTableProps {
  recentCache: StorageStatsResponse['drive']['recentCache'];
}

export const CacheDirectoryTable: React.FC<CacheDirectoryTableProps> = ({ recentCache }) => {
  return (
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
          {recentCache.length} samples
        </span>
      </div>

      {recentCache.length === 0 ? (
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
              {recentCache.map((entry) => (
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
  );
};
