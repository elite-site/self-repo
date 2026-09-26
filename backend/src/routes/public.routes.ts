import { Router, Request, Response } from 'express';
import { BRANCHES, SECTIONS, YEARS } from '../config/constants';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { submissionUploadMiddleware } from '../middleware/upload';
import { submissionRateLimiter } from '../middleware/rateLimiter';
import { ValidationService } from '../services/validation.service';
import { driveService } from '../services/drive.service';
import { ActivityService } from '../services/activity.service';
import { resolveContentRange } from '../utils/rangeParser';

const router = Router();

const EVENT_ID = 'self-introduction-2026';
const EVENT_NAME = 'Self Introduction';

// GET /api/branches
router.get('/branches', (_req: Request, res: Response) => {
  res.json({ branches: BRANCHES });
});

// GET /api/sections
router.get('/sections', (_req: Request, res: Response) => {
  res.json({ sections: SECTIONS });
});

// GET /api/years
router.get('/years', (_req: Request, res: Response) => {
  res.json({ years: YEARS });
});

// POST /api/submissions
// Accepts manually entered student details (`name`, `rollNo`, `year`, `section`,
// `email`, `phoneNo`) + `video`. Branch is recorded as IT. A student may upload
// one video; if the admin deleted their video, they can upload a replacement to
// the same submission record.
router.post(
  '/submissions',
  submissionRateLimiter,
  submissionUploadMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    let currentRollNo = '';
    let currentStudentName = '';

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // 1. Read & normalize manual form fields
      const rollNo = (req.body.rollNo || '').trim().toUpperCase();
      const name = (req.body.name || '').trim();
      const email = (req.body.email || '').trim().toLowerCase();
      const phoneNo = (req.body.phoneNo || '').trim();
      const section = String(req.body.section || '').trim().toUpperCase();
      const year = parseInt(String(req.body.year || ''), 10);
      const branch = 'IT';
      currentRollNo = rollNo;
      currentStudentName = name;

      // 2. Validate student details
      if (!rollNo) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'rollNo', message: 'Roll number is required.' });
        return;
      }
      if (!name || name.length < 2 || name.length > 100) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'name', message: 'Please enter your full name.' });
        return;
      }
      if (!YEARS.includes(year as any)) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'year', message: `Invalid year. Available options: ${YEARS.join(', ')}.` });
        return;
      }
      if (!SECTIONS.includes(section as any)) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'section', message: `Invalid section. Available options: ${SECTIONS.join(', ')}.` });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'email', message: 'Please enter a valid email address.' });
        return;
      }
      if (!/^\+?\d{10,15}$/.test(phoneNo)) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'phoneNo', message: 'Please enter a valid phone number (10–15 digits).' });
        return;
      }

      // 3. Ensure target event exists in database
      const dbEvent = await prisma.event.findUnique({ where: { id: EVENT_ID } });
      if (!dbEvent) {
        await prisma.event.create({
          data: {
            id: EVENT_ID,
            name: EVENT_NAME,
            slug: 'self-introduction',
            year: env.EVENT_YEAR,
            status: 'OPEN',
          },
        });
      }

      // 4. Require exactly one video file
      const videoFile = files?.video?.[0];
      if (!videoFile) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'video', message: 'Self introduction video is required.' });
        return;
      }

      // 5. Validate video integrity & format
      const vVideo = await ValidationService.validateVideo(videoFile.buffer, videoFile.originalname, videoFile.size);
      if (!vVideo.valid) {
        await ActivityService.log({
          eventId: EVENT_ID,
          category: 'FILE_UPLOAD',
          action: 'File validation failed (Video)',
          details: vVideo.error,
          applicantName: name,
          userEmail: email,
          status: 'ERROR',
          errorMessage: vVideo.error,
        });
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'video', message: vVideo.error });
        return;
      }

      // 6. Duplicate check (one video per roll number)
      const existing = await prisma.submission.findUnique({
        where: {
          eventId_rollNo_year_branch_section: {
            eventId: EVENT_ID,
            rollNo,
            year,
            branch,
            section,
          },
        },
      });

      if (existing && existing.videoDriveId) {
        await ActivityService.log({
          eventId: EVENT_ID,
          category: 'APPLICATION',
          action: 'Submission rejected (Video already uploaded)',
          details: `Roll Number: ${rollNo}`,
          applicantName: name,
          userEmail: email,
          status: 'WARNING',
        });
        res.status(409).json({
          error: 'DUPLICATE_VIDEO',
          field: 'video',
          message: `A self introduction video has already been submitted for roll number ${rollNo}. You can upload again only if the admin removes the current video.`,
        });
        return;
      }

      // 7. Upload video to Google Drive
      const uploadResult = await driveService.uploadSubmissionFiles(
        {
          eventName: EVENT_NAME,
          eventYear: env.EVENT_YEAR,
          year,
          section,
          branch,
          rollNo,
          name,
        },
        {
          video: {
            buffer: videoFile.buffer,
            originalname: videoFile.originalname,
            mimetype: videoFile.mimetype,
            size: videoFile.size,
          },
        }
      );

      // 8. Create the record, or update the existing one if the admin removed its video
      let submission;
      if (existing) {
        submission = await prisma.submission.update({
          where: { id: existing.id },
          data: {
            name,
            email,
            phoneNo,
            videoDriveId: uploadResult.videoDriveId || null,
            driveFolderPath: uploadResult.driveFolderPath,
            status: 'SUBMITTED',
            submittedAt: new Date(),
          },
        });
      } else {
        submission = await prisma.submission.create({
          data: {
            eventId: EVENT_ID,
            name,
            rollNo,
            section,
            branch,
            year,
            email,
            phoneNo,
            videoDriveId: uploadResult.videoDriveId || null,
            mediaType: 'VIDEO',
            driveFolderPath: uploadResult.driveFolderPath,
            status: 'SUBMITTED',
          },
        });
      }

      await ActivityService.log({
        eventId: EVENT_ID,
        category: 'APPLICATION',
        action: existing ? 'Submission video re-uploaded' : 'Application submitted',
        details: `Media Type: VIDEO, Branch: ${branch}, Roll: ${rollNo}`,
        applicantName: name,
        userEmail: email,
        status: 'SUCCESS',
      });

      res.status(201).json({
        id: submission.id,
        name: submission.name,
        message: 'Submission received successfully!',
      });
    } catch (err: any) {
      console.error('Error handling submission:', err);

      await ActivityService.log({
        eventId: EVENT_ID,
        category: 'APPLICATION',
        action: 'Application submission failed',
        details: err?.message || 'Unexpected server error',
        applicantName: currentStudentName,
        userEmail: currentRollNo,
        status: 'ERROR',
        errorMessage: err?.stack || err?.message,
      });

      if (err.code === 'P2002') {
        res.status(409).json({
          error: 'DUPLICATE_SUBMISSION',
          message: 'An entry with this roll number already exists.',
        });
        return;
      }
      res.status(500).json({
        error: 'SUBMISSION_FAILED',
        message: 'An error occurred while uploading your submission. Please try again.',
      });
    }
  }
);

// GET /api/public/events - Public list of open events
router.get('/public/events', async (_req: Request, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(events.map(e => ({
      ...e,
      title: e.name,
      date: e.createdAt,
      type: 'GENERAL',
      eligibility: `Year ${e.year || 'All'}`,
      deadline: e.createdAt
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/public/events/:id - Public event detail
router.get('/public/events/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { formFields: { orderBy: { displayOrder: 'asc' } } }
    });
    if (!event) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
      return;
    }
    res.json({
      ...event,
      title: event.name,
      date: event.createdAt,
      type: 'GENERAL',
      eligibility: `Year ${event.year || 'All'}`,
      deadline: event.createdAt,
      registrationFields: event.formFields
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/public/media/:type/:fileId - Public streaming proxy for photos, resumes, certificates, and videos
router.get('/public/media/:type/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, fileId } = req.params;
    if (!fileId) {
      res.status(400).json({ error: 'MISSING_FILE_ID', message: 'File ID is required' });
      return;
    }

    const etag = `"${fileId}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    const rangeHeader = req.headers.range;

    // Honour Range requests so <video> can seek instead of buffering the whole
    // file. The byte range is fetched from storage, so the body always matches
    // the advertised Content-Range.
    const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
      fileId,
      undefined,
      rangeHeader,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('ETag', etag);

    // Allow PDF documents and media to be rendered inside portal iframes
    res.removeHeader('X-Frame-Options');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; frame-ancestors 'self' https://*.netlify.app https://*.onrender.com https://*.vercel.app http://localhost:* http://127.0.0.1:*;"
    );

    if (req.query.download === '1' || req.query.download === 'true') {
      const ext = mimeType.split('/')[1] || 'bin';
      res.setHeader('Content-Disposition', `attachment; filename="${type || 'media'}_${fileId}.${ext}"`);
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

    // Drop the storage stream if the client aborts (page switch/refresh/seek).
    res.on('close', () => {
      if (!res.writableFinished && typeof (stream as any).destroy === 'function') {
        (stream as any).destroy();
      }
    });

    stream.on('error', (err: any) => {
      console.error('Public media stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'STREAM_ERROR', message: 'Media stream interrupted' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: 'Requested media could not be found or loaded.' });
    }
  }
});

export default router;