import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommandPalette } from '../CommandPalette';
import { searchApi } from '@/shared/api/search';
import type { CommandPaletteState } from '@/shared/hooks/useCommandPalette';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/context/ThemeContext', () => ({
  useThemeState: () => ({
    resolvedTheme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('@/shared/api/search', () => ({
  searchApi: {
    search: vi.fn(),
  },
}));

function makePalette(overrides: Partial<CommandPaletteState> = {}): CommandPaletteState {
  return {
    open: true,
    query: '',
    debouncedQuery: '',
    setQuery: vi.fn(),
    openPalette: vi.fn(),
    closePalette: vi.fn(),
    togglePalette: vi.fn(),
    setOpen: vi.fn(),
    ...overrides,
  };
}

function renderPalette(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CommandPalette global search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('safely transitions from closed to open without breaking hook order', () => {
    const Harness: React.FC = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <CommandPalette palette={makePalette({ open })} />
        </>
      );
    };

    renderPalette(<Harness />);
    expect(screen.queryByPlaceholderText(/search courses/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByPlaceholderText(/search courses/i)).toBeInTheDocument();
  });

  it('does not query the API when debounced query is under 2 characters', () => {
    renderPalette(<CommandPalette palette={makePalette({ query: 'p', debouncedQuery: 'p' })} />);
    expect(searchApi.search).not.toHaveBeenCalled();
  });

  it('renders categorized search results and navigates on selection', async () => {
    const closePalette = vi.fn();
    vi.mocked(searchApi.search).mockResolvedValue({
      query: 'python',
      total: 3,
      items: [
        {
          type: 'course',
          id: 'c1',
          title: 'Python 101',
          description: 'Core Python',
          url: '/learning/courses/python-101',
          studentId: null,
          updatedAt: '2026-11-26T00:00:00.000Z',
        },
        {
          type: 'project',
          id: 'p1',
          title: 'Python CLI',
          description: 'Automation tool',
          url: '/portfolio/projects',
          studentId: 's1',
          updatedAt: '2026-11-26T00:00:00.000Z',
        },
        {
          type: 'resume',
          id: 'r1',
          title: 'python_resume.pdf',
          description: 'My Resume',
          url: '/resume',
          studentId: 's1',
          updatedAt: '2026-11-26T00:00:00.000Z',
        },
      ],
    });

    renderPalette(
      <CommandPalette
        palette={makePalette({ query: 'python', debouncedQuery: 'python', closePalette })}
      />,
    );

    await waitFor(() => {
      expect(searchApi.search).toHaveBeenCalledWith(
        { q: 'python' },
        expect.any(AbortSignal),
      );
    });

    expect(await screen.findByText('Python 101')).toBeInTheDocument();
    expect(screen.getByText('Course')).toBeInTheDocument();
    expect(screen.getByText('Python CLI')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('python_resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('Resume')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Python 101'));
    expect(closePalette).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/learning/courses/python-101');
  });

  it('shows a retryable error item when the search request fails', async () => {
    vi.mocked(searchApi.search).mockRejectedValue(new Error('Network down'));

    renderPalette(
      <CommandPalette palette={makePalette({ query: 'python', debouncedQuery: 'python' })} />,
    );

    expect(await screen.findByText(/search unavailable/i)).toBeInTheDocument();
  });
});
