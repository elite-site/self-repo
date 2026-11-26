import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from '../TopBar';

vi.mock('@/context/ThemeContext', () => ({
  useThemeState: () => ({
    theme: 'system',
    resolvedTheme: 'light',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

describe('TopBar safe-area and alignment', () => {
  it('places safe-area-pt on sticky header outside the h-14 row and matches main horizontal padding', () => {
    const { container } = render(
      <MemoryRouter>
        <TopBar session={null} onLogout={vi.fn()} onOpenPalette={vi.fn()} />
      </MemoryRouter>,
    );

    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header?.className).toContain('safe-area-pt');
    expect(header?.className).toContain('sticky');

    const innerRow = header?.firstElementChild;
    expect(innerRow?.className).toContain('h-14');
    expect(innerRow?.className).toContain('md:px-8');
    expect(innerRow?.className).not.toContain('pt-[env(safe-area-inset-top)]');

    expect(screen.getByRole('button', { name: 'Search the portal' })).toBeInTheDocument();
  });
});
