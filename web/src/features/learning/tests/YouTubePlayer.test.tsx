import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { YouTubePlayer } from '../components/YouTubePlayer';

describe('YouTubePlayer component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).YT;
  });

  it('renders iframe with correct embed attributes and cinema toolbar', () => {
    render(<YouTubePlayer videoId="abc123xyz" />);

    const iframe = screen.getByTitle('YouTube lesson player');
    expect(iframe).toBeDefined();
    expect(iframe.getAttribute('src')).toContain('abc123xyz');
    expect(iframe.getAttribute('src')).toContain('enablejsapi=1');

    // Controls toolbar buttons
    expect(screen.getByRole('button', { name: /play video/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /jump back 10 seconds/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /jump forward 10 seconds/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /playback speed/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /theater mode/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /fullscreen/i })).toBeDefined();

    // Time display has current and total
    expect(screen.getAllByText('00:00')).toHaveLength(2);
  });

  it('handles playback speed selection', () => {
    render(<YouTubePlayer videoId="abc123xyz" />);

    const speedBtn = screen.getByRole('button', { name: /playback speed/i });
    expect(speedBtn.textContent).toBe('1x');

    fireEvent.click(speedBtn);

    // List of options is open
    const option15x = screen.getByRole('option', { name: /1.5x/i });
    expect(option15x).toBeDefined();

    fireEvent.click(option15x);
    expect(screen.getByRole('button', { name: /playback speed/i }).textContent).toBe('1.5x');
  });

  it('handles theater mode toggle callback and internal state', () => {
    const onToggleTheater = vi.fn();
    const { rerender } = render(
      <YouTubePlayer videoId="abc123xyz" isTheater={false} onToggleTheater={onToggleTheater} />
    );

    const theaterBtn = screen.getByRole('button', { name: /theater mode/i });
    fireEvent.click(theaterBtn);
    expect(onToggleTheater).toHaveBeenCalledTimes(1);

    rerender(<YouTubePlayer videoId="abc123xyz" isTheater={true} onToggleTheater={onToggleTheater} />);
    expect(screen.getByRole('button', { name: /exit theater mode/i })).toBeDefined();
  });

  it('handles keyboard shortcuts (k, j, l, t, f)', () => {
    const onToggleTheater = vi.fn();
    render(<YouTubePlayer videoId="abc123xyz" onToggleTheater={onToggleTheater} />);

    const playerRegion = screen.getByRole('region', { name: /video player/i });

    // Theater mode shortcut 't'
    fireEvent.keyDown(playerRegion, { key: 't' });
    expect(onToggleTheater).toHaveBeenCalledTimes(1);

    // Play/Pause shortcut 'k'
    fireEvent.keyDown(playerRegion, { key: 'k' });

    // Seek shortcuts 'j' and 'l'
    fireEvent.keyDown(playerRegion, { key: 'j' });
    fireEvent.keyDown(playerRegion, { key: 'l' });
  });

  it('invokes onPlayerReady and connects YouTube API', () => {
    let capturedEvents: any = null;
    function MockPlayer(this: any, _elem: any, options: any) {
      capturedEvents = options.events;
      this.seekTo = vi.fn();
      this.playVideo = vi.fn();
      this.pauseVideo = vi.fn();
      this.setPlaybackRate = vi.fn();
      this.getCurrentTime = vi.fn().mockReturnValue(45);
      this.getDuration = vi.fn().mockReturnValue(300);
      this.destroy = vi.fn();
      return this;
    }

    (window as any).YT = {
      Player: vi.fn(MockPlayer),
      PlayerState: {
        PLAYING: 1,
        PAUSED: 2,
        ENDED: 0,
      },
    };

    const onPlayerReady = vi.fn();
    const onDuration = vi.fn();
    const onTimeUpdate = vi.fn();

    render(
      <YouTubePlayer
        videoId="test-video"
        onPlayerReady={onPlayerReady}
        onDuration={onDuration}
        onTimeUpdate={onTimeUpdate}
      />
    );

    expect(capturedEvents).not.toBeNull();

    act(() => {
      capturedEvents.onReady();
    });

    expect(onPlayerReady).toHaveBeenCalledWith(
      expect.objectContaining({
        seekTo: expect.any(Function),
        play: expect.any(Function),
        pause: expect.any(Function),
        setPlaybackRate: expect.any(Function),
      })
    );
    expect(onDuration).toHaveBeenCalledWith(300);
  });
});
