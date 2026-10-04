import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoPage from '../VideoPage';
import { api } from '../../services/api';

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<any>('../../services/api');
  return {
    ...actual,
    api: {
      getMe: vi.fn(),
      uploadDirectToDrive: vi.fn(),
      initDirectVideoUploadSession: vi.fn(),
      completeDirectVideoUpload: vi.fn(),
      uploadIntroVideo: vi.fn(),
      setVideoPublic: vi.fn(),
      deleteVideo: vi.fn(),
      getVideoBlobUrl: vi.fn(),
    },
  };
});

vi.mock('../../context/SessionContext', () => ({
  useSession: () => ({
    session: { studentId: 'stud_123', rollNo: '23K61A1299', name: 'Test Student' },
  }),
}));

vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../components/ui/ConfirmDialog', () => ({
  useConfirm: () => ({
    confirm: vi.fn(),
  }),
}));

describe('VideoPage video playback and proxy fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockVideoData = {
    student: {
      video: {
        id: 'vid_123',
        hasFile: true,
        filename: 'intro.mp4',
        sizeMb: 15,
        mimeType: 'video/mp4',
        status: 'APPROVED',
        submittedAt: '2026-03-01T12:00:00Z',
      },
      submission: null,
      maxVideoSizeMb: 25,
    },
  };

  it('initially points to direct media url, retries with ?proxy=1 on error, and shows retry UI if both fail', async () => {
    (api.getMe as any).mockResolvedValue(mockVideoData);

    const { container } = render(
      <MemoryRouter>
        <VideoPage />
      </MemoryRouter>,
    );

    // Wait for video element to render
    await waitFor(() => {
      expect(container.querySelector('video')).toBeInTheDocument();
    }, { timeout: 4000 });

    const videoEl = container.querySelector('video')!;
    const initialSrc = videoEl.getAttribute('src');
    expect(initialSrc).toContain('/api/student/submission/media/video');
    expect(initialSrc).not.toContain('&proxy=1');

    // Trigger playback error (e.g. 403 on direct redirect)
    fireEvent.error(videoEl);

    // Video should re-render with ?proxy=1 appended
    await waitFor(() => {
      const updatedVideo = container.querySelector('video');
      expect(updatedVideo).toBeInTheDocument();
      expect(updatedVideo?.getAttribute('src')).toContain('&proxy=1');
    }, { timeout: 4000 });

    const proxyVideoEl = container.querySelector('video')!;

    // Trigger error again while in proxy mode
    fireEvent.error(proxyVideoEl);

    // Player should now be replaced with error notice and Retry button
    await waitFor(() => {
      expect(screen.getByText(/This video won't play right now/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
    }, { timeout: 4000 });

    // Clicking Retry resets the error and attempts playback again without proxy
    const retryButton = screen.getByRole('button', { name: /Try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      const retriedVideo = container.querySelector('video');
      expect(retriedVideo).toBeInTheDocument();
      expect(retriedVideo?.getAttribute('src')).not.toContain('&proxy=1');
      expect(screen.queryByText(/This video won't play right now/i)).not.toBeInTheDocument();
    }, { timeout: 4000 });
  });
});
