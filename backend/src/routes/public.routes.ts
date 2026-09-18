import { Router, Request, Response } from 'express';
import { BRANCHES, SECTIONS, YEARS } from '../config/constants';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { submissionUploadMiddleware } from '../middleware/upload';
import { submissionRateLimiter } from '../middleware/rateLimiter';
import { ValidationService } from '../services/validation.service';
import { driveService } from '../services/drive.service';
import { ActivityService } from '../services/activity.service';

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
router.post(
  '/submissions',
  submissionRateLimiter,
  submissionUploadMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    let currentApplicantName = (req.body.name || '').trim();
    let currentEmail = (req.body.email || '').trim();

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // 1. Normalize textual inputs
      const name = (req.body.name || '').trim();
      const rollNo = (req.body.rollNo || '').trim().toUpperCase();
      const section = (req.body.section || '').trim().toUpperCase();
      const branch = (req.body.branch || '').trim().toUpperCase();
      const year = parseInt(req.body.year || '0', 10);
      const email = (req.body.email || '').trim().toLowerCase();

      // 2. Validate required text fields
      if (!name) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'name', message: 'Full name is required.' });
        return;
      }
      if (!rollNo) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'rollNo', message: 'Roll number is required.' });
        return;
      }
      if (!branch || !BRANCHES.includes(branch as any)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          field: 'branch',
          message: `Invalid branch. Available options: ${BRANCHES.join(', ')}`,
        });
        return;
      }
      if (!section || !SECTIONS.includes(section as any)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          field: 'section',
          message: `Invalid section. Available options: ${SECTIONS.join(', ')}`,
        });
        return;
      }
      if (!year || !YEARS.includes(year as any)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          field: 'year',
          message: `Invalid year. Available options: ${YEARS.join(', ')}`,
        });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'email', message: 'A valid email address is required.' });
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

      const videoFile = files?.video?.[0];
      const audioFile = files?.audio?.[0];
      const photoFiles = [
        ...(files?.photo1 || []),
        ...(files?.photo2 || []),
        ...(files?.photo3 || []),
      ];

      // 4. Video-only constraint
      if (!videoFile) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'video', message: 'Self introduction video is required.' });
        return;
      }
      const mediaType = 'VIDEO';
      if (audioFile || photoFiles.length > 0) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'media', message: 'Self introduction auditions accept video files only.' });
        return;
      }

      // 5. Duplicate Check (CRITICAL: before touching Drive - scoped to eventId)
      const existingByRoll = await prisma.submission.findFirst({
        where: {
          eventId: EVENT_ID,
          rollNo,
          year,
          branch,
          section,
        },
      });

      if (existingByRoll) {
        await ActivityService.log({
          eventId: EVENT_ID,
          category: 'APPLICATION',
          action: 'Submission rejected (Duplicate Roll Number)',
          details: `Roll Number: ${rollNo}`,
          applicantName: name,
          userEmail: email,
          status: 'WARNING',
        });
        res.status(409).json({
          error: 'DUPLICATE_ROLL_NO',
          field: 'rollNo',
          message: `It looks like you've already submitted an entry for ${EVENT_NAME} with this roll number.`,
        });
        return;
      }

      const existingByEmail = await prisma.submission.findFirst({
        where: { eventId: EVENT_ID, email },
      });

      if (existingByEmail) {
        await ActivityService.log({
          eventId: EVENT_ID,
          category: 'APPLICATION',
          action: 'Submission rejected (Duplicate Email)',
          details: `Email: ${email}`,
          applicantName: name,
          userEmail: email,
          status: 'WARNING',
        });
        res.status(409).json({
          error: 'DUPLICATE_EMAIL',
          field: 'email',
          message: `It looks like you've already submitted an entry for ${EVENT_NAME} with this email address.`,
        });
        return;
      }

      // 6. Validate video integrity & format
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

      // 8. Insert record into Postgres
      const submission = await prisma.submission.create({
        data: {
          eventId: EVENT_ID,
          name,
          rollNo,
          section,
          branch,
          year,
          email,
          videoDriveId: uploadResult.videoDriveId || null,
          mediaType,
          driveFolderPath: uploadResult.driveFolderPath,
          status: 'SUBMITTED',
        },
      });

      await ActivityService.log({
        eventId: EVENT_ID,
        category: 'APPLICATION',
        action: 'Application submitted',
        details: `Media Type: ${mediaType}, Branch: ${branch}, Roll: ${rollNo}`,
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
        applicantName: currentApplicantName,
        userEmail: currentEmail,
        status: 'ERROR',
        errorMessage: err?.stack || err?.message,
      });

      // In case of duplicate key race condition from DB constraint:
      if (err.code === 'P2002') {
        res.status(409).json({
          error: 'DUPLICATE_SUBMISSION',
          message: 'An entry with this roll number or email already exists.',
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

export default router;