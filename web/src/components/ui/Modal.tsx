import React, { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Variants } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../lib/cn';
import {
  bottomSheetVariants,
  modalBackdropVariants,
  modalPanelVariants,
  reducedBottomSheetVariants,
  reducedModalBackdropVariants,
  reducedModalPanelVariants,
  selectVariants,
} from '../../lib/motion';

/**
 * Tailwind's `md`, which is where §4.8 and §8.2 both put the sheet/panel
 * boundary. Written in rem because that is how Tailwind declares the
 * breakpoint, so the media query and the `md:` classes below cannot drift.
 */
const DESKTOP_QUERY = '(min-width: 48rem)';

function readDesktopQuery(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/**
 * Which of the two layouts the panel is in right now.
 *
 * The layout is pure CSS — the classes below flip at `md:`. The entrance
 * animation cannot be, because Framer Motion cannot read a media query and a
 * bottom sheet that rose like a centred panel (or the reverse) is the wrong
 * motion for the shape on screen. So the breakpoint is resolved once for the
 * variant choice and kept live, or rotating a tablet would leave the sheet
 * animating as a panel.
 *
 * Without `matchMedia` (a test DOM) this reports mobile, which is also what
 * the CSS resolves to at a zero-width viewport.
 */
function useIsDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(readDesktopQuery);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isDesktop;
}

const selectPanelVariants = (
  shouldReduce: boolean,
  isDesktop: boolean,
): Variants =>
  isDesktop
    ? selectVariants(shouldReduce, modalPanelVariants, reducedModalPanelVariants)
    : selectVariants(shouldReduce, bottomSheetVariants, reducedBottomSheetVariants);

/**
 * §4.8's five sizes, in the plan's own pixels rather than the nearest step on
 * Tailwind's scale — it asks for 400/560/720/920 and `max-w-md`/`lg`/`2xl` are
 * 448/512/672. Every cap is under `md:` because a sheet is full-bleed (§8.2).
 */
const PANEL_SIZES = {
  sm: 'md:max-w-[400px]',
  md: 'md:max-w-[560px]',
  lg: 'md:max-w-[720px]',
  xl: 'md:max-w-[920px]',
  full: 'md:max-w-[calc(100vw-3rem)]',
} as const;

export type ModalSize = keyof typeof PANEL_SIZES;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Defaults to `md`. */
  size?: ModalSize;
  /** Focused on open. Defaults to the panel itself, which reads out the title. */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Action row below the body — §4.8's footer. */
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * The one modal in the portal — Radix `Dialog` for behaviour, this file for
 * looks. §4.8: centred panel on desktop, bottom sheet under `md`, blurred
 * scrim behind, `rounded-xl`, header / scrollable body / footer.
 *
 * Every page used to hand-roll its own overlay: a portal, a scrim and a
 * click-outside handler, but no Escape key, no focus trap and no scroll lock —
 * so Tab walked out of the dialog into the page behind it and a swipe on a
 * phone scrolled that page underneath. Owning it once is what makes "Cancel"
 * and "Delete" behave identically in every flow.
 *
 * Radix supplies the behaviour that is tedious to get right and easy to get
 * wrong: focus trapping and restoration, `aria-modal`, Escape, `aria-hidden` on
 * the page behind, and the body scroll lock. The lock in particular is not
 * hand-written here — `react-remove-scroll` behind Radix's Overlay counts its
 * own active instances, so a palette opening another overlay stacks instead of
 * two locks fighting over `document.body`, and nothing in this file touches
 * global state.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  size = 'md',
  initialFocusRef,
  footer,
  className,
  children,
}) => {
  const shouldReduce = useReducedMotion();
  const isDesktop = useIsDesktopViewport();

  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Whatever had focus when the dialog opened is where focus goes back to.
   * Radix restores to its own `Dialog.Trigger`, and there isn't one — this
   * dialog is controlled, so the trigger is only knowable from here.
   */
  useEffect(() => {
    if (open) restoreFocusRef.current = document.activeElement as HTMLElement | null;
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  /**
   * Radix removes its content the instant `open` goes false, which would cut
   * the exit animation off mid-flight — hence `AnimatePresence` here and
   * `forceMount` on the portal, so Radix leaves the removal to Framer and the
   * panel stays on screen until its exit finishes.
   *
   * `forceMount` is safe only because the subtree is genuinely unmounted between
   * openings: Radix's `hideOthers` runs on mount and marks the rest of the page
   * `aria-hidden`, which must never happen while the dialog is closed.
   */
  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                variants={selectVariants(
                  shouldReduce,
                  modalBackdropVariants,
                  reducedModalBackdropVariants,
                )}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-modal bg-scrim backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content
              onOpenAutoFocus={(event) => {
                const target = initialFocusRef?.current ?? panelRef.current;
                if (!target) return;
                event.preventDefault();
                target.focus();
              }}
              onCloseAutoFocus={(event) => {
                // Radix would focus its own `Dialog.Trigger`, and there isn't
                // one: this dialog is controlled, so the element that opened it
                // is whatever had focus when `open` flipped to true.
                event.preventDefault();
                restoreFocusRef.current?.focus();
              }}
            >
              <motion.div
                ref={panelRef}
                variants={selectPanelVariants(shouldReduce, isDesktop)}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  // Below `md`: the bottom sheet — full width, rounded at the
                  // top only, sitting on the bottom edge (§8.2).
                  'fixed inset-x-0 bottom-0 z-modal flex w-full max-h-[85dvh] flex-col',
                  'rounded-t-2xl border-t border-edge bg-surface shadow-xl',
                  // From `md`: the centred panel. Auto margins on both axes
                  // centre the box horizontally and vertically.
                  'md:inset-0 md:m-auto md:h-fit md:max-h-[calc(100dvh-4rem)]',
                  'md:rounded-xl md:border',
                  PANEL_SIZES[size],
                  className,
                )}
              >
                <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="font-heading text-headline-sm text-ink">
                      {title}
                    </DialogPrimitive.Title>
                    {description && (
                      <DialogPrimitive.Description className="mt-0.5 text-body-sm text-ink-secondary">
                        {description}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    // 44×44 is the §8.3 touch minimum; the negative margins keep
                    // the icon on the same line as the header text.
                    className="-mr-1.5 -mt-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <X size={18} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>

                {/* `flex-1` plus `min-h-0` is what lets a tall body scroll inside
                    the panel instead of pushing the footer off screen (§4.8).
                    Skipped entirely when there is no body, so a footer-only
                    dialog — the confirm prompt — has no dead strip under it. */}
                {children && (
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
                )}

                {footer && (
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-edge px-5 py-4">
                    {footer}
                  </div>
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
};

export default Modal;
