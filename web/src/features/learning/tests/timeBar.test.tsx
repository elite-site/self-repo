import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { YouTubePlayer } from '../components/YouTubePlayer';
import type { TranscriptSegment } from '../types';

/**
 * Shared mock player factory — mirrors the one in YouTubePlayer.test.tsx so
 * both suites work consistently without coupling.
 */
function buildMockYT() {
  let capturedEvents: { onReady: () => void; onStateChange: (e: { data: number }) => void } | null =
    null;
  const seekTo = vi.fn();
  const playVideo = vi.fn();
  const pauseVideo = vi.fn();
  const loadVideoById = vi.fn();
  const getCurrentTime = vi.fn().mockReturnValue(0);
  const getDuration = vi.fn().mockReturnValue(300);
  const getVideoLoadedFraction = vi.fn().mockReturnValue(0.5);
  const isMuted = vi.fn().mockReturnValue(false);
  const mute = vi.fn();
  const unMute = vi.fn();
  const setVolume = vi.fn();
  const getVolume = vi.fn().mockReturnValue(100);
  const destroy = vi.fn();
  const setPlaybackRate = vi.fn();

  function MockPlayer(this: Record<string, unknown>, _elem: unknown, options: { events: typeof capturedEvents }) {
    capturedEvents = options.events;
    this.seekTo = seekTo;
    this.playVideo = playVideo;
    this.pauseVideo = pauseVideo;
    this.loadVideoById = loadVideoById;
    this.getCurrentTime = getCurrentTime;
    this.getDuration = getDuration;
    this.getVideoLoadedFraction = getVideoLoadedFraction;
    this.isMuted = isMuted;
    this.mute = mute;
    this.unMute = unMute;
    this.setVolume = setVolume;
    this.getVolume = getVolume;
    this.destroy = destroy;
    this.setPlaybackRate = setPlaybackRate;
    return this;
  }

  (window as { YT?: unknown }).YT = {
    Player: vi.fn(MockPlayer),
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
  };

  const fireReady = () => act(() => { capturedEvents?.onReady(); });
  const fireState = (state: number) =>
    act(() => { capturedEvents?.onStateChange({ data: state }); });

  return { seekTo, playVideo, pauseVideo, loadVideoById, destroy, fireReady, fireState };
}

describe('YouTubePlayer — time bar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as { YT?: unknown }).YT;
  });

  it('drag: seekTo is called exactly once on pointerUp, not on every pointerMove', () => {
    const { seekTo, fireReady } = buildMockYT();

    render(<YouTubePlayer videoId="abc123" />);
    fireReady();

    const seekBar = screen.getByRole('slider', { name: /seek video/i });

    // Simulate drag: pointerDown → multiple moves → pointerUp
    fireEvent.pointerDown(seekBar);
    fireEvent.change(seekBar, { target: { value: '10' } });
    fireEvent.change(seekBar, { target: { value: '20' } });
    fireEvent.change(seekBar, { target: { value: '30' } });
    // seekTo must NOT be called yet
    expect(seekTo).not.toHaveBeenCalled();

    // Release the pointer — seek commits
    fireEvent.pointerUp(seekBar);
    expect(seekTo).toHaveBeenCalledTimes(1);
    expect(seekTo).toHaveBeenCalledWith(30, true);
  });

  it('keyboard arrow on slider seeks immediately (no drag lock)', () => {
    const { seekTo, fireReady } = buildMockYT();

    render(<YouTubePlayer videoId="abc123" />);
    fireReady();

    const seekBar = screen.getByRole('slider', { name: /seek video/i });

    // Arrow keys fire change without a preceding pointerDown
    fireEvent.change(seekBar, { target: { value: '15' } });
    expect(seekTo).toHaveBeenCalledWith(15, true);
  });

  it('hover preview bubble shows timestamp and transcript line', () => {
    const segments: TranscriptSegment[] = [
      { text: 'Architecture overview line.', offset: 0, duration: 150 },
      { text: 'Second chapter line.', offset: 150, duration: 150 },
    ];
    const { fireReady } = buildMockYT();

    render(<YouTubePlayer videoId="abc123" transcriptSegments={segments} />);
    fireReady();

    const seekBar = screen.getByRole('slider', { name: /seek video/i });
    const timeBarWrapper = seekBar.parentElement?.parentElement;
    expect(timeBarWrapper).toBeDefined();

    if (timeBarWrapper) {
      // Simulate hover at 10%
      fireEvent.mouseMove(timeBarWrapper, { clientX: 10 });
      // Should show timestamp and line
      expect(screen.getByText(/Architecture overview line\./i)).toBeInTheDocument();

      // Mouse leave should hide preview
      fireEvent.mouseLeave(timeBarWrapper);
      expect(screen.queryByText(/Architecture overview line\./i)).not.toBeInTheDocument();
    }
  });
});

describe('YouTubePlayer — end screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as { YT?: unknown }).YT;
  });

  it('shows end screen with Replay and Next lesson when ENDED state fires', () => {
    const onNextLesson = vi.fn();
    const { fireReady, fireState } = buildMockYT();

    render(
      <YouTubePlayer
        videoId="abc123"
        nextLessonTitle="Module 2: Architecture Patterns"
        onNextLesson={onNextLesson}
      />,
    );
    fireReady();
    fireState(0); // 0 = ENDED

    expect(screen.getByRole('button', { name: /replay/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next lesson/i })).toBeInTheDocument();
    expect(screen.getByText(/Module 2: Architecture Patterns/i)).toBeInTheDocument();
  });

  it('clicking Next lesson on end screen fires onNextLesson', () => {
    const onNextLesson = vi.fn();
    const { fireReady, fireState } = buildMockYT();

    render(
      <YouTubePlayer
        videoId="abc123"
        nextLessonTitle="Next Chapter"
        onNextLesson={onNextLesson}
      />,
    );
    fireReady();
    fireState(0);

    fireEvent.click(screen.getByRole('button', { name: /next lesson/i }));
    expect(onNextLesson).toHaveBeenCalledTimes(1);
  });

  it('clicking Replay on end screen seeks to 0 and plays', () => {
    const { seekTo, playVideo, fireReady, fireState } = buildMockYT();

    render(<YouTubePlayer videoId="abc123" />);
    fireReady();
    fireState(0);

    fireEvent.click(screen.getByRole('button', { name: /replay/i }));
    expect(seekTo).toHaveBeenCalledWith(0, true);
    expect(playVideo).toHaveBeenCalled();
  });

  it('end screen is hidden while video is playing', () => {
    const { fireReady, fireState } = buildMockYT();

    render(<YouTubePlayer videoId="abc123" nextLessonTitle="Next" />);
    fireReady();
    fireState(1); // PLAYING

    expect(screen.queryByRole('button', { name: /replay/i })).not.toBeInTheDocument();
  });
});
