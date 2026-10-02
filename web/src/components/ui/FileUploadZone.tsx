import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, UploadCloud, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { transitionQuick, transitionReduced } from '../../lib/motion';

// ============================================================================
// File upload zone — REDESIGN_PLAN §4.8 "File Upload Zone"
// ============================================================================
//
// One zone for all three of the portal's uploads: the intro video (§6.9), the
// resume (§6.10) and a project cover image (§6.8). It owns the five states the
// plan names — idle, drag-over, uploading, success, error — and nothing else.
//
// It owns no network. The caller passes `upload`, a function that takes the
// file plus a progress callback and an AbortSignal, which is what keeps this
// transport-agnostic: `api.submitVideoStream` (XHR with `upload.onprogress`)
// and `api.uploadResume` (axios) satisfy the same signature. The zone never
// sees a URL, a token or a header.
//
// Drag is the enhancement, not the mechanism. A real `<input type="file">` sits
// behind every instance (visually hidden but present, `tabIndex={-1}` so it is
// not a second tab stop), so the zone works from a keyboard, a screen reader
// and a file manager's "Open with". Drag is only wired on top of that.
// ============================================================================

/** The five states §4.8 specifies. */
export type FileUploadState = 'idle' | 'drag-over' | 'uploading' | 'success' | 'error';

/** Byte-level progress, reported by the caller's uploader from `upload.onprogress`. */
export interface FileUploadProgress {
  /** 0-100. */
  pct: number;
  loaded: number;
  total: number;
}

export interface FileUploadHandlers {
  onProgress: (progress: FileUploadProgress) => void;
  /** Aborted when the student presses Cancel, and on unmount. */
  signal: AbortSignal;
}

/** The transport. Resolving means the file is stored; rejecting surfaces as the error state. */
export type FileUploader = (file: File, handlers: FileUploadHandlers) => Promise<void>;

export interface FileUploadZoneProps {
  /** An `accept` string for the underlying input: `video/*`, `image/*`, `.pdf`. */
  accept?: string;
  /** Client-side size ceiling in bytes. */
  maxBytes: number;
  disabled?: boolean;
  /** Headline above the accept line. Defaults to the drop copy. */
  title?: React.ReactNode;
  /** What the picker accepts, in words — "PDF", "Images", "Videos". */
  acceptLabel?: string;
  /** Optional line under the accept line. */
  description?: React.ReactNode;
  icon?: LucideIcon;
  size?: 'md' | 'lg';
  /** Omit for a pure picker: selection is reported through `onFileSelected` and nothing uploads. */
  upload?: FileUploader;
  onFileSelected?: (file: File) => void;
  onSuccess?: (file: File) => void;
  onError?: (message: string, file: File | null) => void;
  onCancel?: () => void;
  /** Accessible name of the zone's button. Defaults to `title`. */
  label?: string;
  className?: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Extension → MIME type, for the drags that arrive with an empty `file.type`
 * (some file managers and clipboard pastes) and for the extension rules in an
 * `accept` string. Deliberately short: this is a client-side courtesy check,
 * not the security boundary — the server re-validates the real bytes.
 */
const EXTENSION_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  heic: 'image/heic',
};

function inferMimeType(name: string): string | null {
  const extension = name.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  return EXTENSION_MIME[extension] ?? null;
}

/**
 * Whether one `accept` rule admits this file.
 *
 * The declared `file.type` is a hint the student, not the browser, may control,
 * so it is never sufficient on its own: when the browser gave us both a MIME
 * type and an extension, the two have to agree before the file is accepted.
 * That rules out the "rename it to `.mp4`" trick and the "declare it as
 * `image/png`" trick equally. The backend still checks magic bytes — this is
 * about failing fast and honestly, not about being the gate.
 */
function ruleMatches(file: File, rule: string): boolean {
  const declared = file.type.toLowerCase();
  const inferred = inferMimeType(file.name);

  if (rule.startsWith('.')) {
    if (!file.name.toLowerCase().endsWith(rule)) return false;
    return declared === '' || inferred === null || declared === inferred;
  }

  if (rule.endsWith('/*')) {
    const family = rule.slice(0, -2);
    const isFamily = (mime: string) => mime.startsWith(`${family}/`);
    if (declared !== '' && isFamily(declared)) return true;
    // No usable declared type: fall back to the extension, and still demand
    // agreement if the browser declared one we could not place.
    return inferred !== null && isFamily(inferred) && (declared === '' || declared === inferred);
  }

  return declared === rule;
}

function isAccepted(file: File, accept?: string): boolean {
  if (!accept) return true;
  const rules = accept
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);
  return rules.some((rule) => ruleMatches(file, rule));
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

// ─── Shared button styling ───────────────────────────────────────────────────

const buttonBase =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 font-ui text-sm font-medium transition-colors duration-quick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

export const FileUploadZone = React.forwardRef<HTMLDivElement, FileUploadZoneProps>(
  function FileUploadZone(
    {
      accept,
      maxBytes,
      disabled = false,
      title,
      acceptLabel,
      description,
      icon: Icon = UploadCloud,
      size = 'lg',
      upload,
      onFileSelected,
      onSuccess,
      onError,
      onCancel,
      label,
      className,
    },
    forwardedRef,
  ) {
    const shouldReduce = useReducedMotion();
    const [state, setState] = useState<FileUploadState>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState<FileUploadProgress>({ pct: 0, loaded: 0, total: 0 });
    const [error, setError] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    // Drag enter/leave fire for every descendant, so the state is driven by a
    // depth counter rather than by the last event.
    const dragDepthRef = useRef(0);

    const hintId = `${useId()}-hint`;

    // A late promise must not set state on a component that has gone away.
    useEffect(() => () => abortRef.current?.abort(), []);

    const isUploading = state === 'uploading';
    const canOpen = !disabled && (state === 'idle' || state === 'drag-over');
    const acceptSummary = acceptLabel ?? 'Any file';

    const validate = useCallback(
      (candidate: File): string | null => {
        if (accept && !isAccepted(candidate, accept)) {
          return `${candidate.name} is not a supported file type. ${acceptSummary} only.`;
        }
        if (candidate.size > maxBytes) {
          return `${candidate.name} is ${formatBytes(candidate.size)}. The limit is ${formatBytes(maxBytes)}.`;
        }
        return null;
      },
      [accept, acceptSummary, maxBytes],
    );

    const reset = useCallback(() => {
      setState('idle');
      setFile(null);
      setError('');
      setProgress({ pct: 0, loaded: 0, total: 0 });
      // Clearing the input is what lets re-picking the same file fire `change`.
      if (inputRef.current) inputRef.current.value = '';
    }, []);

    const runUpload = useCallback(
      async (candidate: File) => {
        if (!upload) return;
        const controller = new AbortController();
        abortRef.current = controller;
        setProgress({ pct: 0, loaded: 0, total: candidate.size });

        try {
          await upload(candidate, {
            signal: controller.signal,
            onProgress: (next) => {
              if (!controller.signal.aborted) setProgress(next);
            },
          });
          if (controller.signal.aborted) return;
          setState('success');
          onSuccess?.(candidate);
        } catch (thrown) {
          if (controller.signal.aborted) return;
          const message = thrown instanceof Error ? thrown.message : 'Upload failed. Please try again.';
          setError(message);
          setState('error');
          onError?.(message, candidate);
        }
      },
      [onError, onSuccess, upload],
    );

    const acceptFile = useCallback(
      (candidate: File) => {
        const message = validate(candidate);
        if (message !== null) {
          setFile(candidate);
          setError(message);
          setState('error');
          onError?.(message, candidate);
          return;
        }
        setFile(candidate);
        setError('');
        onFileSelected?.(candidate);
        if (upload) void runUpload(candidate);
      },
      [onError, onFileSelected, runUpload, upload, validate],
    );

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const candidate = event.target.files?.[0];
      if (candidate) acceptFile(candidate);
    };

    const openPicker = () => {
      if (!canOpen) return;
      inputRef.current?.click();
    };

    const cancelUpload = () => {
      abortRef.current?.abort();
      abortRef.current = null;
      reset();
      onCancel?.();
    };

    const isFileDrag = (event: React.DragEvent<HTMLDivElement>) =>
      Array.from(event.dataTransfer.types).includes('Files');

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
      if (!canOpen || !isFileDrag(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setState('drag-over');
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
      if (!isFileDrag(event)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0 && state === 'drag-over') setState('idle');
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      if (!canOpen) return;
      setState('idle');
      const candidate = event.dataTransfer.files?.[0];
      if (candidate) acceptFile(candidate);
    };

    const handleZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      // Space would otherwise scroll the page out from under the student.
      event.preventDefault();
      openPicker();
    };

    // ─── State content ────────────────────────────────────────────────────

    let content: React.ReactNode;

    if (isUploading && file) {
      const pct = Math.max(0, Math.min(100, Math.round(progress.pct)));
      content = (
        <>
          <Loader2 size={24} className="animate-spin text-ink-muted" aria-hidden="true" />
          <div className="w-full">
            <p className="truncate font-ui text-sm font-medium text-ink">{file.name}</p>
            <p className="mt-0.5 font-body text-xs text-ink-muted">
              {formatBytes(progress.loaded)} of {formatBytes(progress.total)} · {pct}%
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${pct} percent, ${formatBytes(progress.loaded)} of ${formatBytes(progress.total)}`}
            className="h-2 w-full overflow-hidden rounded-full bg-surface-inset"
          >
            {/* The width is the information here, so it is the one thing that
                animates; the global reduced-motion block in tokens.css collapses
                it to a plain redraw rather than requiring a JS branch. */}
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-normal ease-standard"
              style={{ width: `${pct}%` }}
            />
          </div>
          <button type="button" onClick={cancelUpload} className={cn(buttonBase, 'text-ink-secondary hover:bg-surface-sunken')}>
            <X size={16} aria-hidden="true" />
            Cancel
          </button>
        </>
      );
    } else if (state === 'success' && file) {
      content = (
        <>
          <CheckCircle2 size={28} className="text-success" aria-hidden="true" />
          <div className="text-center">
            <p className="font-ui text-sm font-medium text-ink">Uploaded</p>
            <p className="mt-0.5 font-body text-xs text-ink-secondary">
              {file.name} · {formatBytes(file.size)}
            </p>
          </div>
          <button type="button" onClick={reset} className={cn(buttonBase, 'border border-edge bg-surface text-ink hover:bg-surface-sunken')}>
            <RefreshCw size={16} aria-hidden="true" />
            Choose another
          </button>
        </>
      );
    } else if (state === 'error') {
      content = (
        <>
          <AlertCircle size={28} className="text-danger" aria-hidden="true" />
          <div className="text-center">
            <p className="font-ui text-sm font-medium text-ink">{file ? file.name : 'Upload failed'}</p>
            <p className="mt-0.5 font-body text-xs text-danger">{error}</p>
          </div>
          <button type="button" onClick={reset} className={cn(buttonBase, 'border border-edge bg-surface text-ink hover:bg-surface-sunken')}>
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </button>
        </>
      );
    } else {
      content = (
        <>
          <Icon size={size === 'lg' ? 32 : 24} className="text-ink-muted" aria-hidden="true" />
          <div className="text-center">
            <p className="font-ui text-sm font-medium text-ink">
              {title ?? (
                <>
                  Drag &amp; drop, or <span className="text-brand underline">browse</span>
                </>
              )}
            </p>
            <p className="mt-1 font-body text-xs text-ink-muted">
              {description ?? `${acceptSummary} · Max ${formatBytes(maxBytes)}`}
            </p>
          </div>
        </>
      );
    }

    // One polite live region per zone. Progress deliberately stays out of it:
    // the `progressbar` above already carries the value, and a live region that
    // changed four times a second would talk over everything else on the page.
    const announcement =
      isUploading && file
        ? `Uploading ${file.name}.`
        : state === 'success' && file
          ? `${file.name} uploaded.`
          : state === 'error'
            ? error
            : state === 'drag-over'
              ? 'Release to upload.'
              : '';

    return (
      <div ref={forwardedRef} className={cn('w-full', className)}>
        {/* The real form control. `aria-hidden` plus `tabIndex={-1}` because the
            zone itself is the focusable control; this keeps one tab stop and one
            announced name while the native picker, and any form serialisation,
            still run through a genuine file input. */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled || isUploading}
          onChange={handleInputChange}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />

        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>

        <motion.div
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          aria-label={label ?? (typeof title === 'string' ? title : `Upload ${acceptSummary.toLowerCase()}`)}
          aria-describedby={hintId}
          aria-disabled={disabled || isUploading ? true : undefined}
          aria-busy={isUploading || undefined}
          onClick={openPicker}
          onKeyDown={handleZoneKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          initial={false}
          animate={{ scale: state === 'drag-over' && !shouldReduce ? 1.02 : 1 }}
          transition={shouldReduce ? transitionReduced : transitionQuick}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 text-center',
            'transition-colors duration-normal ease-standard',
            size === 'lg' ? 'px-10 py-10' : 'px-6 py-6',
            state === 'idle' && 'border-dashed border-edge',
            state === 'drag-over' && 'border-solid border-brand bg-brand-soft',
            isUploading && 'border-solid border-edge bg-surface-raised',
            state === 'success' && 'border-solid border-success bg-success-subtle',
            state === 'error' && 'border-solid border-danger bg-danger-subtle',
            canOpen &&
              'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            disabled && 'cursor-not-allowed opacity-disabled',
          )}
        >
          {content}
          {/* The drop hints never move or disappear, so a screen reader and a
              sighted student both have the same instruction to read. */}
          <p id={hintId} className="sr-only">
            {`${acceptSummary}, up to ${formatBytes(maxBytes)}. Press Enter to choose a file.`}
          </p>
        </motion.div>
      </div>
    );
  },
);

export default FileUploadZone;