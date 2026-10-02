/**
 * Pre-redesign import path, kept working.
 *
 * The implementation moved to `components/ui/ToastProvider.tsx` — that is where
 * REDESIGN_PLAN §11 puts shared primitives. Every page that called
 * `useToast().showToast(...)` before the move imports from here, so nothing has
 * to change in them; `showToast` is still on the context, aliased to `toast`.
 *
 * New code imports `./components/ui/ToastProvider` directly.
 */
export {
  ToastProvider,
  useToast,
  TOAST_DURATION_MS,
  TOAST_MAX_VISIBLE,
  default,
} from './ui/ToastProvider';

export type {
  ToastAction,
  ToastContextValue,
  ToastOptions,
  ToastRecord,
  ToastType,
  ToastVariant,
} from './ui/ToastProvider';
