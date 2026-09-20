import { describe, it, expect } from 'vitest';
import { ValidationService } from '../src/services/validation.service';

// Minimal MP4 'ftypisom' header (real MP4 files start with this box).
const MP4_MAGIC = Buffer.from('000000186674797069736f6d000000006d703432', 'hex');
// Minimal PNG header (an 8-byte signature). file-type needs >= 4100 bytes to sniff,
// so the blocked-mime case pads the magic to a full minimum-size buffer.
const PNG_MAGIC = Buffer.from('89504e470d0a1a0a', 'hex');
const PNG_PADDED = Buffer.concat([PNG_MAGIC, Buffer.alloc(4096)]);

describe('ValidationService.validateVideo', () => {
  it('accepts a small mp4 header named .mp4', async () => {
    const r = await ValidationService.validateVideo(MP4_MAGIC, 'intro.mp4', MP4_MAGIC.length);
    expect(r.valid).toBe(true);
    expect(r.detectedMime).toBe('video/mp4');
  });

  it('rejects an image renamed to .mp4 via magic-byte sniffing', async () => {
    const r = await ValidationService.validateVideo(PNG_PADDED, 'evil.mp4', PNG_PADDED.length);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Unsupported file format/);
  });

  it('rejects a disallowed extension even with a plausible signature', async () => {
    const r = await ValidationService.validateVideo(MP4_MAGIC, 'intro.exe', MP4_MAGIC.length);
    expect(r.valid).toBe(false);
  });

  it('rejects files over the video size cap', async () => {
    const big = Buffer.alloc(0);
    const r = await ValidationService.validateVideo(big, 'intro.mp4', 30 * 1024 * 1024);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/too large/i);
  });
});

describe('ValidationService.validateImage', () => {
  it('rejects a truncated png header (sharp cannot decode it)', async () => {
    const r = await ValidationService.validateImage(PNG_MAGIC, 'photo.png', PNG_MAGIC.length);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/corrupted|not a valid|readable/i);
  });
});