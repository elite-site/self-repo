import sharp from 'sharp';
import FileType from 'file-type';
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

  private static readonly ALLOWED_VIDEO_MIMES = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ];

  private static readonly ALLOWED_AUDIO_MIMES = [
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
      const type = await FileType.fromBuffer(fileBuffer);
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
    const ALLOWED_VIDEO_EXTS = ['mp4', 'mov', 'webm'];
    const BLOCKED_MIMES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/zip', 'application/x-msdownload',
      'application/x-executable', 'application/x-rar', 'text/html', 'text/plain'
    ];

    if (!ALLOWED_VIDEO_EXTS.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file format. Please upload MP4, MOV, or WebM video up to ${env.MAX_VIDEO_SIZE_MB} MB.`,
      };
    }

    try {
      const type = await FileType.fromBuffer(fileBuffer);

      // Security check: Reject if magic bytes reveal a blocked non-video format
      if (type && (BLOCKED_MIMES.includes(type.mime) || type.mime.startsWith('image/'))) {
        return {
          valid: false,
          error: `Unsupported file format. Please upload MP4, MOV, or WebM video up to ${env.MAX_VIDEO_SIZE_MB} MB.`,
        };
      }

      let detectedMime = 'video/mp4';
      if (ext === 'mp4') detectedMime = 'video/mp4';
      else if (ext === 'mov') detectedMime = 'video/quicktime';
      else if (ext === 'webm') detectedMime = 'video/webm';

      return {
        valid: true,
        detectedMime,
      };
    } catch {
      return {
        valid: true,
        detectedMime: `video/${ext}`,
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
    const BLOCKED_MIMES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/zip', 'application/x-msdownload',
      'application/x-executable', 'application/x-rar', 'text/html', 'text/plain'
    ];

    if (!ALLOWED_AUDIO_EXTS.includes(ext)) {
      return {
        valid: false,
        error: 'Unsupported file format. Please upload MP3, WAV, M4A, AAC, OGG audio up to 10 MB, ',
      };
    }

    try {
      const type = await FileType.fromBuffer(fileBuffer);

      // Security check: Reject if magic bytes reveal a blocked non-audio format (image, PDF, Zip, EXE, etc.)
      if (type && (BLOCKED_MIMES.includes(type.mime) || type.mime.startsWith('image/'))) {
        return {
          valid: false,
          error: 'Unsupported file format. Please upload MP3, WAV, M4A, AAC, OGG audio up to 10 MB, ',
        };
      }

      // Map extension to proper audio MIME type
      let detectedMime = 'audio/mpeg';
      if (ext === 'mp3') detectedMime = 'audio/mpeg';
      else if (ext === 'wav') detectedMime = 'audio/wav';
      else if (ext === 'm4a') detectedMime = 'audio/mp4';
      else if (ext === 'aac') detectedMime = 'audio/aac';
      else if (ext === 'ogg') detectedMime = 'audio/ogg';

      return {
        valid: true,
        detectedMime,
      };
    } catch {
      return {
        valid: true,
        detectedMime: `audio/${ext}`,
      };
    }
  }
}
