import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Search,
  X,
  Copy,
  Check,
  Download,
  Scroll,
  FileText,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { TranscriptSegment } from '../types';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { cn } from '@/shared/lib/cn';
import { findActiveSegmentIndex } from '../lib/transcript';
import { formatTranscriptText } from '../lib/transcript';
import { formatTimestamp } from '../lib/timecode';
import { scrollWithin } from '../lib/scrollWithin';

/**
 * Re-exported for backward compatibility.
 * Tests import `formatTimestamp` from this file; the canonical source is
 * `../lib/timecode`. Do not duplicate the implementation (DRY-2).
 */
export { formatTimestamp } from '../lib/timecode';

export interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  isLoading?: boolean;
  available?: boolean;
  className?: string;
  onViewSyllabus?: () => void;
}

// ─── Highlighted text renderer ────────────────────────────────────────────────

const HighlightedText: React.FC<{ text: string; query: string }> = memo(({ text, query }) => {
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
        ),
      )}
    </>
  );
});
HighlightedText.displayName = 'HighlightedText';

// ─── Single row (memoized so only ~2 rows re-render per 250ms tick) ───────────

interface SegmentRowProps {
  seg: TranscriptSegment;
  isActive: boolean;
  query: string;
  onSeek: (offset: number) => void;
  rowRef: (el: HTMLElement | null) => void;
}

const SegmentRow: React.FC<SegmentRowProps> = memo(({ seg, isActive, query, onSeek, rowRef }) => (
  <button
    ref={rowRef}
    type="button"
    onClick={() => onSeek(seg.offset)}
    aria-current={isActive ? 'true' : undefined}
    className={cn(
      'group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-label-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand',
      isActive
        ? 'border-l-2 border-brand bg-brand-soft/20 font-semibold text-ink dark:bg-brand/20'
        : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
    )}
  >
    <span
      className={cn(
        'mt-0.5 shrink-0 font-mono text-label-xs transition-colors',
        isActive ? 'font-bold text-brand' : 'text-ink-muted group-hover:text-brand',
      )}
    >
      [{formatTimestamp(seg.offset)}]
    </span>
    <span className="flex-1 leading-relaxed">
      <HighlightedText text={seg.text} query={query} />
    </span>
  </button>
));
SegmentRow.displayName = 'SegmentRow';

// ─── Main component ───────────────────────────────────────────────────────────

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
  // `following` = auto-scroll tracks playback. Detached when user scrolls manually.
  const [following, setFollowing] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  // Tracks whether the next scroll event is ours (triggered by scrollWithin).
  const internalScrollRef = useRef(false);

  // Binary search for the active segment index.
  const activeIndex = useMemo(
    () => findActiveSegmentIndex(segments, currentTime),
    [segments, currentTime],
  );

  const activeSegment = activeIndex >= 0 ? segments[activeIndex] : null;

  // Filter segments by search query.
  const filteredSegments = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return segments;
    return segments.filter((seg) => seg.text.toLowerCase().includes(trimmed));
  }, [segments, searchQuery]);

  const matchCount = searchQuery.trim() ? filteredSegments.length : 0;

  // Auto-scroll: scroll the panel, not the page. Only when `following` is true
  // and there is no active search filter (searching detaches follow naturally).
  useEffect(() => {
    if (!following || !activeSegment || searchQuery.trim()) return;
    const el = itemRefs.current.get(activeSegment.offset);
    if (!el || !containerRef.current) return;

    // Mark as an internal scroll so the wheel listener ignores it.
    internalScrollRef.current = true;
    scrollWithin(containerRef.current, el);
    // Give the scroll animation a tick to start before re-allowing user detection.
    const id = setTimeout(() => {
      internalScrollRef.current = false;
    }, 50);
    return () => clearTimeout(id);
  }, [activeSegment, following, searchQuery]);

  // Detect user scroll: wheel, touch, or scrollbar drag.
  // Note: wheel and touchmove events are only ever generated by physical user
  // interaction (programmatic scrollTo only emits 'scroll' events).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleUserGesture = () => {
      setFollowing(false);
    };

    const handleScroll = () => {
      if (internalScrollRef.current) return;
      setFollowing(false);
    };

    container.addEventListener('wheel', handleUserGesture, { passive: true });
    container.addEventListener('touchmove', handleUserGesture, { passive: true });
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleUserGesture);
      container.removeEventListener('touchmove', handleUserGesture);
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Clicking a line resumes following.
  const handleLineClick = useCallback(
    (offset: number) => {
      setFollowing(true);
      onSeek(offset);
    },
    [onSeek],
  );

  const handleJumpToCurrent = useCallback(() => {
    setFollowing(true);
  }, []);

  // Copy full transcript.
  const handleCopy = useCallback(async () => {
    if (segments.length === 0) return;
    const fullText = formatTranscriptText(segments);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) {
      // Non-fatal: clipboard API may be unavailable in some browser contexts
      // (e.g. non-HTTPS, sandboxed iframes). The student can still use Download.
      console.warn('TranscriptViewer: clipboard write failed non-fatally:', err);
    }
  }, [segments]);

  // Download transcript as .txt file.
  const handleDownload = useCallback(() => {
    if (segments.length === 0 || typeof document === 'undefined') return;
    const fullText = formatTranscriptText(segments);
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

  // ─── Loading state ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex flex-col rounded-xl border border-edge bg-surface p-4 shadow-xs',
          className,
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

  // ─── Empty / unavailable state ───────────────────────────────────────────

  if (!available || segments.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-edge bg-surface p-6 text-center shadow-xs sm:p-8',
          className,
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
                className="text-label-xs"
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

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <div
      className={cn('flex flex-col rounded-xl border border-edge bg-surface shadow-xs', className)}
      aria-label="Video transcript"
    >
      {/* Toolbar */}
      <div className="space-y-2.5 border-b border-edge p-3">
        {/* Search input */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            aria-label="Search transcript"
            className="w-full rounded-lg border border-edge bg-surface-sunken py-1.5 pl-9 pr-8 text-label-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Toolbar controls row */}
        <div className="flex items-center justify-between text-label-xs text-ink-muted">
          <div className="flex items-center gap-2">
            {/* Auto-scroll / following toggle */}
            <button
              type="button"
              onClick={() => setFollowing((prev) => !prev)}
              aria-pressed={following}
              title="Auto-scroll transcript to match video playback"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-label-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand',
                following
                  ? 'bg-brand-soft/30 text-brand dark:bg-brand/20'
                  : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
              )}
            >
              <Scroll className="size-3.5" aria-hidden="true" />
              <span>Auto-scroll {following ? 'On' : 'Off'}</span>
            </button>

            {/* "Jump to current line" — shown when user scrolled away */}
            {!following && activeSegment && (
              <button
                type="button"
                onClick={handleJumpToCurrent}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-soft/30 px-2 py-1 text-label-xs font-medium text-brand transition-colors hover:bg-brand-soft/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand dark:bg-brand/20"
              >
                <Navigation className="size-3.5" aria-hidden="true" />
                Jump to current line
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Search match count */}
            {searchQuery.trim() && (
              <span className="text-ink-muted" aria-live="polite" aria-atomic="true">
                {matchCount} of {segments.length} lines match
              </span>
            )}

            {/* Copy / Download */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 gap-1 px-2 text-label-xs text-ink-secondary hover:text-ink"
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
                className="h-7 gap-1 px-2 text-label-xs text-ink-secondary hover:text-ink"
                aria-label="Download transcript"
                title="Download transcript as text file"
              >
                <Download className="size-3.5" aria-hidden="true" />
                <span>Download</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Segments list */}
      <div
        ref={containerRef}
        data-testid="transcript-scroll"
        className="min-h-[300px] flex-1 space-y-1 overflow-y-auto p-2"
        tabIndex={0}
        aria-label="Transcript lines"
      >
        {filteredSegments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-ink-muted">
            <AlertCircle className="mb-2 size-6 text-ink-muted" aria-hidden="true" />
            <p className="text-label-sm">No lines found matching &ldquo;{searchQuery}&rdquo;</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-label-xs"
            >
              Clear search
            </Button>
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const isActive =
              activeSegment !== null && seg.offset === activeSegment.offset;
            return (
              <SegmentRow
                key={seg.offset}
                seg={seg}
                isActive={isActive}
                query={searchQuery}
                onSeek={handleLineClick}
                rowRef={(el) => {
                  if (el) itemRefs.current.set(seg.offset, el);
                  else itemRefs.current.delete(seg.offset);
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default TranscriptViewer;
