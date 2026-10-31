import sharp from 'sharp';
import { env } from '../config/env';
import { getMaxVideoSizeMb } from './limits.service';

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

  /** Hard ceiling for a single study resource. Mirrors `resourceUpload`. */
  public static readonly MAX_RESOURCE_SIZE_MB = 50;

  private static readonly RESOURCE_MIME_BY_EXTENSION: Record<string, string[]> = {
    pdf: ['application/pdf'],
    doc: ['application/msword', 'application/x-cfb', 'application/vnd.ms-office'],
    docx: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
    ],
    ppt: ['application/vnd.ms-powerpoint', 'application/x-cfb', 'application/vnd.ms-office'],
    pptx: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
    ],
    xls: ['application/vnd.ms-excel', 'application/x-cfb', 'application/vnd.ms-office'],
    xlsx: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ],
    zip: ['application/zip'],
    png: ['image/png'],
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    webp: ['image/webp'],
  };

  private static readonly RESOURCE_TEXT_EXTENSIONS = new Set(['txt', 'md']);

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
   * Validates an optional video file against the portal's configured size limit.
   */
  public static async validateVideo(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number
  ): Promise<FileValidationResult> {
    // 1. Check size limit against the administrator-configured value, so the
    //    limit shown in Settings is the limit that is actually enforced.
    const maxVideoSizeMb = await getMaxVideoSizeMb();
    const maxSizeBytes = maxVideoSizeMb * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      return {
        valid: false,
        error: `Video file is too large. Maximum size is ${maxVideoSizeMb} MB.`,
      };
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const ALLOWED_VIDEO_EXTS = ['mp4', 'mov', 'webm', 'mkv'];

    if (!ALLOWED_VIDEO_EXTS.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file format. Please upload MP4, MOV, WebM, or MKV video up to ${maxVideoSizeMb} MB.`,
      };
    }

    try {
      const type = await this.sniffMime(fileBuffer);

      if (!type || !this.ALLOWED_VIDEO_MIMES.includes(type.mime as any)) {
        return {
          valid: false,
          error: `Unsupported file format. Please upload MP4, MOV, WebM, or MKV video up to ${maxVideoSizeMb} MB. Detected: ${type?.mime || 'unknown'}`,
        };
      }

      return {
        valid: true,
        detectedMime: type.mime,
      };
    } catch {
      return {
        valid: false,
        error: `Unsupported file format. Please upload MP4, MOV, WebM, or MKV video up to ${maxVideoSizeMb} MB.`,
      };
    }
  }

  /**
   * Validates a study resource upload against its real content, not the
   * browser-declared MIME type. Executables, HTML and SVG are rejected even
   * when renamed, because a resource is streamed back inline in preview mode.
   */
  public static async validateResourceFile(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number
  ): Promise<FileValidationResult> {
    const maxSizeBytes = this.MAX_RESOURCE_SIZE_MB * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      return {
        valid: false,
        error: `"${fileName}" is too large. Maximum size is ${this.MAX_RESOURCE_SIZE_MB} MB.`,
      };
    }
    if (fileSize <= 0 || fileBuffer.length === 0) {
      return { valid: false, error: `"${fileName}" is empty.` };
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (!ext) {
      return {
        valid: false,
        error: 'The file must have an extension so it can be classified safely.',
      };
    }

    // Text formats have no magic bytes, so they are checked for text-ness below.
    const isText = this.RESOURCE_TEXT_EXTENSIONS.has(ext);
    if (!isText && !this.RESOURCE_MIME_BY_EXTENSION[ext]) {
      return {
        valid: false,
        error: `Unsupported file type ".${ext}". Accepted: PDF, DOC(X), PPT(X), XLS(X), ZIP, TXT, MD, PNG, JPG, WebP.`,
      };
    }

    let detectedMime: string;
    try {
      const type = await this.sniffMime(fileBuffer);

      if (isText) {
        if (type && (type.mime.startsWith('image/') || type.mime.includes('html') || type.mime.includes('xml'))) {
          return {
            valid: false,
            error: `"${fileName}" is not plain text. HTML, SVG and markup files are not accepted.`,
          };
        }
        if (!this.looksLikeText(fileBuffer)) {
          return { valid: false, error: `"${fileName}" is not a readable text file.` };
        }
        detectedMime = ext === 'md' ? 'text/markdown' : 'text/plain';
      } else {
        if (!type) {
          return {
            valid: false,
            error: `Could not verify the real content type of "${fileName}".`,
          };
        }

        const allowed = this.RESOURCE_MIME_BY_EXTENSION[ext] || [];
        detectedMime = type.mime;

        if (type.mime.startsWith('image/') && !['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
          return { valid: false, error: `Image content does not match the ".${ext}" extension.` };
        }
        if (!allowed.includes(type.mime)) {
          return {
            valid: false,
            error: `The content of "${fileName}" does not match a supported ${ext.toUpperCase()} file (detected ${type.mime}).`,
          };
        }
      }
    } catch {
      return {
        valid: false,
        error: `"${fileName}" could not be inspected. Please re-export it and try again.`,
      };
    }

    return { valid: true, detectedMime };
  }

  /**
   * Plain text is the only accepted format without a magic-byte signature.
   * A NUL byte, an implausible share of control characters, or an HTML/SVG/XML
   * preamble means the caller is trying to smuggle active content through.
   */
  private static looksLikeText(fileBuffer: Buffer): boolean {
    const sample = fileBuffer.subarray(0, 8192);
    const text = sample.toString('utf8');
    const lowered = text.trimStart().toLowerCase();

    if (
      lowered.startsWith('<!doctype html') ||
      lowered.startsWith('<html') ||
      lowered.startsWith('<svg') ||
      lowered.startsWith('<?xml') ||
      lowered.startsWith('<script')
    ) {
      return false;
    }

    let controlChars = 0;
    for (let i = 0; i < sample.length; i += 1) {
      const byte = sample[i];
      if (byte === 0) return false;
      if (byte < 9 || (byte > 13 && byte < 32)) controlChars += 1;
    }

    return controlChars / Math.max(sample.length, 1) < 0.01;
  }
}
