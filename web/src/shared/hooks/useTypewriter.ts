import { useLayoutEffect, useState } from 'react';
import { animate } from 'framer-motion';

export function useTypewriter(
  text: string,
  enabled: boolean,
  msPerChar = 35,
): { shown: string; done: boolean } {
  const [count, setCount] = useState(text.length);

  useLayoutEffect(() => {
    if (!enabled || text.length === 0) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const controls = animate(0, text.length, {
      duration: (text.length * msPerChar) / 1000,
      ease: 'linear',
      onUpdate: (value) => setCount(Math.floor(value)),
      onComplete: () => setCount(text.length),
    });
    return () => controls.stop();
  }, [text, enabled, msPerChar]);

  return { shown: text.slice(0, count), done: count >= text.length };
}
