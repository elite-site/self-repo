import type { StudentStatus } from '@prisma/client';
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import path from 'path';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { requireStudentAuth, STUDENT_SESSION_COOKIE_NAME } from '../middleware/studentAuth';
import { studentLoginRateLimiter } from '../middleware/rateLimiter';
import { submissionUploadMiddleware, resumeUpload } from '../middleware/upload';
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
  status: StudentStatus;
  graduatedAt: Date | null;
}, submission: any | null) {
  return {
    id: student.id,
    rollNo: student.rollNo,
    email: student.email ?? null,
    name: student.name,
    year: student.year,
    section: student.section,
    branch: student.branch,
    status: student.status,
    graduatedAt: student.graduatedAt,
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
router.get('/google/authorize', studentLoginRateLimiter, (_req: Request, res: Response): void => {
  const url = ssoService.getAuthUrl();
  const sep = url.includes('?') ? '&' : '?';
  res.redirect(302, `${url}${sep}state=${encodeURIComponent(signedState())}`);
});

// GET /api/student/google/callback — verify id_token, look up roster email, mint our JWT.
router.get('/google/callback', studentLoginRateLimiter, async (req: Request, res: Response): Promise<void> => {
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

    res.cookie(STUDENT_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });
    res.redirect(302, env.STUDENT_APP_LOGIN_URL);
  } catch (err: any) {
    console.error('SSO callback error:', err);
    res.status(500).json({ error: 'SSO_FAILED', message: 'Could not complete Google sign-in.' });
  }
});

// POST /api/student/logout — clear the session cookie.
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie(STUDENT_SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
  });
  res.json({ success: true });
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
      select: {
        id: true,
        status: true,
        submittedAt: true,
        videoDriveId: true,
        reviewText: true,
        reviewPros: true,
        reviewCons: true,
        reviewedAt: true,
      },
    });

    // Allow a 30-second private cache for the /me response so repeated
    // dashboard polls don't hammer the DB when 200 students are online.
    res.setHeader('Cache-Control', 'private, max-age=30');
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

      // Also keep prisma.introVideo in sync so Admin Moderation queue and student queries immediately reflect the video
      try {
        const existingIntroVideo = await prisma.introVideo.findFirst({
          where: { studentId: student.id },
          orderBy: { submittedAt: 'desc' },
        });

        if (existingIntroVideo) {
          await prisma.introVideo.update({
            where: { id: existingIntroVideo.id },
            data: {
              driveFileId: uploadResult.videoDriveId || null,
              filename: videoFile.originalname,
              mimeType: videoFile.mimetype,
              sizeMb: parseFloat((videoFile.size / (1024 * 1024)).toFixed(2)),
              status: 'PENDING',
              reviewNote: null,
              reviewedBy: null,
              reviewedAt: null,
              submittedAt: new Date(),
              isActive: true,
            },
          });
        } else {
          await prisma.introVideo.create({
            data: {
              studentId: student.id,
              driveFileId: uploadResult.videoDriveId || null,
              filename: videoFile.originalname,
              mimeType: videoFile.mimetype,
              sizeMb: parseFloat((videoFile.size / (1024 * 1024)).toFixed(2)),
              status: 'PENDING',
              submittedAt: new Date(),
              isActive: true,
            },
          });
        }
      } catch (introVideoErr) {
        console.warn('Could not sync introVideo table:', introVideoErr);
      }

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
// Supports HTTP Range requests so the browser can seek without re-downloading.
router.get('/submission/media/video', requireStudentAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.student!.studentId;

    // Minimal projection — only fetch the fields we actually need
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true },
    });

    if (!student) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
      return;
    }

    const submission = await prisma.submission.findFirst({
      where: { rollNo: student.rollNo },
      orderBy: { submittedAt: 'desc' },
      select: { videoDriveId: true, driveFolderPath: true },
    });

    if (!submission?.videoDriveId) {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: 'No video has been uploaded yet.' });
      return;
    }

    const driveFileId = submission.videoDriveId;
    const etag = `"${driveFileId}"`;

    // 304 short-circuit — avoids streaming the full file when browser already has it
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    const { stream, mimeType, size } = await driveService.streamDriveFile(
      driveFileId,
      submission.driveFolderPath,
    );

    // Respond with proper headers
    const statusCode = req.headers.range && size ? 206 : 200;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    // 10-minute private browser cache; ETag handles stale detection on re-upload
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.setHeader('ETag', etag);

    if (size !== undefined) {
      const rangeHeader = req.headers.range;
      if (rangeHeader) {
        const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10) || 0;
        const end = endStr ? Math.min(parseInt(endStr, 10), size - 1) : size - 1;
        const chunkSize = end - start + 1;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
        res.setHeader('Content-Length', chunkSize);
        res.status(206);
      } else {
        res.setHeader('Content-Length', size);
        res.status(200);
      }
    } else {
      res.status(statusCode);
    }

    stream.pipe(res);
  } catch (err: any) {
    console.error('Error proxying student video:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'MEDIA_STREAM_ERROR', message: 'Could not stream your video.' });
    }
  }
});


// ──────────────────────────────────────────────────────────────────────────────
// Phase 2B: Streaming video upload — browser → Render → Drive (zero RAM buffer)
//
// The browser sends the raw video bytes as the request body instead of
// multipart/form-data. Express reads `req` as a Node.js Readable stream.
// We create a Drive resumable-upload session, then pipe req straight to Drive
// via a native https.request — data passes through Render only at the OS
// socket-buffer level (~64 KB at a time), never fully in memory.
//
//   Browser  ──[raw bytes]──→  Render/Express req  ──[pipe]──→  Drive session PUT
//                                     ↑
//               no multer, no memoryStorage, no Buffer.concat()
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  '/submission/video-stream',
  requireStudentAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // ── 1. Auth & student lookup ─────────────────────────────────────────
      const student = await prisma.student.findUnique({
        where: { id: req.student!.studentId },
        select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true },
      });

      if (!student) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
        return;
      }

      // ── 2. Validate Content-Length & Content-Type from headers ───────────
      const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
      if (!contentLength) {
        req.resume(); // drain and discard
        res.status(411).json({ error: 'LENGTH_REQUIRED', message: 'Content-Length header is required.' });
        return;
      }

      const maxBytes = env.MAX_VIDEO_SIZE_MB * 1024 * 1024;
      if (contentLength > maxBytes) {
        req.resume();
        res.status(413).json({
          error: 'FILE_TOO_LARGE',
          message: `Video must be under ${env.MAX_VIDEO_SIZE_MB} MB.`,
        });
        return;
      }

      const rawMime = (req.headers['content-type'] ?? '').split(';')[0].trim();
      if (!rawMime.startsWith('video/')) {
        req.resume();
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Only video files are allowed.' });
        return;
      }

      const origFilename = req.headers['x-filename']
        ? decodeURIComponent(req.headers['x-filename'] as string)
        : `video_${student.rollNo}.mp4`;

      // ── 3. Get/create the student's Drive folder ─────────────────────────
      const { folderId, relativePath } = await driveService.resolveStudentFolder({
        eventName: EVENT_NAME,
        eventYear: env.EVENT_YEAR,
        year: student.year,
        section: student.section,
        branch: student.branch,
        rollNo: student.rollNo,
        name: student.name,
      });

      const ext = path.extname(origFilename) || '.mp4';
      const clean = (s: string) => s.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const videoFileName = `${clean(student.rollNo)}_${clean(student.name)}${ext}`;

      // ── 4. Fetch existing submission (for cleanup & upsert) ──────────────
      const existing = await prisma.submission.findFirst({
        where: { rollNo: student.rollNo },
        orderBy: { submittedAt: 'desc' },
      });

      // ── 5. Create Drive resumable session (returns null in mock mode) ─────
      const sessionUrl = await driveService.createResumableUploadSession(
        videoFileName, rawMime, contentLength, folderId,
      );

      // Delete old video from Drive asynchronously so we don't block the upload
      if (existing?.videoDriveId) {
        driveService.deleteVideo(existing).catch(() => {});
      }

      // ── 6. Pipe req stream → Drive (THE KEY STEP — no buffering) ─────────
      const driveFileId = await driveService.streamUploadToDrive(
        sessionUrl,
        rawMime,
        contentLength,
        req,   // Express Request is a Node.js Readable
        { relativePath, fileName: videoFileName },
      );

      // ── 7. Persist to DB ─────────────────────────────────────────────────
      const submissionData = {
        name: student.name,
        rollNo: student.rollNo,
        email: student.email ?? '',
        section: student.section,
        branch: student.branch,
        year: student.year,
        videoDriveId: driveFileId,
        mediaType: 'VIDEO' as const,
        driveFolderPath: relativePath,
        status: 'SUBMITTED' as const,
        submittedAt: new Date(),
        reviewText: null,
        reviewPros: [],
        reviewCons: [],
        reviewedAt: null,
        reviewedBy: null,
      };

      const submission = existing
        ? await prisma.submission.update({ where: { id: existing.id }, data: submissionData })
        : await prisma.submission.create({ data: { eventId: EVENT_ID, ...submissionData } });

      // ── 8. Sync introVideo table (non-blocking — don't fail the upload) ───
      const sizeMb = parseFloat((contentLength / 1024 / 1024).toFixed(2));
      (async () => {
        const iv = await prisma.introVideo.findFirst({
          where: { studentId: student.id },
          orderBy: { submittedAt: 'desc' },
        });
        const ivData = {
          driveFileId,
          filename: origFilename,
          mimeType: rawMime,
          sizeMb,
          status: 'PENDING' as const,
          reviewNote: null,
          reviewedBy: null,
          reviewedAt: null,
          submittedAt: new Date(),
          isActive: true,
        };
        if (iv) {
          await prisma.introVideo.update({ where: { id: iv.id }, data: ivData });
        } else {
          await prisma.introVideo.create({ data: { studentId: student.id, ...ivData } });
        }
      })().catch((e) => console.warn('[video-stream] introVideo sync failed:', e));

      // ── 9. Activity log ──────────────────────────────────────────────────
      ActivityService.log({
        eventId: EVENT_ID,
        category: 'APPLICATION',
        action: existing ? 'Student re-uploaded video (stream)' : 'Application submitted (stream)',
        details: `Roll: ${student.rollNo}, Branch: ${student.branch}, Size: ${sizeMb} MB`,
        applicantName: student.name,
        userEmail: student.rollNo,
        status: 'SUCCESS',
      }).catch(() => {});

      res.status(201).json({
        success: true,
        id: submission.id,
        message: 'Your introduction video has been submitted successfully.',
      });
    } catch (err: any) {
      console.error('[video-stream] Error:', err?.message ?? err);
      ActivityService.log({
        eventId: EVENT_ID,
        category: 'APPLICATION',
        action: 'Student streaming upload failed',
        details: err?.message,
        applicantName: req.student?.name,
        userEmail: req.student?.rollNo,
        status: 'ERROR',
        errorMessage: err?.stack,
      }).catch(() => {});
      if (!res.headersSent) {
        res.status(500).json({ error: 'UPLOAD_FAILED', message: 'Could not upload your video. Please try again.' });
      }
    }
  },
);

// --- Phase 3: Resume Routes ---
router.get('/resume', requireStudentAuth, async (req, res) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { studentId: (req as any).studentId },
      orderBy: { submittedAt: 'desc' }
    });
    res.json(resumes.map(r => ({
      ...r,
      fileUrl: r.driveFileId ? `/api/public/media/resume/${r.driveFileId}` : null
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/resume', requireStudentAuth, resumeUpload, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = (req as any).studentId;
    const resumeFile = req.file || (req.files as any)?.resume?.[0] || (req.files as any)?.file?.[0];

    if (!resumeFile) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Resume PDF document is required.' });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
      return;
    }

    // Clean up existing resume file on Drive if present
    const existingResume = await prisma.resume.findFirst({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
    });

    if (existingResume?.driveFileId) {
      try {
        await driveService.cleanupFailedUpload([existingResume.driveFileId]);
      } catch (e) {
        console.warn('Failed to delete old resume from Drive:', e);
      }
    }

    // Upload new resume to Drive or mock storage
    const ext = path.extname(resumeFile.originalname) || '.pdf';
    const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    const cleanName = student.name.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `Resume_${cleanRollNo}_${cleanName}${ext}`;
    const relativePath = `Resumes/${student.year}-${student.section}/${cleanRollNo}_${cleanName}`;

    const driveFileId = await driveService.uploadFile(
      {
        buffer: resumeFile.buffer,
        originalname: resumeFile.originalname,
        mimetype: resumeFile.mimetype || 'application/pdf',
        size: resumeFile.size,
      },
      fileName,
      env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
      relativePath
    );

    const sizeMb = parseFloat((resumeFile.size / (1024 * 1024)).toFixed(2));

    const resume = existingResume
      ? await prisma.resume.update({
          where: { id: existingResume.id },
          data: {
            driveFileId,
            filename: resumeFile.originalname,
            sizeMb,
            status: 'PENDING',
            reviewNote: null,
            reviewedBy: null,
            reviewedAt: null,
            submittedAt: new Date(),
          },
        })
      : await prisma.resume.create({
          data: {
            studentId,
            driveFileId,
            filename: resumeFile.originalname,
            sizeMb,
            status: 'PENDING',
            submittedAt: new Date(),
          },
        });

    res.status(201).json({
      ...resume,
      fileUrl: `/api/public/media/resume/${resume.driveFileId}`,
    });
  } catch (err: any) {
    console.error('Error uploading resume:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Failed to upload resume document.' });
  }
});

export default router;
