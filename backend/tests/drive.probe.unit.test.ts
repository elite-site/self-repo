import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { driveService } from '../src/services/drive.service';

describe('DriveService.probeDirectLink unit tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    driveService.clearProbeCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    driveService.clearProbeCache();
  });

  it('returns true when probe answers 200 OK', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      body: { cancel: vi.fn().mockResolvedValue(undefined) },
    } as any);

    const ok = await driveService.probeDirectLink('https://drive.usercontent.google.com/test', 'file_1');
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('https://drive.usercontent.google.com/test', expect.objectContaining({
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
    }));
  });

  it('returns true when probe answers 206 Partial Content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 206,
      body: { cancel: vi.fn().mockResolvedValue(undefined) },
    } as any);

    const ok = await driveService.probeDirectLink('https://drive.usercontent.google.com/test', 'file_2');
    expect(ok).toBe(true);
  });

  it('returns false when probe answers 403 Forbidden', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 403,
      body: { cancel: vi.fn().mockResolvedValue(undefined) },
    } as any);

    const ok = await driveService.probeDirectLink('https://drive.usercontent.google.com/test', 'file_3');
    expect(ok).toBe(false);
  });

  it('returns false on network or timeout error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection aborted'));

    const ok = await driveService.probeDirectLink('https://drive.usercontent.google.com/test', 'file_4');
    expect(ok).toBe(false);
  });

  it('caches positive probe results for 60s and reuses without refetching', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      body: { cancel: vi.fn().mockResolvedValue(undefined) },
    } as any);
    global.fetch = fetchSpy;

    const first = await driveService.probeDirectLink('https://drive.usercontent.google.com/test', 'file_cached');
    expect(first).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call within TTL should return true from cache without calling fetch
    const second = await driveService.probeDirectLink('https://drive.usercontent.google.com/test', 'file_cached');
    expect(second).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
