import { Request, Response } from 'express';
import * as repo from '../public.repository';
import * as service from '../public.service';
import { driveService } from '../../../services/drive.service';

const PUBLIC_VIDEO_WHERE = {
  status: 'APPROVED' as const,
  isPublic: true,
  isActive: true,
};

export async function listPublicVideos(req: Request, res: Response): Promise<void> {
  try {
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
  } catch (err: any) {
    console.error('Error fetching public videos:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getFeaturedPublicVideos(_req: Request, res: Response): Promise<void> {
  try {
    const payload = await service.videoListCache.wrap('featured:6', () =>
      repo.listPublishedVideos(6, PUBLIC_VIDEO_WHERE).then(({ items, total }) => ({
        items: items.map(service.serializePublicVideo),
        total,
      }))
    );

    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(payload);
  } catch (err: any) {
    console.error('Error fetching featured public videos:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function streamPublicVideo(req: Request, res: Response): Promise<void> {
  try {
    let fileId = service.videoFileIdCache.get(req.params.id);

    if (!fileId) {
      const video = await repo.findPublishedVideoById(req.params.id, PUBLIC_VIDEO_WHERE);
      if (!video?.driveFileId) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'This video is not published.' });
        return;
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
        console.warn(`[PublicVideos] Direct link probe failed for ${fileId}, falling back to proxy stream`);
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

    stream.on('error', () => {
      if (!res.headersSent) res.status(500);
      res.end();
    });
    stream.pipe(res);
  } catch (err: any) {
    console.error('Error streaming public video:', err);
    if (!res.headersSent) {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: 'Requested media could not be found or loaded.' });
    }
  }
}
