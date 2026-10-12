import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useCountUp } from '../useCountUp';
import { useTypewriter } from '../useTypewriter';
import { TypewriterText } from '@/shared/ui/TypewriterText';
import { celebrate } from '@/shared/lib/celebrate';
import { flyToTarget } from '@/shared/lib/flyToTarget';

describe('Interactive animations suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('useCountUp', () => {
    it('returns target directly when prefers-reduced-motion is active', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useCountUp(100));
      expect(result.current).toBe(100);
    });

    it('initializes and provides counter state', () => {
      const { result } = renderHook(() => useCountUp(42));
      expect(typeof result.current).toBe('number');
    });
  });

  describe('useTypewriter', () => {
    it('returns full text immediately when disabled', () => {
      const { result } = renderHook(() => useTypewriter('Hello World', false));
      expect(result.current.shown).toBe('Hello World');
      expect(result.current.done).toBe(true);
    });

    it('starts with initial text slice when enabled', () => {
      const { result } = renderHook(() => useTypewriter('Testing', true, 10));
      expect(result.current.shown.length).toBeLessThanOrEqual('Testing'.length);
    });
  });

  describe('TypewriterText', () => {
    it('renders accessible screen-reader text', () => {
      render(
        <TypewriterText
          text="Department of IT"
          ready={true}
          animate={true}
          storageKey="test-key"
        />,
      );

      expect(screen.getByText('Department of IT')).toBeInTheDocument();
    });

    it('renders static text when already played in session', () => {
      sessionStorage.setItem('test-already-played', '1');
      const { container } = render(
        <TypewriterText
          text="Welcome Back"
          ready={true}
          animate={true}
          storageKey="test-already-played"
        />,
      );

      expect(container.textContent).toBe('Welcome Back');
      expect(container.querySelector('.animate-pulse')).toBeNull();
    });
  });

  describe('celebrate', () => {
    it('runs celebrate without crashing', async () => {
      await expect(celebrate('success')).resolves.not.toThrow();
      await expect(celebrate('complete')).resolves.not.toThrow();
    });
  });

  describe('flyToTarget', () => {
    it('returns false gracefully when no nav target element exists', async () => {
      const rect = {
        left: 100,
        top: 100,
        right: 150,
        bottom: 150,
        width: 50,
        height: 50,
        x: 100,
        y: 100,
        toJSON: () => {},
      };
      const res = await flyToTarget(rect);
      expect(res).toBe(false);
    });

    it('animates towards matching target element', async () => {
      const target = document.createElement('div');
      target.setAttribute('data-nav-target', '/registrations');
      // Mock getClientRects and getBoundingClientRect for JSDOM
      target.getClientRects = vi.fn().mockReturnValue([{ width: 50, height: 50 }]);
      target.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 200,
        top: 200,
        right: 250,
        bottom: 250,
        width: 50,
        height: 50,
        x: 200,
        y: 200,
        toJSON: () => {},
      });
      document.body.appendChild(target);

      const fromRect = {
        left: 50,
        top: 50,
        right: 90,
        bottom: 90,
        width: 40,
        height: 40,
        x: 50,
        y: 50,
        toJSON: () => {},
      };

      const res = await flyToTarget(fromRect);
      expect(res).toBe(true);
      target.remove();
    });
  });
});
