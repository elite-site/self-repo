import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranscriptViewer } from '../components/TranscriptViewer';
import type { TranscriptSegment } from '../types';

const segments: TranscriptSegment[] = [
  { text: 'Alpha sentence.', offset: 0, duration: 10 },
  { text: 'Beta sentence.', offset: 10, duration: 10 },
  { text: 'Gamma sentence.', offset: 20, duration: 10 },
];

describe('TranscriptViewer — auto-follow detach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('starts with following=true (no Jump to current line button)', () => {
    render(
      <TranscriptViewer segments={segments} currentTime={5} onSeek={vi.fn()} />,
    );

    // Auto-scroll button should read "Auto-scroll On"
    expect(
      screen.getByRole('button', { name: /auto-scroll on/i }),
    ).toBeInTheDocument();

    // Jump to current line button must NOT be present initially
    expect(
      screen.queryByRole('button', { name: /jump to current line/i }),
    ).not.toBeInTheDocument();
  });

  it('shows "Jump to current line" after clicking the auto-scroll button', async () => {
    const user = userEvent.setup();
    render(
      <TranscriptViewer segments={segments} currentTime={5} onSeek={vi.fn()} />,
    );

    const autoScrollBtn = screen.getByRole('button', { name: /auto-scroll on/i });
    await user.click(autoScrollBtn);

    // Button now reads "Auto-scroll Off"
    expect(
      screen.getByRole('button', { name: /auto-scroll off/i }),
    ).toBeInTheDocument();

    // If the active segment exists (currentTime=5, segment 0 active), the
    // Jump to current line button should appear.
    expect(
      screen.getByRole('button', { name: /jump to current line/i }),
    ).toBeInTheDocument();
  });

  it('simulating a wheel event on the transcript panel detaches following', () => {
    render(
      <TranscriptViewer segments={segments} currentTime={5} onSeek={vi.fn()} />,
    );

    // The scrollable panel carries data-testid="transcript-scroll"
    const panel = screen.getByTestId('transcript-scroll');
    fireEvent.wheel(panel, { deltaY: 100 });

    // Following should now be detached
    expect(
      screen.getByRole('button', { name: /auto-scroll off/i }),
    ).toBeInTheDocument();
  });

  it('clicking "Jump to current line" re-enables following', async () => {
    const user = userEvent.setup();
    render(
      <TranscriptViewer segments={segments} currentTime={5} onSeek={vi.fn()} />,
    );

    // Detach
    const autoScrollBtn = screen.getByRole('button', { name: /auto-scroll on/i });
    await user.click(autoScrollBtn);

    // Resume
    const jumpBtn = screen.getByRole('button', { name: /jump to current line/i });
    await user.click(jumpBtn);

    // Following re-enabled; "Jump to current line" disappears
    expect(
      screen.queryByRole('button', { name: /jump to current line/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /auto-scroll on/i }),
    ).toBeInTheDocument();
  });

  it('clicking a transcript line resumes following and calls onSeek', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    render(
      <TranscriptViewer segments={segments} currentTime={5} onSeek={onSeek} />,
    );

    // Detach following
    await user.click(screen.getByRole('button', { name: /auto-scroll on/i }));

    // Click the "Beta sentence." line at offset 10
    const betaBtn = screen.getByRole('button', {
      name: /\[00:10\] Beta sentence\./i,
    });
    await user.click(betaBtn);

    // Following should be back on
    expect(
      screen.getByRole('button', { name: /auto-scroll on/i }),
    ).toBeInTheDocument();
    expect(onSeek).toHaveBeenCalledWith(10);
  });

  it('never calls scrollIntoView (uses scrollWithin instead)', async () => {
    const scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;

    render(
      <TranscriptViewer segments={segments} currentTime={5} onSeek={vi.fn()} />,
    );

    // Trigger a re-render with a new active segment
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });
});
