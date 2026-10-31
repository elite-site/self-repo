import { NextFunction, Request, Response } from 'express';
import * as repo from '../public.repository';
import * as service from '../public.service';
import { driveService } from '../../media/drive';
import { AppError, NotFoundError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

const PUBLIC_VIDEO_WHERE = {
  status: 'APPROVED' as const,
  isPublic: true,
  isActive: true,
};

export async function listPublicVideos(req: Request, res: Response): Promise<void> {
  const rawLimit = parseInt(String(req.query.limit), 10);
  const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 24 : Math.min(rawLimit, 60);

  const payload = await service.videoListCache.wrap(`list:${limit}`, () =>
    repo.listPublishedVideos(limit, PUBLIC_VIDEO_WHERE).then(({ items, total }) => ({
      items: items.map(service.serializePublicVideo),
      total,
    }))
  );

  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json(payload);
}

export async function getFeaturedPublicVideos(_req: Request, res: Response): Promise<void> {
  const payload = await service.videoListCache.wrap('featured:6', () =>
    repo.listPublishedVideos(6, PUBLIC_VIDEO_WHERE).then(({ items, total }) => ({
      items: items.map(service.serializePublicVideo),
      total,
    }))
  );

  res.setHeader('Cache-Control', 'public, max-age=120');
  res.json(payload);
}

export async function streamPublicVideo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let fileId = service.videoFileIdCache.get(req.params.id);

    if (!fileId) {
      const video = await repo.findPublishedVideoById(req.params.id, PUBLIC_VIDEO_WHERE);
      if (!video?.driveFileId) {
        throw new NotFoundError('This video is not published.');
      }
      fileId = video.driveFileId;
      service.videoFileIdCache.set(req.params.id, fileId);
    }

    const etag = `"${req.params.id}"`;

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    const forceStream = req.query.stream === '1' || req.query.stream === 'true' || req.query.proxy === 'true' || req.query.proxy === '1';
    const directLink = driveService.getDirectLink(fileId);
    if (!forceStream && directLink && (await driveService.isPubliclyReadable(fileId))) {
      const probeOk = await driveService.probeDirectLink(directLink, fileId);
      if (probeOk) {
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('ETag', etag);
        res.redirect(302, directLink);
        return;
      } else {
        logger.warn('[PublicVideos] Direct link probe failed, falling back to proxy stream');
      }
    }

    const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
      fileId,
      undefined,
      req.headers.range,
    );

    res.setHeader('Content-Type', mimeType || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('ETag', etag);

    if (contentRange) {
      res.setHeader('Content-Range', `bytes ${contentRange.start}-${contentRange.end}/${contentRange.total}`);
      res.setHeader('Content-Length', String(contentRange.end - contentRange.start + 1));
      res.status(206);
    } else if (size !== undefined) {
      res.setHeader('Content-Length', String(size));
      res.status(200);
    } else {
      res.status(200);
    }

    stream.on('error', (streamErr) => {
      logger.error('[public video] Stream failed', { error: streamErr });
      if (!res.headersSent) {
        next(streamErr);
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (err) {
    if (res.headersSent) {
      logger.error('[public video] Stream failed after headers were sent', { error: err });
      res.end();
      return;
    }
    // Public video playback only ever means "stream it" or "not found".
    if (err instanceof AppError) throw err;
    throw new NotFoundError('Requested media could not be found or loaded.', 'MEDIA_NOT_FOUND');
  }
}
