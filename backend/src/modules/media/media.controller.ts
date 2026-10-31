import { NextFunction, Request, Response } from 'express';
import { resolveContentRange } from '../../utils/rangeParser';
import { NotFoundError } from '../../utils/appError';
import { logger } from '../../utils/logger';
import * as mediaService from './media.service';

export async function streamMedia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { type, fileId } = req.params;
    const rangeHeader = req.headers.range;

    const { stream, mimeType, size, contentRange } = await mediaService.streamMedia(
      type,
      fileId,
      rangeHeader
    );

    let responseMimeType = mimeType;
    if (!responseMimeType || responseMimeType === 'application/octet-stream') {
      if (type === 'video') responseMimeType = 'video/mp4';
      else if (type === 'photo') responseMimeType = 'image/jpeg';
      else if (type === 'resume' || type === 'certificate') responseMimeType = 'application/pdf';
    }

    res.setHeader('Content-Type', responseMimeType || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    const range = resolveContentRange(contentRange, rangeHeader, size);

    if (range) {
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${range.total}`);
      res.setHeader('Content-Length', String(range.end - range.start + 1));
      res.status(206);
    } else if (rangeHeader && size !== undefined) {
      if (typeof (stream as any).destroy === 'function') {
        (stream as any).destroy();
      }
      res.setHeader('Content-Range', `bytes */${size}`);
      res.status(416).end();
      return;
    } else if (size !== undefined) {
      res.setHeader('Content-Length', String(size));
      res.status(200);
    } else {
      res.status(200);
    }

    res.on('close', () => {
      if (!res.writableFinished && typeof (stream as any).destroy === 'function') {
        (stream as any).destroy();
      }
    });

    stream.on('error', (streamErr) => {
      logger.error('Media stream failed', { type, error: streamErr });
      if (!res.headersSent) {
        next(streamErr);
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (err) {
    if (res.headersSent) {
      logger.error('Media stream failed after headers were sent', { error: err });
      res.end();
      return;
    }
    throw err;
  }
}

export async function getThumbnail(req: Request, res: Response): Promise<void> {
  const { type, id } = req.params;
  const buffer = await mediaService.getThumbnail(type, id);

  if (!buffer) {
    throw new NotFoundError('Thumbnail could not be generated', 'THUMBNAIL_NOT_FOUND');
  }

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  res.send(buffer);
}
