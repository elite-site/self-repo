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
import { resolveContentRange } from '../utils/rangeParser';

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
}, submission: any | null, introVideo: any | null = null) {
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
    // Moderation + public visibility state of the introduction video, plus the
    // stored file's own metadata so the portal can show the student exactly
    // which recording they submitted.
    video: introVideo
      ? {
          id: introVideo.id,
          status: introVideo.status,
          reviewNote: introVideo.reviewNote || null,
          isPublic: Boolean(introVideo.isPublic),
          publishedAt: introVideo.publishedAt || null,
          changeRequestedAt: introVideo.changeRequestedAt || null,
          changeRequestNote: introVideo.changeRequestNote || null,
          submittedAt: introVideo.submittedAt,
          filename: introVideo.filename || null,
          mimeType: introVideo.mimeType || null,
          sizeMb: introVideo.sizeMb ?? null,
          hasFile: Boolean(introVideo.driveFileId),
        }
      : null,
  };
}

/**
 * Remove every IntroVideo row for a student except the one just written.
 * A student only ever has one active intro video, so superseded rows would
 * otherwise pile up (and keep orphaned moderation entries around).
 */
async function purgeSupersededIntroVideos(
  studentId: string,
  keepId: string,
  protectedFileId?: string | null,
): Promise<string[]> {
  try {
    const stale = (await prisma.introVideo.findMany({
      where: { studentId, id: { not: keepId } },
      select: { id: true, driveFileId: true },
    })) ?? [];

    if (stale.length === 0) return [];

    await prisma.introVideo.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });

    // Orphaned Drive files are removed by the caller — the new video is already
    // stored, so a cleanup failure must never fail the upload.
    return stale
      .map((v) => v.driveFileId)
      .filter((fileId): fileId is string => Boolean(fileId) && fileId !== protectedFileId);
  } catch (err) {
    console.warn('Could not purge superseded intro video rows:', err);
    return [];
  }
}

/**
 * Best-effort removal of a stored file.
 *
 * This only ever runs after a replacement video is safely stored and
 * referenced, so it must never throw: a storage hiccup while deleting the
 * superseded file must not fail the upload the student just completed.
 */
function deleteStoredFile(fileId: string | null | undefined, relativePath?: string): void {
  if (!fileId) return;
  try {
    void Promise.resolve(driveService.deleteFileById(fileId, relativePath)).catch((err) => {
      console.warn(`Could not delete superseded file ${fileId}:`, err);
    });
  } catch (err) {
    console.warn(`Could not delete superseded file ${fileId}:`, err);
  }
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

    const isProduction = env.NODE_ENV === 'production';
    res.cookie(STUDENT_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });

    const redirectBase = env.STUDENT_APP_LOGIN_URL;
    const sep = redirectBase.includes('?') ? '&' : '?';
    res.redirect(302, `${redirectBase}${sep}token=${encodeURIComponent(token)}`);
  } catch (err: any) {
    console.error('SSO callback error:', err);
    res.status(500).json({ error: 'SSO_FAILED', message: 'Could not complete Google sign-in.' });
  }
});

// POST /api/student/logout — clear the session cookie.
router.post('/logout', (_req: Request, res: Response): void => {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie(STUDENT_SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
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

    // The intro-video panel is an enrichment on top of the student's identity,
    // so it must never be able to fail the whole request. This query selects
    // columns added by a later migration; if that migration has not been applied
    // (or the DB is briefly unavailable) it throws, and a 500 here makes the
    // portal treat the session as invalid and bounce the student back to login.
    // Degrade to "no video" instead.
    let introVideo: any = null;
    try {
      introVideo = await prisma.introVideo.findFirst({
        where: { studentId: student.id },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          status: true,
          reviewNote: true,
          isPublic: true,
          publishedAt: true,
          changeRequestedAt: true,
          changeRequestNote: true,
          submittedAt: true,
          filename: true,
          mimeType: true,
          sizeMb: true,
          driveFileId: true,
        },
      });
    } catch (err: any) {
      console.error(
        '[GET /student/me] intro video lookup failed; serving profile without it. ' +
          'If this is "column does not exist", run: npx prisma migrate deploy',
        err?.message ?? err,
      );
    }

    // Never cache student session/profile data so submissions, reviews,
    // profile photo edits and the intro video reflect immediately without
    // requiring a re-login.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ student: serializeStudentView(student, submission, introVideo) });
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

      // Existing submission (if any). The old file is NOT deleted yet — the new
      // video is uploaded first so a failed upload can never leave the student
      // with no video at all.
      const existing = await prisma.submission.findFirst({
        where: { rollNo: student.rollNo },
        orderBy: { submittedAt: 'desc' },
      });
      const previousDriveId = existing?.videoDriveId ?? null;

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
      const sizeMb = parseFloat((videoFile.size / (1024 * 1024)).toFixed(2));
      let keptIntroVideoId: string | null = null;
      try {
        const existingIntroVideo = await prisma.introVideo.findFirst({
          where: { studentId: student.id },
          orderBy: { submittedAt: 'desc' },
        });

        if (existingIntroVideo) {
          const updated = await prisma.introVideo.update({
            where: { id: existingIntroVideo.id },
            data: {
              driveFileId: uploadResult.videoDriveId || null,
              filename: videoFile.originalname,
              mimeType: videoFile.mimetype,
              sizeMb,
              status: 'PENDING',
              reviewNote: null,
              reviewedBy: null,
              reviewedAt: null,
              submittedAt: new Date(),
              isActive: true,
              // A replaced video must be re-approved before it is public again.
              isPublic: false,
              publishedAt: null,
              changeRequestedAt: null,
              changeRequestNote: null,
            },
          });
          keptIntroVideoId = updated.id;
        } else {
          const created = await prisma.introVideo.create({
            data: {
              studentId: student.id,
              driveFileId: uploadResult.videoDriveId || null,
              filename: videoFile.originalname,
              mimeType: videoFile.mimetype,
              sizeMb,
              status: 'PENDING',
              submittedAt: new Date(),
              isActive: true,
            },
          });
          keptIntroVideoId = created.id;
        }
      } catch (introVideoErr) {
        console.warn('Could not sync introVideo table:', introVideoErr);
      }

      // The new video is stored and referenced — now override the old one and
      // delete every superseded file from storage.
      if (keptIntroVideoId) {
        const orphanedFileIds = await purgeSupersededIntroVideos(
          student.id,
          keptIntroVideoId,
          uploadResult.videoDriveId,
        );
        for (const fileId of [previousDriveId, ...orphanedFileIds]) {
          if (fileId === uploadResult.videoDriveId) continue;
          deleteStoredFile(fileId, uploadResult.driveFolderPath);
        }
      } else {
        deleteStoredFile(previousDriveId, uploadResult.driveFolderPath);
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

// DELETE /api/student/submission — withdraw the student's own introduction
// video. Ownership is enforced against the authenticated student's roll number,
// so one student can never delete another's take. Both rows that reference the
// file are removed: the Submission (what /me reports) and the active
// IntroVideo (what the admin moderation queue reads), plus any superseded
// IntroVideo rows for the same student so no orphaned moderation entry is left
// pointing at a file that no longer exists.
router.delete('/submission', requireStudentAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.student!.studentId;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, name: true },
    });
    if (!student) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
      return;
    }

    const submissions = await prisma.submission.findMany({
      where: { rollNo: student.rollNo },
      select: { id: true, videoDriveId: true, driveFolderPath: true },
    });
    const introVideos = await prisma.introVideo.findMany({
      where: { studentId },
      select: { id: true, driveFileId: true },
    });

    if (submissions.length === 0 && introVideos.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'You have no submitted video to delete.' });
      return;
    }

    const fileIds = new Set<string>();
    for (const s of submissions) {
      if (s.videoDriveId) fileIds.add(s.videoDriveId);
    }
    for (const v of introVideos) {
      if (v.driveFileId) fileIds.add(v.driveFileId);
    }
    const folderPath = submissions[0]?.driveFolderPath;

    // `rating` is a plain enum column on Submission and EmailLog.submissionId is
    // an unconstrained string, so the rows can be removed directly.
    await prisma.$transaction([
      prisma.submission.deleteMany({ where: { id: { in: submissions.map((s) => s.id) } } }),
      prisma.introVideo.deleteMany({ where: { id: { in: introVideos.map((v) => v.id) } } }),
    ]);

    for (const fileId of fileIds) {
      deleteStoredFile(fileId, folderPath);
    }

    await ActivityService.log({
      eventId: EVENT_ID,
      category: 'APPLICATION',
      action: 'Student deleted introduction video',
      details: `Roll: ${student.rollNo}, files removed: ${fileIds.size}`,
      applicantName: student.name,
      userEmail: student.rollNo,
      status: 'SUCCESS',
    });

    res.json({ success: true, message: 'Your introduction video has been deleted.' });
  } catch (err: any) {
    console.error('Error deleting student submission:', err);
    res.status(500).json({
      error: 'DELETE_FAILED',
      message: 'Could not delete your video. Please try again.',
    });
  }
});

// PATCH /api/student/submission/video-visibility — publish / unpublish your own
// video on the public showcase. Only an APPROVED video can be published, so a
// pending or freshly replaced video never appears publicly before moderation.
router.patch('/submission/video-visibility', requireStudentAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.student!.studentId;
    const { isPublic } = req.body || {};

    if (typeof isPublic !== 'boolean') {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'isPublic must be true or false.' });
      return;
    }

    const introVideo = await prisma.introVideo.findFirst({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
    });

    if (!introVideo || !introVideo.driveFileId) {
      res.status(404).json({ error: 'NO_VIDEO', message: 'Upload an introduction video first.' });
      return;
    }

    if (isPublic && introVideo.status !== 'APPROVED') {
      res.status(409).json({
        error: 'NOT_APPROVED',
        message: 'Your video is still awaiting faculty approval, so it cannot be published yet.',
      });
      return;
    }

    const updated = await prisma.introVideo.update({
      where: { id: introVideo.id },
      data: {
        isPublic,
        publishedAt: isPublic ? new Date() : null,
      },
      select: { id: true, isPublic: true, publishedAt: true, status: true },
    });

    res.json({
      success: true,
      isPublic: updated.isPublic,
      publishedAt: updated.publishedAt,
      message: isPublic
        ? 'Your video is now visible on the public page.'
        : 'Your video has been removed from the public page.',
    });
  } catch (err: any) {
    console.error('Error updating video visibility:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update video visibility.' });
  }
});


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

    const rangeHeader = req.headers.range;

    // The service performs the real byte-range fetch, so the body always
    // matches the advertised Content-Range. A <video> element can then seek
    // through the stored recording instead of buffering the whole file.
    const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
      driveFileId,
      submission.driveFolderPath,
      rangeHeader,
    );

    res.setHeader('Content-Type', mimeType || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, private');
    res.setHeader('ETag', etag);

    if (req.query.download === '1' || req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="self-introduction_${student.rollNo}.mp4"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    const range = resolveContentRange(contentRange, rangeHeader, size);

    if (range) {
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${range.total}`);
      res.setHeader('Content-Length', String(range.end - range.start + 1));
      res.status(206);
    } else if (rangeHeader && size !== undefined) {
      // A range was requested but could not be satisfied (malformed or past EOF).
      // Reject it explicitly rather than replying 200 with the whole file, which
      // the player would then try to seek inside.
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

    // Release the Drive stream when the client goes away (page switch, refresh or
    // a seek) instead of leaving a half-read response holding a socket open.
    res.on('close', () => {
      if (!res.writableFinished && typeof (stream as any).destroy === 'function') {
        (stream as any).destroy();
      }
    });

    stream.on('error', (err: any) => {
      console.error('Video stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'STREAM_ERROR', message: 'Video stream interrupted' });
      } else {
        res.end();
      }
    });

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
      const previousDriveId = existing?.videoDriveId ?? null;

      // ── 5. Create Drive resumable session (returns null in mock mode) ─────
      const sessionUrl = await driveService.createResumableUploadSession(
        videoFileName, rawMime, contentLength, folderId,
      );

      // ── 6. Pipe req stream → Drive (THE KEY STEP — no buffering) ─────────
      const driveFileId = await driveService.streamUploadToDrive(
        sessionUrl,
        rawMime,
        contentLength,
        req,   // Express Request is a Node.js Readable
        { relativePath, fileName: videoFileName },
      );

      // The new file is safely stored. Only now is the old one removed, so a
      // failed upload can never destroy the student's current video.
      if (previousDriveId && previousDriveId !== driveFileId) {
        deleteStoredFile(previousDriveId, relativePath);
      }

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

      // Ensure target event exists in database before upserting
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

      const submission = existing
        ? await prisma.submission.update({ where: { id: existing.id }, data: submissionData })
        : await prisma.submission.create({ data: { eventId: EVENT_ID, ...submissionData } });

      // ── 8. Sync introVideo table ─────────────────────────────────────────
      const sizeMb = parseFloat((contentLength / 1024 / 1024).toFixed(2));
      try {
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
          // A replaced video must be re-approved before it appears publicly.
          isPublic: false,
          publishedAt: null,
          changeRequestedAt: null,
          changeRequestNote: null,
        };

        let keptId: string;
        if (iv) {
          const updated = await prisma.introVideo.update({ where: { id: iv.id }, data: ivData });
          keptId = updated.id;
        } else {
          const created = await prisma.introVideo.create({ data: { studentId: student.id, ...ivData } });
          keptId = created.id;
        }

        // Drop any leftover rows/files from earlier takes so the old video is
        // fully overridden by this one.
        const orphaned = await purgeSupersededIntroVideos(student.id, keptId, driveFileId);
        for (const fileId of orphaned) {
          deleteStoredFile(fileId, relativePath);
        }
      } catch (e) {
        console.warn('[video-stream] introVideo sync failed:', e);
      }

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
        videoDriveId: driveFileId,
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
