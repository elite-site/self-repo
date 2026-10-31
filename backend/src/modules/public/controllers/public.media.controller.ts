import { NextFunction, Request, Response } from 'express';
import * as repo from '../public.repository';
import * as service from '../public.service';
import { driveService } from '../../media/drive';
import { AppError, NotFoundError, ValidationError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

const REDIRECTABLE_TYPES = new Set(['video']);

export async function getMediaThumbnail(req: Request, res: Response): Promise<void> {
  const { type, id } = req.params;
  if (!id || !type) {
    throw new ValidationError('Type and ID are required.');
  }

  try {
    let record: any = null;
    let driveFileId: string | null = null;
    let thumbnail: Buffer | null = null;

    if (type === 'certificate') {
      record = await repo.findCertificateById(id);
      driveFileId = record?.fileDriveId ?? null;
    } else if (type === 'achievement') {
      record = await repo.findAchievementById(id);
      driveFileId = record?.proofDriveId ?? null;
    } else if (type === 'resume') {
      record = await repo.findResumeById(id);
      driveFileId = record?.driveFileId ?? null;
    } else if (type === 'video') {
      record = await repo.findIntroVideoById(id);
      driveFileId = record?.driveFileId ?? null;
      if (!record) {
        const sub = await repo.findSubmissionByIdOrRollNo(id);
        driveFileId = sub?.videoDriveId ?? null;
        if (driveFileId) {
          const iv = await repo.findIntroVideoByStudent(sub?.rollNo || id);
          if (iv) record = iv;
        }
      }

      const requestedVersion = typeof req.query.v === 'string' ? req.query.v.trim() : null;
      if (requestedVersion && requestedVersion.length > 0) {
        driveFileId = requestedVersion;
      }

      if (!driveFileId || !driveFileId.trim()) {
        const svg = service.getThumbnailPlaceholderSvg('video');
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).send(svg);
        return;
      }
    }

    if (!req.query.t && record?.thumbnail) {
      const matchesCurrentVideo = !record.driveFileId || !driveFileId || record.driveFileId === driveFileId;
      if (matchesCurrentVideo) {
        thumbnail = Buffer.isBuffer(record.thumbnail) ? record.thumbnail : Buffer.from(record.thumbnail);
      }
    }

    const versionKey = driveFileId || id;
    const etag = `"${versionKey}"`;

    if (req.headers['if-none-match'] === etag && !req.query.t) {
      res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
      res.setHeader('ETag', etag);
      res.status(304).end();
      return;
    }

    if (!thumbnail && driveFileId) {
      try {
        const generated = await driveService.generateThumbnail(driveFileId, type as 'video' | 'resume' | 'certificate' | 'achievement');
        if (generated) {
          thumbnail = generated;
          if (type === 'resume') {
            await repo.updateResumeThumbnail(id, generated);
          } else if (type === 'video') {
            if (record?.id) {
              await repo.updateVideoThumbnail(record.id, generated);
            } else {
              await repo.updateVideoThumbnailByDriveId(driveFileId, generated);
            }
          } else if (type === 'achievement') {
            await repo.updateAchievementThumbnail(id, generated);
          } else if (type === 'certificate') {
            await repo.updateCertificateThumbnail(id, generated);
          }
        }
      } catch (genErr) {
        // Non-fatal: a thumbnail is a convenience, the placeholder below is an
        // acceptable response and generating it must never fail the request.
        logger.warn('[thumbnail] Lazy generation failed', { type, id, error: genErr });
      }
    }

    if (thumbnail) {
      res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
      res.setHeader('ETag', etag);
      res.setHeader('Content-Type', 'image/webp');
      res.status(200).send(thumbnail);
    } else {
      const svg = service.getThumbnailPlaceholderSvg(type);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).send(svg);
    }
  } catch (err) {
    // Non-fatal: browsers render a broken-image icon for a JSON error, so this
    // endpoint always answers with a placeholder image instead.
    logger.warn('[thumbnail] Error serving thumbnail', {
      type: req.params?.type,
      id: req.params?.id,
      error: err,
    });
    if (!res.headersSent) {
      const svg = service.getThumbnailPlaceholderSvg(req.params?.type || 'document');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.status(200).send(svg);
    }
  }
}

export async function streamPublicMedia(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { type, fileId } = req.params;
    if (!fileId) {
      throw new ValidationError('File ID is required.');
    }

    const cacheKey = `${type}:${fileId}`;
    if (req.query.t || req.query.v) {
      service.mediaDriveIdCache.delete(cacheKey);
    }
    let resolvedDriveId: string | null = service.mediaDriveIdCache.get(cacheKey) || null;
    if (!resolvedDriveId && (fileId.startsWith('mock_') || fileId.startsWith('drive_'))) {
      resolvedDriveId = fileId;
      service.mediaDriveIdCache.set(cacheKey, fileId);
    } else if (!resolvedDriveId) {
      try {
        if (type === 'certificate') {
          const cert = await repo.findCertificateById(fileId);
          if (cert?.fileDriveId) resolvedDriveId = cert.fileDriveId;
        } else if (type === 'achievement') {
          const ach = await repo.findAchievementById(fileId);
          if (ach?.proofDriveId) resolvedDriveId = ach.proofDriveId;
        } else if (type === 'resume') {
          const resRec = await repo.findResumeById(fileId);
          if (resRec?.driveFileId) resolvedDriveId = resRec.driveFileId;
        } else if (type === 'photo') {
          const prof = await repo.findStudentProfileByIdOrStudent(fileId);
          if (prof?.photoDriveId) resolvedDriveId = prof.photoDriveId;
        } else if (type === 'video') {
          const vid = await repo.findIntroVideoForPublicMedia(fileId);
          if (vid?.driveFileId) {
            resolvedDriveId = vid.driveFileId;
          } else {
            const sub = await repo.findSubmissionByIdOrRollNo(fileId);
            if (sub?.videoDriveId) resolvedDriveId = sub.videoDriveId;
          }
        }
      } catch (lookupErr) {
        // Non-fatal: the media path accepts a raw storage id too, so a failed
        // id lookup falls back to streaming the id as-is below.
        logger.warn('[public media] DB lookup failed', { type, error: lookupErr });
      }
      if (resolvedDriveId) {
        service.mediaDriveIdCache.set(cacheKey, resolvedDriveId);
      }
    }

    const targetDriveFileId = resolvedDriveId || fileId;
    const etag = `"${targetDriveFileId}"`;
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === etag) {
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('ETag', etag);
      res.status(304).end();
      return;
    }

    const forceStream = req.query.stream === '1' || req.query.stream === 'true' || req.query.proxy === 'true' || req.query.proxy === '1';
    if (!forceStream && REDIRECTABLE_TYPES.has(type) && driveService.canRedirectToDrive()) {
      const directLink = driveService.getDirectLink(targetDriveFileId);
      if (directLink && (await driveService.isPubliclyReadable(targetDriveFileId))) {
        const probeOk = await driveService.probeDirectLink(directLink, targetDriveFileId);
        if (probeOk) {
          res.setHeader('Cache-Control', 'private, max-age=3600');
          res.setHeader('ETag', etag);
          res.redirect(302, directLink);
          return;
        } else {
          logger.warn('[PublicMedia] Direct link probe failed, falling back to proxy stream', {
            type,
          });
        }
      }
    }

    const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
      targetDriveFileId,
      undefined,
      req.headers.range,
    );

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');
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
      logger.error('[public media] Stream failed', { type, error: streamErr });
      if (!res.headersSent) {
        next(streamErr);
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (err) {
    if (res.headersSent) {
      logger.error('[public media] Stream failed after headers were sent', { error: err });
      res.end();
      return;
    }
    // Public media only ever means "here is the file" or "not found".
    if (err instanceof AppError) throw err;
    throw new NotFoundError('Requested media could not be found or loaded.', 'MEDIA_NOT_FOUND');
  }
}
