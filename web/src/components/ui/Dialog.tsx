import { Modal } from './Modal';

export type { ModalProps, ModalSize } from './Modal';

/**
 * The pre-redesign name for `Modal`, kept so the pages that still import it do
 * not all change in the same pass as the component itself.
 *
 * There used to be a hand-rolled dialog here — its own portal, key handler,
 * focus trap and body scroll lock. It is now the plan's `Modal`
 * (REDESIGN_PLAN §4.8), which is Radix `Dialog` underneath: the same trap and
 * restore, plus Escape, `aria-modal`, `aria-hidden` on the page behind, a
 * scroll lock that stacks instead of fighting, and the mobile bottom sheet.
 * Two implementations of "a modal" is exactly the inconsistency §3.6 exists to
 * prevent, so this is an alias rather than a second component.
 *
 * New code imports `Modal` from `./Modal`. This name goes when the remaining
 * call sites move.
 */
export const Dialog = Modal;

export default Dialog;
