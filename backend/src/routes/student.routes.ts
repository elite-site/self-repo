import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { requireStudentAuth } from '../middleware/studentAuth';
import { submissionUploadMiddleware } from '../middleware/upload';
import { ValidationService } from '../services/validation.service';
import { driveService } from '../services/drive.service';
import { ActivityService } from '../services/activity.service';
import { ssoService } from '../services/sso.service';

const router = Router();

const EVENT_ID = 'self-introduction-2026';
const EVENT_NAME = 'Self Introduction';

// Serialize the student's profile + their submission for the frontend
function serializeStudentView(student: {
  id: string;
  rollNo: string;
  email: string | null;
  name: string;
  year: number;
  section: string;
  branch: string;
}, submission: any | null) {
  return {
    id: student.id,
    rollNo: student.rollNo,
    email: student.email ?? null,
    name: student.name,
    year: student.year,
    section: student.section,
    branch: student.branch,
    submission: submission
      ? {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          videoUploaded: Boolean(submission.videoDriveId),
          reviewText: submission.reviewText || null,
          reviewPros: submission.reviewPros || [],
          reviewCons: submission.reviewCons || [],
          reviewedAt: submission.reviewedAt || null,
        }
      : null,
  };
}

function signedState(): string {
  return jwt.sign({ nonce: crypto.randomUUID() }, env.STUDENT_JWT_SECRET, { expiresIn: '10m' });
}

// GET /api/student/google/authorize — kick off Google Workspace SSO.
router.get('/google/authorize', (_req: Request, res: Response): void => {
  const url = ssoService.getAuthUrl();
  const sep = url.includes('?') ? '&' : '?';
  res.redirect(302, `${url}${sep}state=${encodeURIComponent(signedState())}`);
});

// GET /api/student/google/callback — verify id_token, look up roster email, mint our JWT.
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query;

  try {
    jwt.verify(String(state ?? ''), env.STUDENT_JWT_SECRET);
  } catch {
    res.status(400).json({ error: 'INVALID_STATE', message: 'State mismatch or expired. Try signing in again.' });
    return;
  }

  if (!code) {
    res.status(400).json({ error: 'MISSING_CODE', message: 'No authorization code returned.' });
    return;
  }

  try {
    const identity = await ssoService.exchangeCode(String(code));

    if (!ssoService.isAllowed(identity)) {
      res.status(403).json({ error: 'DOMAIN_FORBIDDEN', message: `Only ${env.GOOGLE_SSO_HD} college emails are allowed.` });
      return;
    }

    const student = await prisma.student.findUnique({ where: { email: identity.email } });

    if (!student) {
      res.status(403).json({
        error: 'EMAIL_NOT_REGISTERED',
        message: 'This college email is not registered in the roster. Contact your coordinators.',
      });
      return;
    }

    const token = jwt.sign(
      { studentId: student.id, rollNo: student.rollNo, name: student.name, email: student.email },
      env.STUDENT_JWT_SECRET,
      { expiresIn: '12h' }
    );

    await ActivityService.log({
      eventId: EVENT_ID,
      category: 'APPLICATION',
      action: 'Student logged in via Google',
      details: `Email: ${identity.email}`,
      applicantName: student.name,
      userEmail: identity.email,
      status: 'SUCCESS',
    });

    const target = new URL(env.STUDENT_APP_LOGIN_URL);
    target.searchParams.set('token', token);
    res.redirect(302, target.toString());
  } catch (err: any) {
    console.error('SSO callback error:', err);
    res.status(500).json({ error: 'SSO_FAILED', message: 'Could not complete Google sign-in.' });
  }
});

// GET /api/student/me — current student profile + submission status + admin review
router.get('/me', requireStudentAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.student!.studentId },
    });

    if (!student) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
      return;
    }

    const submission = await prisma.submission.findFirst({
      where: { rollNo: student.rollNo },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ student: serializeStudentView(student, submission) });
  } catch (err: any) {
    console.error('Error fetching student profile:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_PROFILE', message: err.message });
  }
});

// POST /api/student/submission — upload (or replace) the introduction video.
// Resubmitting always swaps the previous video and clears the old admin review.
router.post(
  '/submission',
  requireStudentAuth,
  submissionUploadMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: req.student!.studentId },
      });

      if (!student) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
        return;
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const videoFile = files?.video?.[0];

      if (!videoFile) {
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'video', message: 'Self introduction video is required.' });
        return;
      }

      // Validate video format & size (<= 25 MB enforced by env + multer)
      const vVideo = await ValidationService.validateVideo(videoFile.buffer, videoFile.originalname, videoFile.size);
      if (!vVideo.valid) {
        await ActivityService.log({
          eventId: EVENT_ID,
          category: 'FILE_UPLOAD',
          action: 'File validation failed (Video)',
          details: vVideo.error,
          applicantName: student.name,
          userEmail: student.rollNo,
          status: 'ERROR',
          errorMessage: vVideo.error,
        });
        res.status(400).json({ error: 'VALIDATION_ERROR', field: 'video', message: vVideo.error });
        return;
      }

      // Existing submission (if any) — delete its video from Drive first
      const existing = await prisma.submission.findFirst({
        where: { rollNo: student.rollNo },
        orderBy: { submittedAt: 'desc' },
      });

      if (existing?.videoDriveId) {
        await driveService.deleteVideo(existing);
      }

      // Upload the new video to Google Drive (or mock storage)
      const uploadResult = await driveService.uploadSubmissionFiles(
        {
          eventName: EVENT_NAME,
          eventYear: env.EVENT_YEAR,
          year: student.year,
          section: student.section,
          branch: student.branch,
          rollNo: student.rollNo,
          name: student.name,
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

      const data = {
        name: student.name,
        rollNo: student.rollNo,
        email: student.email ?? '',
        section: student.section,
        branch: student.branch,
        year: student.year,
        videoDriveId: uploadResult.videoDriveId || null,
        mediaType: 'VIDEO' as const,
        driveFolderPath: uploadResult.driveFolderPath,
        status: 'SUBMITTED' as const,
        submittedAt: new Date(),
        // New upload = clean slate for the next review
        reviewText: null,
        reviewPros: [],
        reviewCons: [],
        reviewedAt: null,
        reviewedBy: null,
      };

      const submission = existing
        ? await prisma.submission.update({ where: { id: existing.id }, data })
        : await prisma.submission.create({ data: { eventId: EVENT_ID, ...data } });

      await ActivityService.log({
        eventId: EVENT_ID,
        category: 'APPLICATION',
        action: existing ? 'Student re-uploaded introduction video' : 'Application submitted',
        details: `Media Type: VIDEO, Branch: ${student.branch}, Roll: ${student.rollNo}`,
        applicantName: student.name,
        userEmail: student.rollNo,
        status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        id: submission.id,
        message: 'Your introduction video has been submitted successfully.',
      });
    } catch (err: any) {
      console.error('Error handling student submission:', err);

      await ActivityService.log({
        eventId: EVENT_ID,
        category: 'APPLICATION',
        action: 'Student submission failed',
        details: err?.message || 'Unexpected server error',
        applicantName: req.student?.name,
        userEmail: req.student?.rollNo,
        status: 'ERROR',
        errorMessage: err?.stack || err?.message,
      });

      res.status(500).json({
        error: 'SUBMISSION_FAILED',
        message: 'An error occurred while uploading your submission. Please try again.',
      });
    }
  }
);

// GET /api/student/submission/media/video — stream the student's own video (preview)
router.get('/submission/media/video', requireStudentAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.student!.studentId },
    });

    if (!student) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
      return;
    }

    const submission = await prisma.submission.findFirst({
      where: { rollNo: student.rollNo },
      orderBy: { submittedAt: 'desc' },
    });

    if (!submission?.videoDriveId) {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: 'No video has been uploaded yet.' });
      return;
    }

    const driveFileId = submission.videoDriveId;
    const { stream, mimeType, size } = await driveService.streamDriveFile(driveFileId, submission.driveFolderPath);

    res.setHeader('Content-Type', mimeType);
    if (size) res.setHeader('Content-Length', size.toString());
    res.setHeader('Cache-Control', 'private, max-age=86400');
    stream.pipe(res);
  } catch (err: any) {
    console.error('Error proxying student video:', err);
    res.status(500).json({ error: 'MEDIA_STREAM_ERROR', message: 'Could not stream your video.' });
  }
});


// --- Phase 3: Resume Routes ---
router.get('/resume', requireStudentAuth, async (req, res) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { studentId: (req as any).studentId },
      orderBy: { submittedAt: 'desc' }
    });
    res.json(resumes);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/resume', requireStudentAuth, async (req, res) => {
  try {
    const resume = await prisma.resume.create({
      data: {
        studentId: (req as any).studentId,
        driveFileId: 'mock_resume_id',
        filename: 'resume.pdf',
        status: 'PENDING'
      }
    });
    res.status(201).json(resume);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
