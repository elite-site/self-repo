import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  Copy,
  Check,
  Download,
  Scroll,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { TranscriptSegment } from '../types';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { cn } from '@/shared/lib/cn';

export interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  isLoading?: boolean;
  available?: boolean;
  className?: string;
  onViewSyllabus?: () => void;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mStr = String(mins).padStart(2, '0');
  const sStr = String(secs).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

const HighlightedText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={index}
            className="rounded bg-brand/20 px-0.5 font-medium text-brand dark:bg-brand/35 dark:text-brand"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  segments = [],
  currentTime,
  onSeek,
  isLoading = false,
  available = true,
  className,
  onViewSyllabus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Find active segment where currentTime is between offset and offset + duration
  const activeSegment = useMemo(() => {
    return segments.find(
      (seg) => currentTime >= seg.offset && currentTime < seg.offset + seg.duration
    );
  }, [segments, currentTime]);

  // Filter segments by search query
  const filteredSegments = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return segments;
    return segments.filter((seg) => seg.text.toLowerCase().includes(trimmed));
  }, [segments, searchQuery]);

  // Auto-scroll to center active segment
  useEffect(() => {
    if (!autoScroll || !activeSegment) return;
    const el = itemRefs.current.get(activeSegment.offset);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSegment, autoScroll]);

  // Copy full transcript text
  const handleCopy = useCallback(async () => {
    if (segments.length === 0) return;
    const fullText = segments
      .map((s) => `[${formatTimestamp(s.offset)}] ${s.text}`)
      .join('\n');

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch {
      // Non-fatal fallback
    }
  }, [segments]);

  // Download transcript as .txt file
  const handleDownload = useCallback(() => {
    if (segments.length === 0 || typeof document === 'undefined') return;
    const fullText = segments
      .map((s) => `[${formatTimestamp(s.offset)}] ${s.text}`)
      .join('\n');

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [segments]);

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex flex-col rounded-xl border border-edge bg-surface p-4 shadow-xs',
          className
        )}
        aria-busy="true"
        aria-label="Loading transcript"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-5 w-14 shrink-0 rounded" />
              <Skeleton className="h-5 flex-1 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!available || segments.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-edge bg-surface p-6 sm:p-8 text-center shadow-xs',
          className
        )}
      >
        <EmptyState
          icon={FileText}
          title="No transcript available"
          description="Transcripts and captions have not been generated for this lesson yet."
          action={
            onViewSyllabus ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onViewSyllabus}
                className="text-xs"
              >
                View Course Syllabus
              </Button>
            ) : undefined
          }
          bare
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-edge bg-surface shadow-xs',
        className
      )}
      aria-label="Video transcript"
    >
      {/* Search and Action Toolbar */}
      <div className="border-b border-edge p-3 space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            aria-label="Search transcript"
            className="w-full rounded-lg border border-edge bg-surface-sunken py-1.5 pl-9 pr-8 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-brand"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between text-xs text-ink-muted">
          {/* Auto-scroll toggle button */}
          <button
            type="button"
            onClick={() => setAutoScroll((prev) => !prev)}
            aria-pressed={autoScroll}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-brand',
              autoScroll
                ? 'bg-brand-soft/30 text-brand dark:bg-brand/20'
                : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink'
            )}
            title="Auto-scroll transcript to match video playback"
          >
            <Scroll className="size-3.5" aria-hidden="true" />
            <span>Auto-scroll {autoScroll ? 'On' : 'Off'}</span>
          </button>

          {/* Export / Copy Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 gap-1 px-2 text-xs text-ink-secondary hover:text-ink"
              aria-label="Copy transcript"
              title="Copy all transcript text"
            >
              {isCopied ? (
                <>
                  <Check className="size-3.5 text-success" aria-hidden="true" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 gap-1 px-2 text-xs text-ink-secondary hover:text-ink"
              aria-label="Download transcript"
              title="Download transcript as text file"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span>Download</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Segments List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[300px]"
        tabIndex={0}
        aria-label="Transcript lines"
      >
        {filteredSegments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-ink-muted">
            <AlertCircle className="mb-2 size-6 text-ink-muted" aria-hidden="true" />
            <p className="text-xs">No lines found matching &ldquo;{searchQuery}&rdquo;</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs"
            >
              Clear search
            </Button>
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isActive =
              currentTime >= seg.offset && currentTime < seg.offset + seg.duration;

            return (
              <button
                key={`${seg.offset}-${idx}`}
                ref={(el) => {
                  if (el) itemRefs.current.set(seg.offset, el);
                  else itemRefs.current.delete(seg.offset);
                }}
                type="button"
                onClick={() => onSeek(seg.offset)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-brand',
                  isActive
                    ? 'border-l-2 border-brand bg-brand-soft/20 font-semibold text-ink dark:bg-brand/20'
                    : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 font-mono text-[11px] transition-colors',
                    isActive
                      ? 'font-bold text-brand'
                      : 'text-ink-muted group-hover:text-brand'
                  )}
                >
                  [{formatTimestamp(seg.offset)}]
                </span>
                <span className="flex-1 leading-relaxed">
                  <HighlightedText text={seg.text} query={searchQuery} />
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TranscriptViewer;
