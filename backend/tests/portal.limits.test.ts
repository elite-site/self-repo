import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    portalSettings: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import('../src/lib/prisma');
const { getMaxVideoSizeMb, getMaxVideoHardCapMb, getDefaultMaxVideoSizeMb } = await import(
  '../src/services/limits.service'
);

describe('portal video size limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMaxVideoHardCapMb', () => {
    it('defaults to 100 MB so an administrator can raise the limit', () => {
      expect(getMaxVideoHardCapMb()).toBe(100);
    });

    it('honours an explicit hard cap', () => {
      vi.stubEnv('MAX_VIDEO_SIZE_HARD_CAP_MB', '250');
      expect(getMaxVideoHardCapMb()).toBe(250);
      vi.unstubAllEnvs();
    });

    it('ignores a nonsensical hard cap', () => {
      vi.stubEnv('MAX_VIDEO_SIZE_HARD_CAP_MB', '0');
      expect(getMaxVideoHardCapMb()).toBe(100);
      vi.unstubAllEnvs();
    });
  });

  describe('getDefaultMaxVideoSizeMb', () => {
    it('matches the environment default of 25 MB', () => {
      expect(getDefaultMaxVideoSizeMb()).toBe(25);
    });
  });

  describe('getMaxVideoSizeMb', () => {
    // The regression: the admin setting existed but was never read, so editing it
    // had no effect on the limit that uploads were actually held to.
    it('uses the administrator-configured value when one is stored', async () => {
      (prisma.portalSettings.findUnique as any).mockResolvedValue({ value: '60' });
      expect(await getMaxVideoSizeMb()).toBe(60);
    });

    it('falls back to the env default when nothing is stored', async () => {
      (prisma.portalSettings.findUnique as any).mockResolvedValue(null);
      expect(await getMaxVideoSizeMb()).toBe(25);
    });

    it('falls back to the env default for an unparseable value', async () => {
      (prisma.portalSettings.findUnique as any).mockResolvedValue({ value: 'lots' });
      expect(await getMaxVideoSizeMb()).toBe(25);
    });

    it('never exceeds the hard cap, even if configured higher', async () => {
      (prisma.portalSettings.findUnique as any).mockResolvedValue({ value: '5000' });
      expect(await getMaxVideoSizeMb()).toBe(100);
    });

    it('treats a zero or negative value as unset', async () => {
      (prisma.portalSettings.findUnique as any).mockResolvedValue({ value: '0' });
      expect(await getMaxVideoSizeMb()).toBe(25);
    });

    // A settings read failure must not take down the upload path.
    it('falls back to the env default when the lookup throws', async () => {
      (prisma.portalSettings.findUnique as any).mockRejectedValue(new Error('db down'));
      expect(await getMaxVideoSizeMb()).toBe(25);
    });
  });
});
