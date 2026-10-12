import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TranscriptViewer,
  formatTimestamp,
} from '../components/TranscriptViewer';
import { TranscriptSegment } from '../types';

const mockSegments: TranscriptSegment[] = [
  { text: 'Welcome to the TypeScript Monolith course.', offset: 0, duration: 10 },
  { text: 'We explore clean architecture and repository patterns.', offset: 10, duration: 15 },
  { text: 'Prisma queries should only exist inside repositories.', offset: 25, duration: 20 },
  { text: 'Controllers handle HTTP translation and validation.', offset: 45, duration: 15 },
  { text: 'Services orchestrate business rules and external adapters.', offset: 60, duration: 30 },
];

describe('TranscriptViewer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('formatTimestamp helper', () => {
    it('formats seconds into MM:SS format', () => {
      expect(formatTimestamp(0)).toBe('00:00');
      expect(formatTimestamp(5)).toBe('00:05');
      expect(formatTimestamp(65)).toBe('01:05');
      expect(formatTimestamp(600)).toBe('10:00');
    });

    it('formats hours into HH:MM:SS format when over an hour', () => {
      expect(formatTimestamp(3665)).toBe('1:01:05');
      expect(formatTimestamp(7200)).toBe('2:00:00');
    });
  });

  describe('Rendering', () => {
    it('renders all transcript segments with formatted timestamps', () => {
      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={vi.fn()}
        />
      );

      expect(screen.getByText('Welcome to the TypeScript Monolith course.')).toBeInTheDocument();
      expect(screen.getByText('Prisma queries should only exist inside repositories.')).toBeInTheDocument();
      expect(screen.getByText('[00:00]')).toBeInTheDocument();
      expect(screen.getByText('[00:10]')).toBeInTheDocument();
      expect(screen.getByText('[00:25]')).toBeInTheDocument();
    });

    it('highlights the active segment based on currentTime matching offset and duration', () => {
      const { rerender } = render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={12} // Matches segment 2: offset 10, duration 15 (10-25)
          onSeek={vi.fn()}
        />
      );

      // Segment 2 should have aria-current="true"
      const segment2Btn = screen.getByRole('button', {
        name: /\[00:10\] We explore clean architecture and repository patterns\./i,
      });
      expect(segment2Btn).toHaveAttribute('aria-current', 'true');

      // Segment 1 should not have aria-current
      const segment1Btn = screen.getByRole('button', {
        name: /\[00:00\] Welcome to the TypeScript Monolith course\./i,
      });
      expect(segment1Btn).not.toHaveAttribute('aria-current');

      // Advance currentTime to segment 3 (offset 25, duration 20 => 25-45)
      rerender(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={30}
          onSeek={vi.fn()}
        />
      );

      const segment3Btn = screen.getByRole('button', {
        name: /\[00:25\] Prisma queries should only exist inside repositories\./i,
      });
      expect(segment3Btn).toHaveAttribute('aria-current', 'true');
      expect(segment2Btn).not.toHaveAttribute('aria-current');
    });

    it('renders empty state when available is false or segments list is empty', () => {
      render(
        <TranscriptViewer
          segments={[]}
          currentTime={0}
          onSeek={vi.fn()}
          available={false}
        />
      );

      expect(screen.getByText('No transcript available')).toBeInTheDocument();
      expect(
        screen.getByText(/Transcripts and captions have not been generated for this lesson yet\./i)
      ).toBeInTheDocument();
    });

    it('renders loading skeleton when isLoading is true', () => {
      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={vi.fn()}
          isLoading={true}
        />
      );

      expect(screen.getByLabelText('Loading transcript')).toBeInTheDocument();
      expect(screen.queryByText('Welcome to the TypeScript Monolith course.')).not.toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('filters transcript lines matching search query and highlights match with mark tag', async () => {
      const user = userEvent.setup();
      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search transcript...');
      await user.type(searchInput, 'Prisma');

      // Only matching line should be rendered
      expect(screen.getByText(/queries should only exist inside repositories/)).toBeInTheDocument();
      expect(screen.getByText('Prisma')).toBeInTheDocument();
      const markTag = screen.getByText('Prisma');
      expect(markTag.tagName.toLowerCase()).toBe('mark');

      // Non-matching lines should not be rendered
      expect(screen.queryByText(/Welcome to the TypeScript Monolith course/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Controllers handle HTTP translation/)).not.toBeInTheDocument();
    });

    it('shows empty search state when no lines match query and allows clearing search', async () => {
      const user = userEvent.setup();
      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search transcript...');
      await user.type(searchInput, 'xyznonexistentterm');

      expect(screen.getByText(/No lines found matching/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();

      // Click clear search
      await user.click(screen.getByRole('button', { name: 'Clear search' }));

      // Full list restored
      expect(screen.getByText('Welcome to the TypeScript Monolith course.')).toBeInTheDocument();
    });

    it('clears search via clear icon button in input', async () => {
      const user = userEvent.setup();
      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search transcript...');
      await user.type(searchInput, 'Services');

      const clearBtn = screen.getByLabelText('Clear search query');
      await user.click(clearBtn);

      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Welcome to the TypeScript Monolith course.')).toBeInTheDocument();
    });
  });

  describe('Seek callbacks', () => {
    it('calls onSeek with the segment offset when a line is clicked', async () => {
      const user = userEvent.setup();
      const onSeekMock = vi.fn();

      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={onSeekMock}
        />
      );

      // Click segment 3 with offset 25
      const segment3Btn = screen.getByRole('button', {
        name: /\[00:25\] Prisma queries should only exist inside repositories\./i,
      });
      await user.click(segment3Btn);

      expect(onSeekMock).toHaveBeenCalledTimes(1);
      expect(onSeekMock).toHaveBeenCalledWith(25);
    });

    it('calls onSeek when clicking on timestamp of a segment', async () => {
      const user = userEvent.setup();
      const onSeekMock = vi.fn();

      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={onSeekMock}
        />
      );

      // Click on timestamp text "[00:45]"
      const timestampSpan = screen.getByText('[00:45]');
      await user.click(timestampSpan);

      expect(onSeekMock).toHaveBeenCalledWith(45);
    });
  });

  describe('Auto-scroll toggle', () => {
    it('toggles auto-scroll state on click', async () => {
      const user = userEvent.setup();

      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={vi.fn()}
        />
      );

      const autoScrollBtn = screen.getByRole('button', { name: /Auto-scroll On/i });
      expect(autoScrollBtn).toHaveAttribute('aria-pressed', 'true');

      await user.click(autoScrollBtn);

      expect(screen.getByRole('button', { name: /Auto-scroll Off/i })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });
  });

  describe('Copy and Download functionality', () => {
    it('copies formatted transcript text to clipboard', async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={vi.fn()}
        />
      );

      const copyBtn = screen.getByRole('button', { name: /Copy transcript/i });
      await user.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledTimes(1);
      const copiedText = writeTextMock.mock.calls[0][0];
      expect(copiedText).toContain('[00:00] Welcome to the TypeScript Monolith course.');
      expect(copiedText).toContain('[00:25] Prisma queries should only exist inside repositories.');
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    it('triggers file download with transcript content', async () => {
      const user = userEvent.setup();
      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/fake-url');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      render(
        <TranscriptViewer
          segments={mockSegments}
          currentTime={0}
          onSeek={vi.fn()}
        />
      );

      const downloadBtn = screen.getByRole('button', { name: /Download transcript/i });
      await user.click(downloadBtn);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/fake-url');
    });
  });
});

vi.mock('@/shared/lib/celebrate', () => ({
  celebrate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../api', () => ({
  learningApi: {
    getLesson: vi.fn(),
    getCourse: vi.fn(),
    getLessonTranscript: vi.fn(),
    saveProgress: vi.fn(),
    getQuiz: vi.fn(),
    submitQuiz: vi.fn(),
  },
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LessonPlayerPage } from '../pages/LessonPlayerPage';
import { learningApi } from '../api';
import { celebrate } from '@/shared/lib/celebrate';
import { mockLessonDetail, mockCourseDetail, mockTranscript } from '../api/fixtures';

describe('LessonPlayerPage with Transcript Companion', () => {
  const renderLessonPlayer = (lessonId = 'lesson-1') => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/learning/lessons/${lessonId}`]}>
          <Routes>
            <Route path="/learning/lessons/:lessonId" element={<LessonPlayerPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(learningApi.getLesson).mockResolvedValue({
      ...mockLessonDetail,
      progress: { completed: false, secondsWatched: 0, maxPositionSec: 0 },
    });
    vi.mocked(learningApi.getCourse).mockResolvedValue(mockCourseDetail);
    vi.mocked(learningApi.getLessonTranscript).mockResolvedValue(mockTranscript);
    vi.mocked(learningApi.saveProgress).mockResolvedValue({
      success: true,
      completed: true,
      courseProgressPercent: 75,
    });
  });

  it('renders studio layout with YouTube player, tabs, and interactive transcript', async () => {
    renderLessonPlayer('lesson-1');

    await waitFor(() => {
      expect(screen.getByText('Introduction & System Overview')).toBeInTheDocument();
    });

    // Verify tabs
    expect(screen.getByRole('tab', { name: /Transcript/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Syllabus/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Notes/i })).toBeInTheDocument();

    // Verify transcript is rendered inside default tab
    await waitFor(() => {
      expect(
        screen.getByText('Welcome to Modern TypeScript & Node.js Architecture.')
      ).toBeInTheDocument();
    });
  });

  it('toggles theater mode on and off', async () => {
    const user = userEvent.setup();
    renderLessonPlayer('lesson-1');

    await waitFor(() => {
      const theaterBtns = screen.getAllByRole('button', { name: /theater/i });
      expect(theaterBtns.length).toBeGreaterThan(0);
    });

    const theaterBtns = screen.getAllByRole('button', { name: /theater/i });
    await user.click(theaterBtns[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /exit theater/i }).length).toBeGreaterThan(0);
    });

    const exitBtns = screen.getAllByRole('button', { name: /exit theater/i });
    await user.click(exitBtns[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /theater mode/i }).length).toBeGreaterThan(0);
    });
  });

  it('marks lesson as completed and celebrates with success confetti', async () => {
    const user = userEvent.setup();
    renderLessonPlayer('lesson-1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mark as Completed/i })).toBeInTheDocument();
    });

    const completeBtn = screen.getByRole('button', { name: /Mark as Completed/i });
    await user.click(completeBtn);

    expect(celebrate).toHaveBeenCalledWith('success');
    expect(learningApi.saveProgress).toHaveBeenCalledWith(
      'lesson-1',
      expect.objectContaining({ completed: true })
    );
  });

  it('loads lesson properly when route parameter is :id instead of :lessonId', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/learning/lessons/lesson-1']}>
          <Routes>
            <Route path="/learning/lessons/:id" element={<LessonPlayerPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Introduction & System Overview')).toBeInTheDocument();
    });
  });

  it('renders ErrorState when lesson fails to load', async () => {
    vi.mocked(learningApi.getLesson).mockRejectedValueOnce(new Error('Network error loading lesson'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/learning/lessons/non-existent-lesson']}>
          <Routes>
            <Route path="/learning/lessons/:id" element={<LessonPlayerPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Could not load lesson')).toBeInTheDocument();
      expect(screen.getByText(/Network error loading lesson/)).toBeInTheDocument();
    });
  });
});
