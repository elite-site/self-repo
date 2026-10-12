import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { MORE_SHEET_NAV, NavItem } from '../navigation/NavItem';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface DoorsMenuProps {
  open: boolean;
  onClose: () => void;
  unreadCount?: number;
  onLogout?: () => void;
}

const DOOR_TRANSITION = { duration: 0.45, ease: [0.76, 0, 0.24, 1] as const };
const FADE_TRANSITION = { duration: 0.2 };

export const DoorsMenu: React.FC<DoorsMenuProps> = ({
  open,
  onClose,
  unreadCount = 0,
  onLogout,
}) => {
  const shouldReduce = useReducedMotion();
  const transition = shouldReduce ? FADE_TRANSITION : DOOR_TRANSITION;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Content
              aria-describedby={undefined}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                document.getElementById('more-sheet-trigger')?.focus();
              }}
              className="fixed inset-0 z-modal outline-none md:hidden"
            >
              <DialogPrimitive.Title className="sr-only">More</DialogPrimitive.Title>

              <motion.div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1/2 border-r border-edge bg-surface"
                initial={shouldReduce ? { opacity: 0 } : { x: '-100%' }}
                animate={shouldReduce ? { opacity: 1 } : { x: 0 }}
                exit={shouldReduce ? { opacity: 0 } : { x: '-100%' }}
                transition={transition}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-y-0 right-0 w-1/2 bg-surface"
                initial={shouldReduce ? { opacity: 0 } : { x: '100%' }}
                animate={shouldReduce ? { opacity: 1 } : { x: 0 }}
                exit={shouldReduce ? { opacity: 0 } : { x: '100%' }}
                transition={transition}
              />

              <motion.div
                className="relative flex h-full flex-col justify-center overflow-y-auto px-6 py-16"
                initial={{ opacity: 0, y: shouldReduce ? 0 : 12 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: shouldReduce ? 0 : 0.3, duration: 0.25 },
                }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <ul className="mx-auto w-full max-w-sm space-y-1">
                  {MORE_SHEET_NAV.map((entry) => (
                    <li key={entry.path}>
                      <NavItem
                        entry={entry}
                        showDescription
                        badge={entry.path === '/notifications' ? unreadCount : 0}
                        onNavigate={onClose}
                      />
                    </li>
                  ))}
                </ul>

                {onLogout ? (
                  <div className="mx-auto mt-4 w-full max-w-sm border-t border-edge pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onLogout();
                      }}
                      className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-soft px-4 py-3 font-ui text-label-lg font-semibold text-brand transition-colors duration-quick hover:bg-brand hover:text-on-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span>Sign out</span>
                    </button>
                  </div>
                ) : null}
              </motion.div>

              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex size-11 items-center justify-center rounded-full bg-surface-sunken text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <X size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </DialogPrimitive.Close>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
};
