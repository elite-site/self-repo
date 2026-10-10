import path from 'path';
import { AppError } from '../../utils/appError';
import { ValidationService } from '../../services/validation.service';

export function validateVisibilityPayload(body: any): boolean {
  const { isPublic } = body || {};
  if (typeof isPublic !== 'boolean') {
    throw new AppError('VALIDATION_ERROR', 'isPublic must be true or false.', 400, 'video.schema:validateVisibilityPayload');
  }
  return isPublic;
}

export function validateVideoSessionPayload(body: any, maxVideoSizeMb: number) {
  const { fileName, fileSize, mimeType } = body ?? {};

  const sizeNum = typeof fileSize === 'number' ? fileSize : parseInt(String(fileSize ?? '0'), 10);
  if (!sizeNum || Number.isNaN(sizeNum) || sizeNum <= 0) {
    throw new AppError('VALIDATION_ERROR', 'Valid fileSize is required.', 400, 'video.schema:validateVideoSessionPayload');
  }

  const maxBytes = maxVideoSizeMb * 1024 * 1024;
  if (sizeNum > maxBytes) {
    throw new AppError('FILE_TOO_LARGE', `Video must be under ${maxVideoSizeMb} MB.`, 413, 'video.schema:validateVideoSessionPayload');
  }

  const cleanMime = typeof mimeType === 'string' ? mimeType.split(';')[0].trim().toLowerCase() : '';
  if (!cleanMime.startsWith('video/') && !ValidationService.ALLOWED_VIDEO_MIMES.includes(cleanMime)) {
    throw new AppError('VALIDATION_ERROR', 'Only video files are allowed.', 400, 'video.schema:validateVideoSessionPayload');
  }

  const cleanFileName = typeof fileName === 'string' ? fileName.trim() : '';
  const ext = path.extname(cleanFileName).toLowerCase().replace(/^\./, '');
  const ALLOWED_EXTS = ['mp4', 'mov', 'webm', 'mkv'];
  if (!cleanFileName || (ext && !ALLOWED_EXTS.includes(ext))) {
    throw new AppError('VALIDATION_ERROR', 'Unsupported video format. Allowed formats: MP4, MOV, WebM, MKV.', 400, 'video.schema:validateVideoSessionPayload');
  }

  return { cleanFileName, sizeNum, cleanMime, ext };
}

export function validateVideoCompletePayload(body: any): string {
  const { driveFileId } = body ?? {};
  if (!driveFileId || typeof driveFileId !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'Valid driveFileId is required.', 400, 'video.schema:validateVideoCompletePayload');
  }
  return driveFileId.trim();
}

export function validateVideoStreamHeaders(headers: any, maxVideoSizeMb: number, defaultRollNo: string) {
  const contentLength = parseInt(headers['content-length'] ?? '0', 10);
  if (!contentLength) {
    throw new AppError('LENGTH_REQUIRED', 'Content-Length header is required.', 411, 'video.schema:validateVideoStreamHeaders');
  }

  const maxBytes = maxVideoSizeMb * 1024 * 1024;
  if (contentLength > maxBytes) {
    throw new AppError('FILE_TOO_LARGE', `Video must be under ${maxVideoSizeMb} MB.`, 413, 'video.schema:validateVideoStreamHeaders');
  }

  const rawMime = (headers['content-type'] ?? '').split(';')[0].trim();
  if (!rawMime.startsWith('video/')) {
    throw new AppError('VALIDATION_ERROR', 'Only video files are allowed.', 400, 'video.schema:validateVideoStreamHeaders');
  }

  const origFilename = headers['x-filename']
    ? decodeURIComponent(headers['x-filename'] as string)
    : `video_${defaultRollNo}.mp4`;

  return { contentLength, rawMime, origFilename };
}
