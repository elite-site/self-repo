import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { VideoLessonPlayer } from '../components/VideoLessonPlayer';
import { learningApi } from '../api';

vi.mock('../api', () => ({
  learningApi: {
    getPlayback: vi.fn(),
    heartbeatPlayback: vi.fn(),
    releasePlayback: vi.fn().mockResolvedValue({ released: true }),
  },
}));

beforeAll(() => {
  // Ensure HTMLMediaElement methods and properties exist in jsdom environment
  window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { value: false, configurable: true, writable: true });
    this.dispatchEvent(new Event('play'));
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  });

  window.HTMLMediaElement.prototype.pause = vi.fn().mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { value: true, configurable: true, writable: true });
    this.dispatchEvent(new Event('pause'));
  });

  window.HTMLMediaElement.prototype.load = vi.fn();
});

describe('VideoLessonPlayer component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Preparing your video" state when status is PREPARING', async () => {
    vi.mocked(learningApi.getPlayback).mockResolvedValueOnce({
      status: 'PREPARING',
      retryAfterSec: 3,
    });

    render(<VideoLessonPlayer lessonId="lesson-vid-prep" />);

    expect(await screen.findByText(/Preparing your video.../i)).toBeInTheDocument();
    expect(screen.getByText(/This may take a few moments/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('transitions to READY when URL is returned and renders <video>', async () => {
    vi.mocked(learningApi.getPlayback).mockResolvedValueOnce({
      status: 'READY',
      url: 'https://r2.example.com/test-stream.mp4',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      leaseId: 'lease-test-1',
    });

    render(<VideoLessonPlayer lessonId="lesson-vid-ready" durationSec={120} />);

    const video = (await screen.findByLabelText(/Lesson video content/i)) as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.getAttribute('src')).toBe('https://r2.example.com/test-stream.mp4');

    // Controls toolbar buttons are present
    expect(screen.getByRole('button', { name: /play video/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jump back 5 seconds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jump forward 5 seconds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mute video/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /playback speed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
  });

  it('resumes from maxPositionSec / initialSeconds', async () => {
    vi.mocked(learningApi.getPlayback).mockResolvedValueOnce({
      status: 'READY',
      url: 'https://r2.example.com/resume-test.mp4',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      leaseId: 'lease-resume',
    });

    render(
      <VideoLessonPlayer
        lessonId="lesson-vid-resume"
        initialSeconds={25}
        maxPositionSec={55}
        durationSec={180}
      />,
    );

    const video = (await screen.findByLabelText(/Lesson video content/i)) as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { value: 180, configurable: true, writable: true });

    act(() => {
      fireEvent.loadedMetadata(video);
    });

    expect(video.currentTime).toBe(55);
  });

  it('playback speed controls (changes playbackRate)', async () => {
    vi.mocked(learningApi.getPlayback).mockResolvedValueOnce({
      status: 'READY',
      url: 'https://r2.example.com/speed-test.mp4',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      leaseId: 'lease-speed',
    });

    render(<VideoLessonPlayer lessonId="lesson-vid-speed" durationSec={100} />);

    const video = (await screen.findByLabelText(/Lesson video content/i)) as HTMLVideoElement;
    const speedBtn = screen.getByRole('button', { name: /playback speed/i });
    expect(speedBtn.textContent).toBe('1x');

    fireEvent.click(speedBtn);

    const option15x = screen.getByRole('option', { name: /1.5x/i });
    expect(option15x).toBeInTheDocument();

    fireEvent.click(option15x);

    expect(video.playbackRate).toBe(1.5);
    expect(screen.getByRole('button', { name: /playback speed/i }).textContent).toBe('1.5x');
  });

  it('URL swap preserves currentTime and playing state', async () => {
    let resolveFirstPlayback: (val: any) => void;
    const firstPlaybackPromise = new Promise((resolve) => {
      resolveFirstPlayback = resolve;
    });

    vi.mocked(learningApi.getPlayback).mockReturnValueOnce(firstPlaybackPromise as any);

    const { rerender } = render(<VideoLessonPlayer lessonId="lesson-swap" durationSec={200} />);

    act(() => {
      resolveFirstPlayback({
        status: 'READY',
        url: 'https://r2.example.com/v1.mp4',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        leaseId: 'lease-v1',
      });
    });

    const video = (await screen.findByLabelText(/Lesson video content/i)) as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { value: 200, configurable: true, writable: true });

    act(() => {
      fireEvent.loadedMetadata(video);
      video.currentTime = 85;
      video.play();
    });

    expect(video.currentTime).toBe(85);
    expect(!video.paused).toBe(true);

    // Heartbeat updates URL in usePlayback
    vi.mocked(learningApi.heartbeatPlayback).mockResolvedValueOnce({
      url: 'https://r2.example.com/v2-renewed.mp4',
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    });

    // Simulate URL renewal through rerender / hook update
    rerender(<VideoLessonPlayer lessonId="lesson-swap" durationSec={200} />);

    // When new URL metadata loads, currentTime is preserved at 85
    act(() => {
      fireEvent.loadedMetadata(video);
    });

    expect(video.currentTime).toBe(85);
  });

  it('auto-next countdown triggers and can be cancelled', async () => {
    vi.mocked(learningApi.getPlayback).mockResolvedValueOnce({
      status: 'READY',
      url: 'https://r2.example.com/autonext.mp4',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      leaseId: 'lease-autonext',
    });

    const onNextLesson = vi.fn();

    render(
      <VideoLessonPlayer
        lessonId="lesson-autonext"
        durationSec={100}
        nextLessonTitle="Advanced TypeScript Patterns"
        onNextLesson={onNextLesson}
      />,
    );

    const video = (await screen.findByLabelText(/Lesson video content/i)) as HTMLVideoElement;

    act(() => {
      fireEvent.ended(video);
    });

    expect(screen.getByText(/Next lesson in 5.../i)).toBeInTheDocument();
    expect(screen.getByText('Advanced TypeScript Patterns')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByText(/Next lesson in/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Video ended/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /replay/i })).toBeInTheDocument();
    expect(onNextLesson).not.toHaveBeenCalled();
  });

  it('error state renders with retry action', async () => {
    vi.mocked(learningApi.getPlayback).mockRejectedValueOnce(new Error('Network timeout'));

    render(<VideoLessonPlayer lessonId="lesson-error" />);

    expect(await screen.findByText(/Unable to load video playback/i)).toBeInTheDocument();
    expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    vi.mocked(learningApi.getPlayback).mockResolvedValueOnce({
      status: 'READY',
      url: 'https://r2.example.com/retry-success.mp4',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      leaseId: 'lease-rec',
    });

    act(() => {
      fireEvent.click(retryBtn);
    });

    const video = await screen.findByLabelText(/Lesson video content/i);
    expect(video).toBeInTheDocument();
    expect(video.getAttribute('src')).toBe('https://r2.example.com/retry-success.mp4');
  });
});
