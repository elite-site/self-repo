import React, { useEffect, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTypewriter } from '../hooks/useTypewriter';

interface TypewriterTextProps {
  text: string;
  ready?: boolean;
  animate?: boolean;
  storageKey?: string;
  className?: string;
}

const readFlag = (key?: string): boolean => {
  if (!key) return false;
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (key?: string): void => {
  if (!key) return;
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    return;
  }
};

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  ready = true,
  animate = true,
  storageKey,
  className,
}) => {
  const reduce = useReducedMotion();
  const [alreadyPlayed] = useState(() => readFlag(storageKey));
  const enabled = ready && animate && !reduce && !alreadyPlayed;
  const { shown, done } = useTypewriter(text, enabled);

  useEffect(() => {
    if (enabled && done) writeFlag(storageKey);
  }, [enabled, done, storageKey]);

  if (!ready) {
    return (
      <span className={className}>
        <span className="invisible">{text}</span>
      </span>
    );
  }

  if (!enabled || done) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {shown}
        <span className="inline-block w-0 align-baseline">
          <span className="inline-block h-[0.9em] w-0.5 translate-y-[0.1em] animate-pulse bg-current" />
        </span>
        <span className="invisible">{text.slice(shown.length)}</span>
      </span>
    </span>
  );
};
