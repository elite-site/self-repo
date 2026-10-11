import React from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const StudentDetailSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true">
    <span className="sr-only" role="status">Loading student profile</span>
    <div className="skeleton h-9 w-56" />
    <div className="bg-surface border border-edge rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="skeleton h-16 w-16 rounded-lg" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-4 w-64" />
        </div>
      </div>
      <div className="skeleton h-12 w-full" />
    </div>
  </div>
);

export const StudentNotFound: React.FC<{ error?: string | null; onBack?: () => void }> = ({
  error,
  onBack,
}) => (
  <div className="p-8 text-center bg-surface border border-edge rounded-lg max-w-lg mx-auto my-12">
    <AlertTriangle className="w-10 h-10 text-status-rejected mx-auto mb-3" />
    <h3 className="text-base font-bold text-ink">Student Not Found</h3>
    <p className="text-xs text-ink-muted mt-1 mb-5">{error || 'Unable to retrieve student profile.'}</p>
    {onBack && (
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-inverse text-ink-inverse text-xs font-bold rounded-xl cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Roster
      </button>
    )}
  </div>
);
