import { CSSProperties, useMemo } from 'react';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

interface UseRevealOptions {
  index?: number;
  staggerMs?: number;
  initialDelayMs?: number;
}

export function useReveal(options: UseRevealOptions = {}) {
  const { index = 0, staggerMs = 60, initialDelayMs = 0 } = options;
  const reduce = useReducedMotion();

  const style = useMemo<CSSProperties>(() => {
    if (reduce) return {};
    const delay = initialDelayMs + index * staggerMs;
    return {
      animationDelay: `${delay}ms`,
      animationFillMode: 'both',
    };
  }, [index, staggerMs, initialDelayMs, reduce]);

  return {
    className: reduce ? '' : 'reveal-card',
    style,
  };
}

export default useReveal;
