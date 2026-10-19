import { useRef, useCallback, MouseEvent } from 'react';

export function useSpotlight<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  const onMouseMove = useCallback((e: MouseEvent<T>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty('--mx', `${x}px`);
    ref.current.style.setProperty('--my', `${y}px`);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.setProperty('--mx', '-999px');
    ref.current.style.setProperty('--my', '-999px');
  }, []);

  return {
    ref,
    onMouseMove,
    onMouseLeave,
    spotlightProps: {
      ref,
      onMouseMove,
      onMouseLeave,
    },
  };
}

export default useSpotlight;
