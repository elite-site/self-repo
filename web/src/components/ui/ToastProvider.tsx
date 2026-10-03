import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import type { AnimationPlaybackControls, Variants } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../lib/cn';
import { MOTION_EASINGS, selectVariantsByName } from '../../lib/motion';

// ============================================================================
// Toast — REDESIGN_PLAN §4.8 (Toast / Notification Toast) + §4.7 (item 9)
// ============================================================================
//
// Built here rather than pulled from a library because the behaviour the plan
// asks for is specific: three at most, bottom-right on desktop and bottom-centre
// on mobile, a progress bar that shows the time left, and the timer pausing
// while a student is reading or hovering the toast. A stock toaster gives you
// none of those and takes the styling back.
//
// Announced, not just shown. A toast is the only way a page can say "your video
// was rejected" without moving focus, so if it is not in a live region it does
// not exist for a screen-reader user at all (§3.4). Both live regions are
// mounted from the first render — see `ToastProvider`.
// ============================================================================

/** The four variants §4.8 defines. */
export type ToastVariant = 'success' | 'warning' | 'danger' | 'info';

/**
 * What a caller may pass as the variant. `error` is this project's pre-redesign
 * spelling of `danger` and stays accepted so the pages already calling
 * `showToast(message, 'error')` keep working; new code should say `danger`.
 */
export type ToastType = ToastVariant | 'error';

/** The optional link in a toast — "Undo", "Retry". */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  variant?: ToastType;
  /** Milliseconds on screen. `null` keeps the toast up until it is dismissed. */
  duration?: number | null;
  action?: ToastAction;
}

/** One entry in the visible stack. */
export interface ToastRecord {
  id: string;
  message: string;
  variant: ToastVariant;
  /** `null` for a toast that stays until dismissed. */
  duration: number | null;
  action?: ToastAction;
}

export interface ToastContextValue {
  /** The visible stack, oldest first, capped at {@link TOAST_MAX_VISIBLE}. */
  toasts: ToastRecord[];
  /** Raises a toast. Returns the id so it can be dismissed early. */
  toast: (message: string, options?: ToastOptions) => string;
  /** Takes one toast off the stack. */
  dismiss: (id: string) => void;
  /** Takes the whole stack off. Used when the view unmounts underneath it. */
  dismissAll: () => void;
  /**
   * The pre-redesign spelling of {@link ToastContextValue.toast}. Kept because
   * every page in the app already calls it; `toast(message, { variant })` is
   * the new form and takes the same message and variant.
   */
  showToast: (message: string, variant?: ToastType) => void;
}

/**
 * How long a toast stays up. §4.8 fixes this at 5000ms.
 *
 * Deliberately not a motion token: the longest step in the duration scale is
 * `duration-story` at 1000ms, and a message that vanishes after a second is not
 * a message. It is a named constant in one place rather than a literal repeated
 * at each call site, and a caller with a different need passes `duration`.
 */
export const TOAST_DURATION_MS = 5000;

/** §4.8: three at most. Past three the stack stops being scannable. */
export const TOAST_MAX_VISIBLE = 3;

interface ToastVariantStyle {
  icon: LucideIcon;
  /** The plan's four semantic utility colours (§4.1), not the six-state
   * submission map — a toast is not a moderation state. */
  iconClassName: string;
  /** The progress bar, which needs the fill utility rather than the text one. */
  barClassName: string;
  /**
   * Whether the message interrupts. A warning or a failure is something the
   * student has to act on, so it goes through an assertive region; a
   * confirmation waits its turn.
   */
  urgent: boolean;
}

const VARIANT_STYLES: Record<ToastVariant, ToastVariantStyle> = {
  success: { icon: CheckCircle2, iconClassName: 'text-success', barClassName: 'bg-success', urgent: false },
  warning: { icon: AlertTriangle, iconClassName: 'text-warning', barClassName: 'bg-warning', urgent: true },
  danger: { icon: AlertCircle, iconClassName: 'text-danger', barClassName: 'bg-danger', urgent: true },
  info: { icon: Info, iconClassName: 'text-info', barClassName: 'bg-info', urgent: false },
};

/**
 * Normalises what a caller passed to a variant. `error` is this project's
 * pre-redesign name for `danger` and maps onto it here rather than being cast
 * through, so the two spellings cannot produce two different red toasts.
 */
const VARIANT_ALIASES: Record<ToastType, ToastVariant> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  error: 'danger',
  info: 'info',
};

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => '',
  dismiss: () => {},
  dismissAll: () => {},
  showToast: () => {},
});

interface Announcement {
  /** Bumped per message so the live region gets a fresh node to announce. */
  token: number;
  message: string;
  urgent: boolean;
}

interface ToastItemProps {
  record: ToastRecord;
  onDismiss: (id: string) => void;
  shouldReduce: boolean;
  variants: Variants;
}

/**
 * One toast, with its own timer and progress bar.
 *
 * Owning the timer here rather than in the provider is what makes
 * pause-on-hover work: the pause belongs to the toast the pointer is over, not
 * to the stack. Pausing is not "stop and restart" — the time already spent is
 * subtracted from what is left, so a student who hovers a message for four
 * seconds still gets its full reading time on the way out.
 */
const ToastItem: React.FC<ToastItemProps> = ({
  record,
  onDismiss,
  shouldReduce,
  variants,
}) => {
  const { id, message, variant, duration, action } = record;
  const style = VARIANT_STYLES[variant];
  const Icon = style.icon;

  const dismiss = useCallback(() => onDismiss(id), [onDismiss, id]);

  const remainingRef = useRef(duration ?? 0);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  // Auto-dismiss, and the same clock driving the progress bar.
  useEffect(() => {
    if (duration === null) return undefined;
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(dismiss, duration);
    // A pending timer must not fire after the toast unmounts on logout.
    return clearTimer;
  }, [clearTimer, dismiss, duration]);

  const progress = useMotionValue(1);
  const playbackRef = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    // The bar is five seconds of linear motion. §3.4 says a student who has
    // asked for reduced motion does not get one; the timer still runs, so the
    // toast still leaves on its own.
    if (duration === null || shouldReduce) return undefined;

    playbackRef.current = animate(progress, 0, {
      duration: duration / 1000,
      ease: MOTION_EASINGS.linear,
    });
    return () => {
      playbackRef.current?.stop();
      playbackRef.current = null;
    };
  }, [duration, progress, shouldReduce]);

  const pause = useCallback(() => {
    playbackRef.current?.pause();
    if (duration === null || timerRef.current === null) return;
    clearTimer();
    remainingRef.current = Math.max(0, duration - (Date.now() - startedAtRef.current));
  }, [clearTimer, duration]);

  const resume = useCallback(() => {
    playbackRef.current?.play();
    if (duration === null || timerRef.current !== null) return;
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(dismiss, remainingRef.current);
  }, [dismiss, duration]);

  /**
   * Blur only resumes when focus has actually left the toast. Tabbing from the
   * action link to the dismiss button is a blur followed by a focus on the same
   * card, and restarting the clock there would cut the message short mid-read.
   */
  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next !== null && event.currentTarget.contains(next)) return;
      resume();
    },
    [resume],
  );

  const runAction = useCallback(() => {
    action?.onClick();
    dismiss();
  }, [action, dismiss]);

  return (
    <motion.div
      layout
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={handleBlur}
      className={cn(
        'pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-lg',
        'border border-edge bg-surface px-4 py-3 shadow-lg sm:w-80',
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn('mt-px size-5 shrink-0', style.iconClassName)}
          strokeWidth={2}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <p className="text-body-sm text-ink">{message}</p>
          {action && (
            <button
              type="button"
              onClick={runAction}
              className="mt-1 cursor-pointer text-label-md font-semibold text-brand hover:underline"
            >
              {action.label}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {!shouldReduce && duration !== null && (
        <motion.span
          aria-hidden="true"
          style={{ scaleX: progress, transformOrigin: 'left' }}
          className={cn('absolute inset-x-0 bottom-0 h-0.5', style.barClassName)}
        />
      )}
    </motion.div>
  );
};

/**
 * Portal-wide toast notifications.
 *
 * Inline error text on an upload form sits below the fold on a phone and gets
 * scrolled past while the student is watching an upload progress bar, so the
 * outcome of an action is announced in a fixed viewport-layer toast instead.
 * Mounted once in App; pages just call `useToast()`.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const nextIdRef = useRef(0);
  const nextTokenRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const toast = useCallback((message: string, options: ToastOptions = {}) => {
    const variant = VARIANT_ALIASES[options.variant ?? 'info'];
    const duration = options.duration === undefined ? TOAST_DURATION_MS : options.duration;

    nextIdRef.current += 1;
    const id = `toast-${nextIdRef.current}`;

    // Announced before it is rendered: the live region has to already exist for
    // the insertion to be what a screen reader picks up. The token forces a new
    // node even when the same message is raised twice in a row.
    nextTokenRef.current += 1;
    setAnnouncement({
      token: nextTokenRef.current,
      message,
      urgent: VARIANT_STYLES[variant].urgent,
    });

    setToasts((current) => {
      const next = [...current, { id, message, variant, duration, action: options.action }];
      return next.slice(Math.max(0, next.length - TOAST_MAX_VISIBLE));
    });

    return id;
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastType = 'success') => toast(message, { variant }),
    [toast],
  );

  const value = useMemo(
    () => ({ toasts, toast, dismiss, dismissAll, showToast }),
    [toasts, toast, dismiss, dismissAll, showToast],
  );

  const shouldReduce = useReducedMotion();
  const variants = selectVariantsByName(shouldReduce, 'toast');

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/*
        The two live regions, mounted empty and always present. A live region
        added to the DOM at the same moment as its text is unreliable across
        screen readers, so these exist from the first render and the message is
        what changes. `danger` and `warning` interrupt; `success` and `info`
        wait their turn.
      */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement && !announcement.urgent ? (
          <span key={announcement.token}>{announcement.message}</span>
        ) : null}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement?.urgent ? <span key={announcement.token}>{announcement.message}</span> : null}
      </div>

      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 px-4',
          'pb-[calc(4.5rem+var(--safe-area-bottom))] sm:pb-[calc(1rem+var(--safe-area-bottom))]',
          // Bottom-right on desktop, bottom-centre on mobile (§4.8).
          'sm:inset-x-auto sm:bottom-5 sm:right-5 sm:items-end sm:px-0',
        )}
      >
        <AnimatePresence initial={false}>
          {toasts.map((record) => (
            <ToastItem
              key={record.id}
              record={record}
              onDismiss={dismiss}
              shouldReduce={shouldReduce}
              variants={variants}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

/**
 * The toast stack. Every page calls this; none of them render a toast.
 *
 * @example
 * const { toast } = useToast();
 * toast('Profile saved.', { variant: 'success' });
 */
export const useToast = () => useContext(ToastContext);

export default ToastProvider;
