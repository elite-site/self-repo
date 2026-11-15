import { Readable } from 'stream';
import crypto from 'crypto';
import { DriveContext } from './types';
import { UpstreamError } from '../../../utils/appError';

export interface DriveFileStreamResult {
  stream: Readable;
  mimeType: string;
  sizeBytes: number;
  md5Checksum: string | null;
}

/**
 * Fetch a file stream and its metadata from Google Drive.
 *
 * SEC-4 & ERR-12: Never log fileId. Only sizeBytes and mimeType may be logged.
 * ERR-10: Wrap Drive SDK errors into UpstreamError.
 */
export async function getFileStream(
  ctx: DriveContext,
  fileId: string,
): Promise<DriveFileStreamResult> {
  if (ctx.isMock || !ctx.drive) {
    const content = Buffer.from('synthetic-video-stream-content');
    const md5Checksum = crypto.createHash('md5').update(content).digest('hex');
    return {
      stream: Readable.from(content),
      mimeType: 'video/mp4',
      sizeBytes: content.length,
      md5Checksum,
    };
  }

  try {
    const metaRes = await ctx.drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: 'id,mimeType,size,md5Checksum',
    });

    const mimeType = metaRes.data.mimeType || 'application/octet-stream';
    const sizeBytes = metaRes.data.size ? parseInt(metaRes.data.size, 10) : 0;
    const md5Checksum = metaRes.data.md5Checksum || null;

    const streamRes = await ctx.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    );

    return {
      stream: streamRes.data as Readable,
      mimeType,
      sizeBytes,
      md5Checksum,
    };
  } catch (err: unknown) {
    if (err instanceof UpstreamError) {
      throw err;
    }
    throw new UpstreamError(
      `Drive getFileStream failed: ${(err as Error).message}`,
      502,
      'drive',
    );
  }
}
