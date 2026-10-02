import React from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { MORE_SHEET_NAV, NavItem } from '../navigation/NavItem';

export interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  unreadCount?: number;
  onLogout?: () => void;
}

/**
 * §5.2's "More" sheet — the destinations the bottom tab bar has no room for.
 *
 * It is built on the shared `Modal` rather than a second overlay. `Modal` is
 * already the plan's bottom sheet below `md` (§8.2: `rounded-t-2xl`, full-bleed,
 * spring entrance from `bottomSheetVariants`), so the sheet this spec asks for
 * is a `Modal` opened from a tab bar that only exists below `md`. What comes
 * with it, and what a hand-rolled sheet had to re-invent, is the focus trap, the
 * focus return to the More button, `Escape`, and the body scroll lock.
 *
 * No `aria-controls` on the trigger: `Modal` does not expose an id for the dialog
 * to point at, and `aria-expanded` plus `aria-haspopup` already say what the
 * button owns.
 */
export const MoreSheet: React.FC<MoreSheetProps> = ({
  open,
  onClose,
  unreadCount = 0,
  onLogout,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title="More"
    description="Everything else in the portal"
    size="sm"
  >
    <ul className="space-y-1">
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
      <div className="mt-4 border-t border-edge pt-4">
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
  </Modal>
);

export default MoreSheet;