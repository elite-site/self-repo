import sharp from 'sharp';
import { env } from '../config/env';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
  dimensions?: { width: number; height: number };
}

export class ValidationService {
  private static readonly ALLOWED_IMAGE_MIMES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  public static readonly ALLOWED_VIDEO_MIMES = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-matroska',
    'video/matroska',
  ];

  public static readonly ALLOWED_AUDIO_MIMES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/aac',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp4',
    'audio/ogg',
  ];

  /**
   * Identifies a buffer's real media type from its magic bytes.
   *
   * file-type v18+ is ESM-only and dropped the default export in favour of the
   * named `fileTypeFromBuffer`, so it can no longer be imported statically from
   * this CommonJS build. tsconfig sets `module: node16`, which preserves a
   * dynamic `import()` in the emitted CJS instead of rewriting it to `require()`
   * (which would fail with ERR_REQUIRE_ESM).
   *
   * v20+ also throws EndOfStreamError when the buffer is too short to classify,
   * where v16 returned undefined. This normalises that back to undefined so the
   * callers' existing `!type` checks keep behaving identically.
   */
  private static async sniffMime(
    fileBuffer: Buffer
  ): Promise<{ mime: string; ext: string } | undefined> {
    const { fileTypeFromBuffer } = await import('file-type');
    try {
      return await fileTypeFromBuffer(fileBuffer);
    } catch {
      return undefined;
    }
  }

  /**
   * Validates an uploaded image file using file-type sniffing and Sharp decoding
   */
  public static async validateImage(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number
  ): Promise<FileValidationResult> {
    // 1. Check size limit (10MB for images)
    const maxSizeBytes = env.MAX_IMAGE_SIZE_MB * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      const mbSize = (fileSize / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `This image "${fileName}" is ${mbSize} MB. Maximum allowed size is ${env.MAX_IMAGE_SIZE_MB} MB.`,
      };
    }

    // 2. Real mime type sniffing
    let detectedMime = 'image/jpeg';
    try {
      const type = await this.sniffMime(fileBuffer);
      if (!type || !this.ALLOWED_IMAGE_MIMES.includes(type.mime)) {
        return {
          valid: false,
          error: `File "${fileName}" is not a valid image format. Accepted formats: JPG, PNG, WEBP. Detected: ${type?.mime || 'unknown'}`,
        };
      }
      detectedMime = type.mime;
    } catch {
      // Fallback inspection if sniffing library fails
    }

    // 3. Deep image integrity check with Sharp
    try {
      const metadata = await sharp(fileBuffer).metadata();
      if (!metadata.width || !metadata.height) {
        return {
          valid: false,
          error: `Image "${fileName}" is corrupted or could not be decoded.`,
        };
      }

      return {
        valid: true,
        detectedMime,
        dimensions: { width: metadata.width, height: metadata.height },
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `File "${fileName}" is not a valid or readable image: ${err?.message || 'Decryption/Decoding failed'}`,
      };
    }
  }

  /**
   * Validates an optional video file (max 25MB)
   */
  public static async validateVideo(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number
  ): Promise<FileValidationResult> {
    // 1. Check size limit
    const maxSizeBytes = env.MAX_VIDEO_SIZE_MB * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      return {
        valid: false,
        error: `Video file is too large. Maximum size is ${env.MAX_VIDEO_SIZE_MB} MB.`,
      };
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const ALLOWED_VIDEO_EXTS = ['mp4', 'mov', 'webm', 'mkv'];

    if (!ALLOWED_VIDEO_EXTS.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file format. Please upload MP4, MOV, WebM, or MKV video up to ${env.MAX_VIDEO_SIZE_MB} MB.`,
      };
    }

    try {
      const type = await this.sniffMime(fileBuffer);

      if (!type || !this.ALLOWED_VIDEO_MIMES.includes(type.mime as any)) {
        return {
          valid: false,
          error: `Unsupported file format. Please upload MP4, MOV, WebM, or MKV video up to ${env.MAX_VIDEO_SIZE_MB} MB. Detected: ${type?.mime || 'unknown'}`,
        };
      }

      return {
        valid: true,
        detectedMime: type.mime,
      };
    } catch {
      return {
        valid: false,
        error: `Unsupported file format. Please upload MP4, MOV, WebM, or MKV video up to ${env.MAX_VIDEO_SIZE_MB} MB.`,
      };
    }
  }

  /**
   * Validates an audio file (max 10MB)
   */
  public static async validateAudio(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number
  ): Promise<FileValidationResult> {
    // 1. Check size limit (10MB for audio)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      return {
        valid: false,
        error: 'Audio file is too large. Maximum size is 10 MB.',
      };
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const ALLOWED_AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'ogg'];

    if (!ALLOWED_AUDIO_EXTS.includes(ext)) {
      return {
        valid: false,
        error: 'Unsupported file format. Please upload MP3, WAV, M4A, AAC, OGG audio up to 10 MB.',
      };
    }

    try {
      const type = await this.sniffMime(fileBuffer);

      if (!type || !this.ALLOWED_AUDIO_MIMES.includes(type.mime as any)) {
        return {
          valid: false,
          error: `Unsupported file format. Please upload MP3, WAV, M4A, AAC, OGG audio up to 10 MB. Detected: ${type?.mime || 'unknown'}`,
        };
      }

      return {
        valid: true,
        detectedMime: type.mime,
      };
    } catch {
      return {
        valid: false,
        error: 'Unsupported file format. Please upload MP3, WAV, M4A, AAC, OGG audio up to 10 MB.',
      };
    }
  }
}
