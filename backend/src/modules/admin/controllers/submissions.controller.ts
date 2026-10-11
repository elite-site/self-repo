import { Request, Response } from 'express';
import { driveService } from '../../../services/drive.service';
import { resolveContentRange } from '../../../utils/rangeParser';
import { AppError } from '../../../utils/appError';
import * as adminService from '../admin.service';

export async function listSubmissions(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.listSubmissions(req.query as any);
    res.json(result);
  } catch (err: any) {
    console.error('Error fetching submissions list:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_SUBMISSIONS', message: err.message || 'Server error' });
  }
}

export async function getSubmissionDetail(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getSubmissionDetail(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Submission not found' });
      return;
    }
    res.json(result);
  } catch (err: any) {
    console.error('Error fetching submission detail:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_SUBMISSION', message: err.message || 'Server error' });
  }
}

export async function streamMedia(req: Request, res: Response): Promise<void> {
  try {
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
      console.error('Admin video stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'STREAM_ERROR', message: 'Video stream interrupted' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error proxying media:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'MEDIA_STREAM_ERROR', message: err.message || 'Stream error' });
    }
  }
}

export async function updateRating(req: Request, res: Response): Promise<void> {
  try {
    const updated = await adminService.updateRating(req.params.id, req.body.rating);
    res.json({ success: true, submission: updated });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error updating rating:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_RATING', message: err.message || 'Server error' });
  }
}

export async function updateReview(req: Request, res: Response): Promise<void> {
  try {
    const { reviewText, pros, cons } = req.body;
    const updated = await adminService.updateReview(
      req.params.id,
      reviewText,
      pros,
      cons,
      req.adminUser?.username
    );
    res.json({ success: true, submission: updated });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error updating review:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_REVIEW', message: err.message || 'Server error' });
  }
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const updated = await adminService.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, submission: updated });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'FAILED_TO_UPDATE_STATUS', message: err.message || 'Server error' });
  }
}

export async function requestNewVideo(req: Request, res: Response): Promise<void> {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : null;
    const result = await adminService.requestNewVideo(req.params.id, reason);
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error requesting new video:', err);
    res.status(500).json({ error: 'REQUEST_VIDEO_FAILED', message: err.message || 'Server error' });
  }
}

export async function deleteSubmissionVideo(req: Request, res: Response): Promise<void> {
  try {
    const updated = await adminService.deleteSubmissionVideo(req.params.id);
    res.json({
      success: true,
      message: 'Introduction video deleted. The student has been notified to upload a replacement.',
      submission: updated,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error deleting video:', err);
    res.status(500).json({ error: 'VIDEO_DELETE_FAILED', message: err.message || 'Server error' });
  }
}

export async function exportSubmissions(req: Request, res: Response): Promise<void> {
  try {
    const eventId = ((req.query.eventId as string) || adminService.ACTIVE_EVENT_ID).trim();
    const { workbook, filename } = await adminService.exportSubmissionsWorkbook(eventId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting Excel report:', err);
    res.status(500).json({ error: 'EXCEL_EXPORT_FAILED', message: err.message || 'Server error' });
  }
}

export async function deleteSubmission(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.deleteSubmission(req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Error deleting submission:', err);
    res.status(500).json({ error: 'DELETE_FAILED', message: err.message || 'Server error' });
  }
}
