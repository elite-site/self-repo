import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { driveService } from '../services/drive.service';

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
  submittedAt: Date;
  publishedAt: Date | null;
  sizeMb: number | null;
  studentId: string;
  student: { name: string; rollNo: string; year: number; section: string };
}) {
  return {
    id: video.id,
    name: video.student.name,
    rollNo: video.student.rollNo,
    year: video.student.year,
    section: video.student.section,
    submittedAt: video.submittedAt,
    publishedAt: video.publishedAt,
    sizeMb: video.sizeMb,
    // Streamed through the backend so the Drive file ID is never exposed.
    streamUrl: `/api/public/videos/stream/${encodeURIComponent(video.id)}`,
    profileUrl: `/students/${encodeURIComponent(video.student.rollNo)}`,
  };
}

// GET /api/public/videos — approved + published introduction videos
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawLimit = parseInt(String(req.query.limit), 10);
    const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 24 : Math.min(rawLimit, 60);

    const videos = await prisma.introVideo.findMany({
      where: { ...PUBLIC_VIDEO_WHERE, driveFileId: { not: null } },
      include: { student: { select: { name: true, rollNo: true, year: true, section: true } } },
      orderBy: [{ publishedAt: 'desc' }, { submittedAt: 'desc' }],
      take: limit,
    });

    const total = await prisma.introVideo.count({
      where: { ...PUBLIC_VIDEO_WHERE, driveFileId: { not: null } },
    });

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ items: videos.map(serializePublicVideo), total });
  } catch (err: any) {
    console.error('Error fetching public videos:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/public/videos/stream/:id — stream one published video.
// Resolves the Drive file server-side so the public page never sees a file ID.
router.get('/stream/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const video = await prisma.introVideo.findFirst({
      where: { ...PUBLIC_VIDEO_WHERE, id: req.params.id, driveFileId: { not: null } },
      include: { student: { select: { rollNo: true } } },
    });

    if (!video?.driveFileId) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'This video is not published.' });
      return;
    }

    const fileId = video.driveFileId;
    const etag = `"${video.id}"`;

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
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
