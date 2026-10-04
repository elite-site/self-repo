import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadDirectToDrive, isNotificationPollingPaused, pauseNotificationPolling, resumeNotificationPolling } from '../api';

describe('Direct-to-Drive uploadDirectToDrive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resumeNotificationPolling();
  });

  it('pauses and resumes notification polling correctly', () => {
    expect(isNotificationPollingPaused()).toBe(false);
    pauseNotificationPolling();
    expect(isNotificationPollingPaused()).toBe(true);
    resumeNotificationPolling();
    expect(isNotificationPollingPaused()).toBe(false);
  });

  it('uploads small file in a single chunk with status 200', async () => {
    const fileBytes = new Uint8Array(1024 * 1024); // 1 MB
    const file = new File([fileBytes], 'test.mp4', { type: 'video/mp4' });
    const sessionUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=test_1';

    // Mock XMLHttpRequest
    const openSpy = vi.fn();
    const setHeaderSpy = vi.fn();
    const sendSpy = vi.fn();

    const originalXHR = window.XMLHttpRequest;
    (window as any).XMLHttpRequest = vi.fn(function (this: any) {
      this.upload = { addEventListener: vi.fn() };
      this.open = openSpy;
      this.setRequestHeader = setHeaderSpy;
      this.send = sendSpy.mockImplementation(() => {
        this.status = 200;
        this.responseText = JSON.stringify({ id: 'drive_file_completed_123' });
        this.onload();
      });
      this.getResponseHeader = vi.fn();
    });

    try {
      const result = await uploadDirectToDrive({
        sessionUrl,
        file,
        chunkSize: 8 * 1024 * 1024,
      });

      expect(openSpy).toHaveBeenCalledWith('PUT', sessionUrl);
      expect(setHeaderSpy).toHaveBeenCalledWith('Content-Range', `bytes 0-${1024 * 1024 - 1}/${1024 * 1024}`);
      expect(result.driveFileId).toBe('drive_file_completed_123');
    } finally {
      window.XMLHttpRequest = originalXHR;
    }
  });

  it('aborts and sends DELETE on cancellation', async () => {
    const fileBytes = new Uint8Array(1024 * 1024);
    const file = new File([fileBytes], 'test.mp4', { type: 'video/mp4' });
    const sessionUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=test_cancel';

    const abortController = new AbortController();
    abortController.abort(); // already aborted

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    window.fetch = fetchMock;

    await expect(
      uploadDirectToDrive({
        sessionUrl,
        file,
        signal: abortController.signal,
      }),
    ).rejects.toThrow('Upload was cancelled.');

    expect(fetchMock).toHaveBeenCalledWith(sessionUrl, { method: 'DELETE' });
  });
});
