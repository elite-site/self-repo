import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';

const mockSetTheme = vi.fn();
const mockShowToast = vi.fn();
const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock('@/context/ThemeContext', () => ({
  useThemeState: () => ({
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: mockSetTheme,
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    logout: mockLogout,
  }),
}));

vi.mock('@/shared/ui/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

describe('SettingsPage theme selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reflects the active theme and calls setTheme when changed', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    const select = screen.getByLabelText('Theme') as HTMLSelectElement;
    expect(select.value).toBe('light');

    fireEvent.change(select, { target: { value: 'dark' } });
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
    expect(mockShowToast).toHaveBeenCalledWith('Switched to dark mode');

    fireEvent.change(select, { target: { value: 'system' } });
    expect(mockSetTheme).toHaveBeenCalledWith('system');
    expect(mockShowToast).toHaveBeenCalledWith('Switched to system default');
  });
});
