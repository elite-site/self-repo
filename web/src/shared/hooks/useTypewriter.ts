import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

export function useTypewriter(
  text: string,
  enabled: boolean,
  msPerChar = 35,
): { shown: string; done: boolean } {
  const [count, setCount] = useState(() => (enabled && text.length > 0 ? 0 : text.length));
  const [isFinished, setIsFinished] = useState(() => !enabled || text.length === 0);

  useEffect(() => {
    if (!enabled || text.length === 0) {
      setCount(text.length);
      setIsFinished(true);
      return;
    }

    setCount(0);
    setIsFinished(false);

    const controls = animate(0, text.length, {
      duration: (text.length * msPerChar) / 1000,
      ease: 'linear',
      onUpdate: (value) => setCount(Math.floor(value)),
      onComplete: () => {
        setCount(text.length);
        setIsFinished(true);
      },
    });

    return () => controls.stop();
  }, [text, enabled, msPerChar]);

  const done = !enabled || isFinished;
  return { shown: text.slice(0, count), done };
}
