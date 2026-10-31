/**
 * Animated circular progress ring — DESIGN.md §5.3
 *
 * SVG-based, zero-dependency radial progress indicator. Animates the
 * stroke-dashoffset from 0 → target on mount. Works in both light and dark
 * mode; stroke color comes from a CSS class passed by the caller.
 *
 * Usage:
 *   <RadialRing value={68} size={96} strokeWidth={8} className="text-brand" />
 */

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

export interface RadialRingProps {
  /** Percentage 0–100 */
  value: number;
  /** Diameter of the SVG in px. Default 96. */
  size?: number;
  /** Ring stroke width in px. Default 8. */
  strokeWidth?: number;
  /** Tailwind text-color class applied to the progress arc. Default 'text-brand'. */
  className?: string;
  /** Content rendered inside the ring. Defaults to `{value}%`. */
  children?: React.ReactNode;
  /** Accessible label for the progress value. */
  label?: string;
}

/**
 * Lightweight SVG radial progress ring with a one-shot fill animation.
 * Uses `stroke-dashoffset` animation — no canvas, no library.
 */
export const RadialRing: React.FC<RadialRingProps> = ({
  value,
  size = 96,
  strokeWidth = 8,
  className = 'text-brand',
  children,
  label,
}) => {
  const circleRef = useRef<SVGCircleElement>(null);
  const shouldReduce = useReducedMotion();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;

    const targetOffset = circumference * (1 - Math.min(Math.max(value, 0), 100) / 100);

    if (shouldReduce) {
      el.style.strokeDashoffset = String(targetOffset);
      return;
    }

    // Start fully hidden, then animate to target.
    el.style.strokeDashoffset = String(circumference);
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.strokeDashoffset = String(targetOffset);
    });

    return () => cancelAnimationFrame(raf);
  }, [value, circumference, shouldReduce]);

  return (
    <div
      role="img"
      aria-label={label ?? `${value}%`}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border"
        />
        {/* Progress arc */}
        <circle
          ref={circleRef}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ strokeDasharray: circumference }}
          className={`stroke-current ${className}`}
        />
      </svg>
      {/* Inner content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children ?? (
          <span className="font-heading text-headline-sm tabular-nums text-ink">
            {value}%
          </span>
        )}
      </div>
    </div>
  );
};
