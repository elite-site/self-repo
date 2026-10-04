import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { driveService } from '../services/drive.service';
import { TtlCache } from '../utils/ttlCache';

/**
 * Public introduction-video showcase.
 *
 * A video is only ever listed here when BOTH conditions hold:
 *   1. moderation status is APPROVED, and
 *   2. it has been published (`isPublic`), either by the student or by an admin.
 *
 * Until then nothing is exposed — the endpoint returns an empty list, so the
 * public page can be rendered before any video is approved.
 */
const router = Router();

/** Only APPROVED + published videos are publicly visible. */
const PUBLIC_VIDEO_WHERE = {
  status: 'APPROVED' as const,
  isPublic: true,
  isActive: true,
};

/** Serialise a video record into the shape the public showcase consumes. */
function serializePublicVideo(video: {
  id: string;
  driveFileId?: string | null;
  submittedAt: Date;
  publishedAt: Date | null;
  sizeMb: number | null;
  studentId: string;
  student: { name: string; rollNo: string; year: number; section: string };
}) {
  if (video.driveFileId) {
    videoFileIdCache.set(video.id, video.driveFileId);
  }
  return {
    id: video.id,
    name: video.student.name,
    rollNo: video.student.rollNo,
    year: video.student.year,
    section: video.student.section,
    submittedAt: video.submittedAt,
    publishedAt: video.publishedAt,
    sizeMb: video.sizeMb,
    // Routed through the backend so a stable, id-free URL is what the public
    // page sees. The handler answers with a redirect to Drive's CDN rather than
    // streaming the bytes, so this stays a cheap hop instead of becoming the
    // thing every viewer downloads through.
    streamUrl: `/api/public/videos/stream/${encodeURIComponent(video.id)}`,
    thumbnailUrl: video.driveFileId
      ? `/api/public/media/thumbnail/video/${encodeURIComponent(video.id)}?v=${encodeURIComponent(video.driveFileId)}`
      : null,
    profileUrl: `/students/${encodeURIComponent(video.student.rollNo)}`,
    driveFileId: video.driveFileId || null,
    previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(video.driveFileId) : null,
  };
}

const videoListCache = new TtlCache<{ items: unknown[]; total: number }>(30_000, 50);
const videoFileIdCache = new TtlCache<string>(300_000, 500);

/** Resets the showcase list cache. Exported so tests are not order-dependent. */
export const clearVideoListCache = (): void => videoListCache.clear();

const listPublishedVideos = (limit: number) =>
  Promise.all([
    prisma.introVideo.findMany({
      where: { ...PUBLIC_VIDEO_WHERE, driveFileId: { not: null } },
      select: {
        id: true,
        driveFileId: true,
        submittedAt: true,
        publishedAt: true,
        sizeMb: true,
        studentId: true,
        student: { select: { name: true, rollNo: true, year: true, section: true } },
      },
      orderBy: [{ publishedAt: 'desc' }, { submittedAt: 'desc' }],
      take: limit,
    }),
    prisma.introVideo.count({
      where: { ...PUBLIC_VIDEO_WHERE, driveFileId: { not: null } },
    }),
  ]).then(([videos, total]) => ({ items: videos.map(serializePublicVideo), total }));

// GET /api/public/videos — approved + published introduction videos
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawLimit = parseInt(String(req.query.limit), 10);
    const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 24 : Math.min(rawLimit, 60);

    const payload = await videoListCache.wrap(`list:${limit}`, () => listPublishedVideos(limit));

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (err: any) {
    console.error('Error fetching public videos:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/public/videos/stream/:id — serve one published video.
//
// This is the endpoint a showcase visitor's `<video>` element actually hits, so
// it is the one that decides how many concurrent viewers the deployment can
// hold. It answers with a 302 to Drive's CDN whenever the file is confirmed
// `anyone`-readable, which removes both the download and the per-viewer socket
// from this process: the work becomes one small redirect per viewer instead of a
// 25 MB stream through a single small instance. The streaming branch below stays
// as the fallback for files Drive will not serve anonymously.
//
// Note this does not actually keep the Drive file ID secret. It is already in
// the public payload as the `?v=` cache-buster on `thumbnailUrl`, and these
// files are `anyone`-readable by design, so the id is not a capability.
router.get('/stream/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    let fileId = videoFileIdCache.get(req.params.id);

    if (!fileId) {
      const video = await prisma.introVideo.findFirst({
        where: { ...PUBLIC_VIDEO_WHERE, id: req.params.id, driveFileId: { not: null } },
        select: { id: true, driveFileId: true },
      });

      if (!video?.driveFileId) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'This video is not published.' });
        return;
      }
      fileId = video.driveFileId;
      videoFileIdCache.set(req.params.id, fileId);
    }

    const etag = `"${req.params.id}"`;

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    // Prefer the redirect. `<video>` ignores Content-Disposition, so Drive's
    // attachment response still plays inline, and Drive honours Range, so
    // seeking keeps working without this process parsing a single byte.
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
      res.setHeader(
        'Content-Range',
        `bytes ${contentRange.start}-${contentRange.end}/${contentRange.total}`,
      );
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
});

export default router;
