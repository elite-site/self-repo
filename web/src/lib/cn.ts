import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Composes class names.
 *
 * `clsx` handles conditional composition (`cn('a', isOn && 'b')`), `twMerge`
 * resolves Tailwind conflicts so the last utility wins (`cn('p-2', 'p-4')` is
 * `p-4`, not both). Every component takes `className?: string` and ends in
 * `cn(<own classes>, className)` so a caller can override.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}