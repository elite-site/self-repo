import { animate } from 'framer-motion';

const CHIP_SIZE = 40;
const TARGET_SELECTORS = ['[data-nav-target="/registrations"]', '[data-nav-target="more"]'];

const isVisible = (element: Element): boolean => element.getClientRects().length > 0;

const findTarget = (): HTMLElement | null => {
  for (const selector of TARGET_SELECTORS) {
    const match = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isVisible);
    if (match) return match;
  }
  return null;
};

export async function flyToTarget(from: DOMRect): Promise<boolean> {
  const target = findTarget();
  if (!target) return false;

  const to = target.getBoundingClientRect();
  const startX = from.left + from.width / 2 - CHIP_SIZE / 2;
  const startY = from.top + from.height / 2 - CHIP_SIZE / 2;
  const dx = to.left + to.width / 2 - CHIP_SIZE / 2 - startX;
  const dy = to.top + to.height / 2 - CHIP_SIZE / 2 - startY;
  const lift = Math.min(140, Math.abs(dy) * 0.4 + 40);

  const chip = document.createElement('div');
  chip.className = 'bg-brand text-on-brand';
  chip.textContent = '✓';
  chip.setAttribute('aria-hidden', 'true');
  Object.assign(chip.style, {
    position: 'fixed',
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${CHIP_SIZE}px`,
    height: `${CHIP_SIZE}px`,
    borderRadius: '9999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    pointerEvents: 'none',
    zIndex: '9999',
  });
  document.body.appendChild(chip);

  try {
    await animate(
      chip,
      {
        x: [0, dx * 0.5, dx],
        y: [0, dy * 0.5 - lift, dy],
        scale: [1, 0.9, 0.35],
        opacity: [1, 1, 0.9],
      },
      { duration: 0.7, ease: 'easeInOut', times: [0, 0.5, 1] },
    );
  } finally {
    chip.remove();
  }

  animate(target, { scale: [1, 1.18, 0.96, 1] }, { duration: 0.45, ease: 'easeOut' });
  return true;
}
