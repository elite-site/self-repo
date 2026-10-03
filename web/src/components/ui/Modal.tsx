import React, { useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Variants } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../lib/cn';
import {
  modalBackdropVariants,
  modalPanelVariants,
  reducedModalBackdropVariants,
  reducedModalPanelVariants,
  selectVariants,
} from '../../lib/motion';

const selectPanelVariants = (
  shouldReduce: boolean,
): Variants =>
  selectVariants(shouldReduce, modalPanelVariants, reducedModalPanelVariants);

/**
 * Centered modal sizes across all viewports.
 */
const PANEL_SIZES = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[920px]',
  full: 'max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-3rem)]',
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
 * looks. Centred panel across all viewports, blurred scrim behind, `rounded-xl`,
 * header / scrollable body / footer.
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
                variants={selectPanelVariants(shouldReduce)}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  'fixed inset-0 m-auto z-modal flex w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] h-fit flex-col',
                  'rounded-xl border border-edge bg-surface shadow-modal text-ink',
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
