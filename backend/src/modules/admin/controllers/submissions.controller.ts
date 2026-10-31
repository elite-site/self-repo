import { Request, Response } from 'express';
import { driveService } from '../../media/drive';
import { resolveContentRange } from '../../../utils/rangeParser';
import { NotFoundError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';
import * as adminService from '../admin.service';

export async function listSubmissions(req: Request, res: Response): Promise<void> {
  const result = await adminService.listSubmissions(req.query as any);
  res.json(result);
}

export async function getSubmissionDetail(req: Request, res: Response): Promise<void> {
  const result = await adminService.getSubmissionDetail(req.params.id);
  if (!result) {
    throw new NotFoundError('Submission not found');
  }
  res.json(result);
}

export async function streamMedia(req: Request, res: Response): Promise<void> {
  const { id, fileKey } = req.params;
  const { driveFileId, driveFolderPath } = await adminService.getMediaStreamInfo(id, fileKey);

  const etag = `"${driveFileId}"`;
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  const rangeHeader = req.headers.range;
  const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
    driveFileId,
    driveFolderPath,
    rangeHeader
  );

  let responseMimeType = mimeType;
  if (!responseMimeType || responseMimeType === 'application/octet-stream') {
    responseMimeType = 'video/mp4';
  }
  res.setHeader('Content-Type', responseMimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('ETag', etag);

  const range = resolveContentRange(contentRange, rangeHeader, size);

  if (range) {
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${range.total}`);
    res.setHeader('Content-Length', String(range.end - range.start + 1));
    res.status(206);
  } else if (rangeHeader && size !== undefined) {
    if (typeof (stream as any).destroy === 'function') {
      (stream as any).destroy();
    }
    // RFC 7233 protocol answer for an unsatisfiable range: status only, no
    // error envelope, because nothing has been streamed yet.
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

  // The body is already in flight here, so the error envelope cannot be written
  // without corrupting the download; abort the response instead.
  stream.on('error', (err: unknown) => {
    logger.error('Admin video stream failed', {
      route: 'GET /admin/api/submissions/:id/media/:fileKey',
      submissionId: id,
      error: String(err),
    });
    res.destroy();
  });

  stream.pipe(res);
}

export async function updateRating(req: Request, res: Response): Promise<void> {
  const updated = await adminService.updateRating(req.params.id, req.body.rating);
  res.json({ success: true, submission: updated });
}

export async function updateReview(req: Request, res: Response): Promise<void> {
  const { reviewText, pros, cons } = req.body;
  const updated = await adminService.updateReview(
    req.params.id,
    reviewText,
    pros,
    cons,
    req.adminUser?.username
  );
  res.json({ success: true, submission: updated });
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const updated = await adminService.updateStatus(req.params.id, req.body.status);
  res.json({ success: true, submission: updated });
}

export async function requestNewVideo(req: Request, res: Response): Promise<void> {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : null;
  const result = await adminService.requestNewVideo(req.params.id, reason);
  res.json(result);
}

export async function deleteSubmissionVideo(req: Request, res: Response): Promise<void> {
  const updated = await adminService.deleteSubmissionVideo(req.params.id);
  res.json({
    success: true,
    message: 'Introduction video deleted. The student has been notified to upload a replacement.',
    submission: updated,
  });
}

export async function exportSubmissions(req: Request, res: Response): Promise<void> {
  const eventId = ((req.query.eventId as string) || adminService.ACTIVE_EVENT_ID).trim();
  const { workbook, filename } = await adminService.exportSubmissionsWorkbook(eventId);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  try {
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    // The workbook writes straight to the response; once it has flushed headers
    // the only safe failure signal is an aborted connection, not a JSON body.
    if (res.headersSent) {
      logger.error('Submissions export failed after streaming started', {
        route: 'GET /admin/api/submissions/export',
        eventId,
        error: String(err),
      });
      res.destroy();
      return;
    }
    throw err;
  }
}

export async function deleteSubmission(req: Request, res: Response): Promise<void> {
  const result = await adminService.deleteSubmission(req.params.id);
  res.json(result);
}
