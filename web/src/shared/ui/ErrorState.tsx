import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  /** What we could not load, in the student's words. Not the exception message. */
  message: string;
  /** Omitted in the inline variant, where the surrounding card gives the context. */
  title?: string;
  onRetry?: () => void;
  /** Inline variant, for one section inside an otherwise working page. */
  bare?: boolean;
}

/**
 * The portal's single error state.
 *
 * It replaces per-section red banners that printed the raw failure ("Failed to
 * load profile details.") with no way forward. The student sees what failed and
 * one action that might fix it; the technical detail stays in the network tab.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  title = 'Something went wrong',
  onRetry,
  bare = false,
}) => (
  <div
    role="alert"
    className={`flex items-start gap-3 rounded-lg border border-status-rejected/30 bg-status-bg-rejected text-status-rejected ${
      bare ? 'px-4 py-3' : 'px-5 py-4'
    }`}
  >
    <AlertCircle size={18} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      {!bare && <p className="font-heading text-headline-sm">{title}</p>}
      <p className="text-body-sm">{message}</p>
    </div>
    {onRetry && (
      <button type="button" onClick={onRetry} className="btn btn-secondary shrink-0">
        <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
        <span>Try again</span>
      </button>
    )}
  </div>
);

export default ErrorState;
