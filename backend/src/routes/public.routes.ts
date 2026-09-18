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

// GET /api/students/:rollNo
// Public lookup used by the submission form to auto-fill student details from the roster.
router.get('/students/:rollNo', async (req: Request, res: Response): Promise<void> => {
  try {
    const rollNo = (req.params.rollNo || '').trim().toUpperCase();

    if (!rollNo) {
      res.status(400).json({ error: 'VALIDATION_ERROR', field: 'rollNo', message: 'Roll number is required.' });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { eventId_rollNo: { eventId: EVENT_ID, rollNo } },
    });

    if (!student) {
      res.status(404).json({ error: 'STUDENT_NOT_FOUND', message: 'No student found with this roll number.' });
      return;
    }

    const submission = await prisma.submission.findUnique({
      where: {
        eventId_rollNo_year_branch_section: {
          eventId: EVENT_ID,
          rollNo: student.rollNo,
          year: student.year,
          branch: student.branch,
          section: student.section,
        },
      },
      select: {
        id: true,
        name: true,
        rollNo: true,
        videoDriveId: true,
        rating: true,
        submittedAt: true,
      },
    });

    res.json({
      student: {
        name: student.name,
        rollNo: student.rollNo,
        branch: student.branch,
        section: student.section,
        year: student.year,
        email: student.email,
      },
      submission: submission
        ? {
            id: submission.id,
            hasVideo: Boolean(submission.videoDriveId),
            rating: submission.rating,
            submittedAt: submission.submittedAt,
          }
        : null,
    });
  } catch (err: any) {
    console.error('Error looking up student:', err);
    res.status(500).json({ error: 'LOOKUP_FAILED', message: 'Could not look up student details.' });
  }
});

// POST /api/submissions
// Accepts only `rollNo` + `video`. All student details are auto-filled server-side
// from the roster. A student may upload one video; if the admin deleted their video,
// they can upload a replacement to the same submission record.
router.post(
  '/submissions',
  submissionRateLimiter,
  submissionUploadMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    let currentRollNo = '';
    let currentStudentName = '';

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // 1. Normalize roll number
      const rollNo = (req.body.rollNo || '').trim().toUpperCase();
      currentRollNo = rollNo;

      if (!rollNo) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'rollNo', message: 'Roll number is required.' });
        return;
      }

      // 2. Ensure target event exists in database
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

      // 3. Auto-fill student details from the roster
      const student = await prisma.student.findUnique({
        where: { eventId_rollNo: { eventId: EVENT_ID, rollNo } },
      });

      if (!student) {
        res.status(404).json({
          error: 'STUDENT_NOT_FOUND',
          field: 'rollNo',
          message: 'No student found with this roll number. Please verify your roll number and try again.',
        });
        return;
      }

      const name = student.name;
      const branch = student.branch;
      const section = student.section;
      const year = student.year;
      const email = student.email;
      currentStudentName = name;

      // 4. Validate branch/section/year against allowed options
      if (!BRANCHES.includes(branch as any)) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'branch', message: `Invalid branch: ${branch}` });
        return;
      }
      if (!SECTIONS.includes(section as any)) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'section', message: `Invalid section: ${section}` });
        return;
      }
      if (!YEARS.includes(year as any)) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'year', message: `Invalid year: ${year}` });
        return;
      }

      // 5. Require exactly one video file
      const videoFile = files?.video?.[0];
      if (!videoFile) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'video', message: 'Self introduction video is required.' });
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

      // 7. Duplicate check (one video per student)
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

      // 8. Upload video to Google Drive
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

      // 9. Create the record, or update the existing one if the admin removed its video
      let submission;
      if (existing) {
        submission = await prisma.submission.update({
          where: { id: existing.id },
          data: {
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

export default router;