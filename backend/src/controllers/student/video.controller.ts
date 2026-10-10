import { Request, Response } from 'express';
import { env } from '../../config/env';
import { driveService } from '../../services/drive.service';
import { resolveContentRange } from '../../utils/rangeParser';
import { AppError } from '../../utils/appError';
import {
  withdrawStudentVideo,
  setVideoVisibility,
  createVideoSession,
  completeVideoUpload,
  streamVideoUpload as streamVideoUploadService,
} from '../../services/student/video.service';
import { resolveStudentVideoForStream } from '../../services/student/videoStream.service';
import {
  validateVisibilityPayload,
  validateVideoCompletePayload,
} from '../../validators/student/video.schema';

export function deprecatedSubmission(_req: Request, res: Response): void {
  res.status(410).json({
    error: 'DEPRECATED',
    message: 'This upload endpoint has been retired. Please use /submission/video-stream.',
  });
}

export async function deleteSubmission(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  await withdrawStudentVideo(studentId);
  res.json({ success: true, message: 'Your introduction video has been deleted.' });
}

export async function updateVisibility(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const isPublic = validateVisibilityPayload(req.body);
  const result = await setVideoVisibility(studentId, isPublic);
  res.json(result);
}

export async function createSession(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const rawOrigin = (req.headers.origin || req.headers.referer || '').trim();
  let clientOrigin: string | undefined;
  if (rawOrigin) {
    try {
      const parsed = new URL(rawOrigin);
      const originNormalized = parsed.origin.trim().replace(/\/$/, '');
      if (
        env.ALLOWED_ORIGINS.includes(originNormalized) ||
        /^https:\/\/[a-z0-9_.-]+(\.netlify\.app|\.onrender\.com|\.vercel\.app)$/i.test(originNormalized) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(originNormalized)
      ) {
        clientOrigin = originNormalized;
      }
    } catch {}
  }

  const result = await createVideoSession(studentId, req.body, clientOrigin);
  res.status(200).json(result);
}

export async function completeVideo(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const driveFileId = validateVideoCompletePayload(req.body);
  const submission = await completeVideoUpload(studentId, driveFileId);
  res.status(201).json({
    success: true,
    id: submission.id,
    videoDriveId: driveFileId,
    message: 'Your introduction video has been submitted successfully.',
  });
}

export async function streamUpload(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const submission = await streamVideoUploadService(studentId, req);
  res.status(201).json({
    success: true,
    id: submission.id,
    videoDriveId: submission.videoDriveId,
    message: 'Your introduction video has been submitted successfully.',
  });
}

export async function streamVideo(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const rollNo = req.student?.rollNo;

  const { driveFileId, driveFolderPath, rollNo: effectiveRollNo } = await resolveStudentVideoForStream(studentId, rollNo);
  const etag = `"${driveFileId}"`;

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  const forceStream = req.query.proxy === '1' || req.query.proxy === 'true' || req.query.stream === '1' || req.query.stream === 'true';

  if (!forceStream && driveService.canRedirectToDrive?.()) {
    const directLink = driveService.getDirectLink(driveFileId);
    if (directLink) {
      let isPublic = await driveService.isPubliclyReadable(driveFileId);
      if (!isPublic) {
        await driveService.setViewerPermission(driveFileId).catch(() => {});
        isPublic = await driveService.isPubliclyReadable(driveFileId);
      }
      if (isPublic) {
        const probeOk = await driveService.probeDirectLink(directLink, driveFileId);
        if (probeOk) {
          res.setHeader('Cache-Control', 'private, max-age=3600');
          res.setHeader('ETag', etag);
          res.redirect(302, directLink);
          return;
        }
      }
    }
  }

  const rangeHeader = req.headers.range;
  const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
    driveFileId,
    driveFolderPath,
    rangeHeader,
  );

  res.setHeader('Content-Type', mimeType || 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
  res.setHeader('ETag', etag);

  if (req.query.download === '1' || req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="self-introduction_${effectiveRollNo}.mp4"`);
  } else {
    res.setHeader('Content-Disposition', 'inline');
  }

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

  stream.on('error', (err: any) => {
    console.error('[video.controller:streamVideo] Stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'STREAM_ERROR', message: 'Video stream interrupted' });
    } else {
      res.end();
    }
  });

  stream.pipe(res);
}
