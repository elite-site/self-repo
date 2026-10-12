import type confettiFn from 'canvas-confetti';

type CelebrateKind = 'complete' | 'success';

const COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const hasCanvasSupport = (): boolean => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext && canvas.getContext('2d'));
  } catch {
    return false;
  }
};

export async function celebrate(kind: CelebrateKind = 'success'): Promise<void> {
  if (prefersReducedMotion() || !hasCanvasSupport()) return;
  try {
    const confettiModule = await import('canvas-confetti');
    const confetti = (
      (confettiModule as { default?: typeof confettiFn }).default || confettiModule
    ) as typeof confettiFn;
    if (typeof confetti !== 'function') return;

    const base = { zIndex: 9999, colors: COLORS, disableForReducedMotion: true };

    if (kind === 'success') {
      confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 38, origin: { x: 0.5, y: 0.35 } });
      return;
    }

    confetti({ ...base, particleCount: 90, spread: 65, angle: 60, startVelocity: 48, origin: { x: 0.05, y: 0.7 } });
    confetti({ ...base, particleCount: 90, spread: 65, angle: 120, startVelocity: 48, origin: { x: 0.95, y: 0.7 } });
    window.setTimeout(() => {
      confetti({ ...base, particleCount: 60, spread: 100, origin: { x: 0.5, y: 0.4 } });
    }, 250);
  } catch {
    // Non-fatal if canvas or confetti is unavailable in current environment
  }
}
