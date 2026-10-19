import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

export function useCountUp(target: number, duration = 1.0): number {
  const reduce = useReducedMotion();
  const fromRef = useRef(reduce ? target : 0);
  const [display, setDisplay] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const controls = animate(fromRef.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => {
        fromRef.current = value;
        setDisplay(Math.round(value));
      },
    });
    return () => controls.stop();
  }, [target, duration, reduce]);

  return display;
}

export default useCountUp;
