import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../lib/cn';
import { selectVariants, selectVariantsByName, transitionNormal, transitionQuick } from '../../lib/motion';
import { useThemeState } from '../../context/ThemeContext';

/**
 * §7.3 — the theme control.
 *
 * The button is wired to the shared instance of `useTheme()` rather than calling
 * that hook itself. The hook holds React state per call, so the palette's
 * "Switch to dark mode" row and this button would each keep their own copy and
 * the first one to toggle would leave the other showing the old icon.
 * `useThemeState()` returns the one live instance that `ThemeContext` publishes.
 *
 * `Sun` shows in light mode and `Moon` in dark, as the spec draws it: the icon
 * names the mode you are in, and the `aria-label` names the mode the click will
 * produce, which is the pair a screen reader needs.
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { resolvedTheme, toggleTheme } = useThemeState();
  const shouldReduce = useReducedMotion();

  const isDark = resolvedTheme === 'dark';
  const nextLabel = isDark ? 'light' : 'dark';
  const pressProps = selectVariantsByName(shouldReduce, 'iconButton');

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      {...pressProps}
      aria-label={`Switch to ${nextLabel} mode`}
      title={`Switch to ${nextLabel} mode`}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-md text-ink-secondary',
        'transition-colors duration-quick hover:bg-surface-sunken hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        className,
      )}
    >
      {/* `mode="wait"` so the outgoing glyph leaves before the incoming one
          arrives; `initial={false}` so the very first paint is not a rotation. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          aria-hidden="true"
          initial={{ rotate: shouldReduce ? 0 : 90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: shouldReduce ? 0 : -90, opacity: 0 }}
          transition={selectVariants(shouldReduce, transitionNormal, transitionQuick)}
          className="flex items-center justify-center"
        >
          {isDark ? <Moon size={16} strokeWidth={1.75} /> : <Sun size={16} strokeWidth={1.75} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
};

export default ThemeToggle;