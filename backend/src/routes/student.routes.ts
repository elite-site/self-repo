import type { StudentStatus } from '@prisma/client';
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import path from 'path';
import { env } from '../config/env';
import { INTERNAL_EVENT_ID } from '../config/constants';
import { prisma } from '../lib/prisma';
import { requireStudentAuth, STUDENT_SESSION_COOKIE_NAME } from '../middleware/studentAuth';
import { studentLoginRateLimiter, submissionRateLimiter } from '../middleware/rateLimiter';
import { resumeUpload } from '../middleware/upload';
import { ValidationService } from '../services/validation.service';
import { driveService } from '../services/drive.service';
import { ActivityService } from '../services/activity.service';
import { ssoService } from '../services/sso.service';
import { resolveContentRange } from '../utils/rangeParser';
import { getMaxVideoSizeMb } from '../services/limits.service';
import { TtlCache } from '../utils/ttlCache';
import { invalidateMediaDriveIdCache } from './public.routes';
import { clearVideoListCache } from './public.videos.routes';

const router = Router();
const studentSubmissionVideoCache = new TtlCache<{ videoDriveId: string; driveFolderPath: string }>(120_000, 500);

const EVENT_ID = INTERNAL_EVENT_ID;
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
  profile?: {
    id?: string;
    photoDriveId?: string | null;
    photoUrl?: string | null;
    photoOffsetX?: number | null;
    photoOffsetY?: number | null;
    photoZoom?: number | null;
    biography?: string | null;
  } | null;
}, submission: any | null, introVideo: any | null = null, maxVideoSizeMb: number = 25) {
  const photoUrl = (student.profile?.photoDriveId || student.profile?.photoUrl)
    ? `/api/public/media/photo/${student.profile?.id || student.id}`
    : null;

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
    photoUrl: photoUrl || undefined,
    viewUrl: photoUrl || undefined,
    hasPhoto: Boolean(photoUrl),
    photoOffsetX: student.profile?.photoOffsetX ?? 0,
    photoOffsetY: student.profile?.photoOffsetY ?? 0,
    photoZoom: student.profile?.photoZoom ?? 1,
    bio: student.profile?.biography || undefined,
    biography: student.profile?.biography || undefined,
    // The effective, administrator-configured upload limit, so the client can
    // pre-check against the same number the server enforces.
    maxVideoSizeMb,
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
          hasFile: Boolean(introVideo.driveFileId && introVideo.driveFileId.trim() !== ''),
          driveFileId: (introVideo.driveFileId && introVideo.driveFileId.trim() !== '') ? introVideo.driveFileId.trim() : null,
          thumbnailUrl: (introVideo.driveFileId && introVideo.driveFileId.trim() !== '')
            ? `/api/public/media/thumbnail/video/${introVideo.id}?v=${encodeURIComponent(introVideo.driveFileId.trim())}`
            : null,
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

function isAllowedRedirectUrl(candidateUrl: string): boolean {
  try {
    const parsed = new URL(candidateUrl);
    const origin = parsed.origin.trim().replace(/\/$/, '');
    if (
      env.ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/[a-z0-9_.-]+(\.netlify\.app|\.onrender\.com|\.vercel\.app)$/i.test(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    ) {
      return true;
    }
  } catch {
    // Malformed URL
  }
  return false;
}

function signedState(returnTo?: string): string {
  return jwt.sign(
    { nonce: crypto.randomUUID(), ...(returnTo ? { returnTo } : {}) },
    env.STUDENT_JWT_SECRET,
    { expiresIn: '10m' }
  );
}

// GET /api/student/google/authorize — kick off Google Workspace SSO.
router.get('/google/authorize', studentLoginRateLimiter, (req: Request, res: Response): void => {
  const url = ssoService.getAuthUrl();
  const sep = url.includes('?') ? '&' : '?';

  let returnTo: string | undefined;
  const rawReturnTo = (req.query.return_to || req.query.redirect_uri) as string | undefined;
  if (typeof rawReturnTo === 'string' && isAllowedRedirectUrl(rawReturnTo)) {
    returnTo = rawReturnTo.trim();
  }

  res.redirect(302, `${url}${sep}state=${encodeURIComponent(signedState(returnTo))}`);
});

// GET /api/student/google/callback — verify id_token, look up roster email, mint our JWT.
router.get('/google/callback', studentLoginRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query;

  let decodedState: any = null;
  try {
    decodedState = jwt.verify(String(state ?? ''), env.STUDENT_JWT_SECRET);
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

    const student = await prisma.student.findUnique({
      where: { email: identity.email },
      select: { id: true, rollNo: true, name: true, email: true },
    });

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

    let redirectBase = env.STUDENT_APP_LOGIN_URL;
    if (
      decodedState?.returnTo &&
      typeof decodedState.returnTo === 'string' &&
      isAllowedRedirectUrl(decodedState.returnTo)
    ) {
      redirectBase = decodedState.returnTo.trim();
    }
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
    const studentId = req.student!.studentId;
    const rollNo = req.student?.rollNo;

    // Parallelize queries across database connections to minimize latency under concurrency
    const studentPromise = prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: {
          select: {
            id: true,
            photoDriveId: true,
            photoUrl: true,
            photoOffsetX: true,
            photoOffsetY: true,
            photoZoom: true,
            biography: true,
          },
        },
      },
    });

    const submissionPromise = rollNo
      ? prisma.submission.findFirst({
          where: { rollNo },
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
        })
      : Promise.resolve(null);

    // The intro-video panel is an enrichment on top of the student's identity,
    // so it must never be able to fail the whole request. This query selects
    // columns added by a later migration; if that migration has not been applied
    // (or the DB is briefly unavailable) it throws, and a 500 here makes the
    // portal treat the session as invalid and bounce the student back to login.
    // Degrade to "no video" instead.
    const introVideoPromise = prisma.introVideo
      .findFirst({
        where: { studentId },
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
      })
      .catch((err: any) => {
        console.error(
          '[GET /student/me] intro video lookup failed; serving profile without it. ' +
            'If this is "column does not exist", run: npx prisma migrate deploy',
          err?.message ?? err,
        );
        return null;
      });

    let [student, submission, introVideo] = await Promise.all([
      studentPromise,
      submissionPromise,
      introVideoPromise,
    ]);

    if (!student) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
      return;
    }

    // In case rollNo was missing from the JWT or differs, query submission with student.rollNo
    if (!submission && student.rollNo && student.rollNo !== rollNo) {
      submission = await prisma.submission.findFirst({
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
    }

    // Never cache student session/profile data so submissions, reviews,
    // profile photo edits and the intro video reflect immediately without
    // requiring a re-login.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({
      student: serializeStudentView(
        student,
        submission,
        introVideo,
        await getMaxVideoSizeMb(),
      ),
    });
  } catch (err: any) {
    console.error('Error fetching student profile:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_PROFILE', message: err.message });
  }
});

// POST /api/student/submission — DEPRECATED: use /submission/video-stream instead.
// The buffered upload route was removed because it held the entire video in RAM
// (up to 25 MB per request) before forwarding to Drive, while the streaming
// endpoint pipes bytes directly with zero buffering. The frontend already uses
// the streaming route exclusively.
router.post(
  '/submission',
  requireStudentAuth,
  (_req: Request, res: Response) => {
    res.status(410).json({
      error: 'DEPRECATED',
      message: 'This upload endpoint has been retired. Please use /submission/video-stream.',
    });
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
    const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    const folderPath = submissions[0]?.driveFolderPath || `Students/${cleanRollNo}`;

    // `rating` is a plain enum column on Submission and EmailLog.submissionId is
    // an unconstrained string, so the rows can be removed directly.
    await prisma.$transaction([
      prisma.submission.deleteMany({ where: { id: { in: submissions.map((s) => s.id) } } }),
      prisma.introVideo.deleteMany({ where: { id: { in: introVideos.map((v) => v.id) } } }),
    ]);

    for (const fileId of fileIds) {
      deleteStoredFile(fileId, folderPath);
    }

    // Invalidate all video caches so old video and thumbnails are never served
    studentSubmissionVideoCache.delete(studentId);
    studentSubmissionVideoCache.delete(student.rollNo);
    for (const v of introVideos) {
      invalidateMediaDriveIdCache('video', v.id);
      if (v.driveFileId) invalidateMediaDriveIdCache('video', v.driveFileId);
    }
    for (const s of submissions) {
      invalidateMediaDriveIdCache('video', s.id);
      if (s.videoDriveId) invalidateMediaDriveIdCache('video', s.videoDriveId);
    }
    invalidateMediaDriveIdCache('video', studentId);
    invalidateMediaDriveIdCache('video', student.rollNo);
    clearVideoListCache();

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
    const rollNo = req.student?.rollNo;

    const cacheKey = rollNo || studentId;
    let cached = studentSubmissionVideoCache.get(cacheKey);
    let submission: { videoDriveId: string | null; driveFolderPath: string } | null = cached || null;

    if (!submission) {
      if (rollNo) {
        submission = await prisma.submission.findFirst({
          where: { rollNo },
          orderBy: { submittedAt: 'desc' },
          select: { videoDriveId: true, driveFolderPath: true },
        });
      } else {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          select: { rollNo: true },
        });
        if (!student) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
          return;
        }
        submission = await prisma.submission.findFirst({
          where: { rollNo: student.rollNo },
          orderBy: { submittedAt: 'desc' },
          select: { videoDriveId: true, driveFolderPath: true },
        });
      }

      if (submission?.videoDriveId) {
        studentSubmissionVideoCache.set(cacheKey, {
          videoDriveId: submission.videoDriveId,
          driveFolderPath: submission.driveFolderPath,
        });
      }
    }

    if (!submission?.videoDriveId) {
      const iv = await prisma.introVideo.findFirst({
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        select: { driveFileId: true },
      });
      if (iv?.driveFileId) {
        const cleanRollNo = (rollNo || studentId).toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
        submission = {
          videoDriveId: iv.driveFileId,
          driveFolderPath: `Students/${cleanRollNo}`,
        };
      }
    }

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

    const forceStream = req.query.proxy === '1' || req.query.proxy === 'true' || req.query.stream === '1' || req.query.stream === 'true';

    // Direct Google Drive redirect: allows the browser's <video> element to stream
    // directly from Google's high-speed CDN with full byte-range seeking instead
    // of proxying heavy video streams through Render's single-core CPU.
    // When ?proxy=1 or ?stream=1 is present, or if direct-link probe fails, we fall through
    // to proxy streaming.
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
          } else {
            console.warn(`[StudentMedia] Direct link probe failed for ${driveFileId}, falling back to proxy stream`);
          }
        }
      }
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
    res.setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('ETag', etag);

    if (req.query.download === '1' || req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="self-introduction_${rollNo || studentId}.mp4"`);
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
// ── Helper to record student video submission in DB and sync introVideo ──────
async function recordStudentVideoSubmission(params: {
  student: {
    id: string;
    rollNo: string;
    name: string;
    email: string | null;
    section: string;
    branch: string;
    year: number;
  };
  driveFileId: string;
  origFilename: string;
  rawMime: string;
  contentLength: number;
  relativePath: string;
  source: 'stream' | 'direct';
}): Promise<{ id: string; videoDriveId: string }> {
  const { student, driveFileId, origFilename, rawMime, contentLength, relativePath, source } = params;

  // 1. Fetch existing submission (for cleanup & upsert)
  const existing = await prisma.submission.findFirst({
    where: { rollNo: student.rollNo },
    orderBy: { submittedAt: 'desc' },
  });
  const previousDriveId = existing?.videoDriveId ?? null;

  // The new file is safely stored. Only now is the old one removed, so a
  // failed upload can never destroy the student's current video.
  if (previousDriveId && previousDriveId !== driveFileId) {
    deleteStoredFile(previousDriveId, relativePath);
  }

  // 2. Persist to DB
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

  // 3. Sync introVideo table
  const sizeMb = parseFloat((contentLength / 1024 / 1024).toFixed(2));
  try {
    const iv = await prisma.introVideo.findFirst({
      where: { studentId: student.id },
      orderBy: { submittedAt: 'desc' },
    });

    let thumbnailBuffer: Buffer | null = null;
    try {
      thumbnailBuffer = await driveService.generateThumbnail(driveFileId, 'video');
    } catch (thumbErr) {
      console.warn('Could not generate thumbnail for re-uploaded intro video:', thumbErr);
    }

    const ivData = {
      driveFileId,
      filename: origFilename,
      mimeType: rawMime,
      sizeMb,
      thumbnail: thumbnailBuffer,
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

    // Invalidate all video caches so old video and thumbnails are never served
    studentSubmissionVideoCache.delete(student.id);
    studentSubmissionVideoCache.delete(student.rollNo);
    invalidateMediaDriveIdCache('video', keptId);
    invalidateMediaDriveIdCache('video', student.id);
    invalidateMediaDriveIdCache('video', student.rollNo);
    invalidateMediaDriveIdCache('video', driveFileId);
    if (existing?.videoDriveId) {
      invalidateMediaDriveIdCache('video', existing.videoDriveId);
    }
    clearVideoListCache();

    // If thumbnailBuffer couldn't be generated immediately (Drive still processing),
    // schedule background generation in 3s so the new thumbnail is pre-warmed
    if (!thumbnailBuffer && driveFileId && keptId) {
      setTimeout(async () => {
        try {
          const bgThumb = await driveService.generateThumbnail(driveFileId, 'video');
          if (bgThumb) {
            await prisma.introVideo.update({ where: { id: keptId }, data: { thumbnail: bgThumb } });
          }
        } catch {}
      }, 3000);
    }
  } catch (e) {
    console.warn('[video-record] introVideo sync failed:', e);
  }

  // 4. Activity log
  ActivityService.log({
    eventId: EVENT_ID,
    category: 'APPLICATION',
    action: existing ? `Student re-uploaded video (${source})` : `Application submitted (${source})`,
    details: `Roll: ${student.rollNo}, Branch: ${student.branch}, Size: ${sizeMb} MB`,
    applicantName: student.name,
    userEmail: student.rollNo,
    status: 'SUCCESS',
  }).catch(() => {});

  return { id: submission.id, videoDriveId: driveFileId };
}

/**
 * POST /api/student/submission/video-session
 *
 * Initiates a direct-to-Drive resumable upload session for the browser.
 * Returns { sessionUrl, chunkSize }.
 * In mock mode or if session cannot be established, returns 501 so
 * the client cleanly falls back to /submission/video-stream.
 */
router.post(
  '/submission/video-session',
  requireStudentAuth,
  submissionRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: req.student!.studentId },
        select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true },
      });

      if (!student) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
        return;
      }

      const { fileName, fileSize, mimeType } = req.body ?? {};

      const sizeNum = typeof fileSize === 'number' ? fileSize : parseInt(String(fileSize ?? '0'), 10);
      if (!sizeNum || Number.isNaN(sizeNum) || sizeNum <= 0) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Valid fileSize is required.' });
        return;
      }

      const maxVideoSizeMb = await getMaxVideoSizeMb();
      const maxBytes = maxVideoSizeMb * 1024 * 1024;
      if (sizeNum > maxBytes) {
        res.status(413).json({
          error: 'FILE_TOO_LARGE',
          message: `Video must be under ${maxVideoSizeMb} MB.`,
        });
        return;
      }

      const cleanMime = typeof mimeType === 'string' ? mimeType.split(';')[0].trim().toLowerCase() : '';
      if (!cleanMime.startsWith('video/') && !ValidationService.ALLOWED_VIDEO_MIMES.includes(cleanMime)) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Only video files are allowed.' });
        return;
      }

      const cleanFileName = typeof fileName === 'string' ? fileName.trim() : '';
      const ext = path.extname(cleanFileName).toLowerCase().replace(/^\./, '');
      const ALLOWED_EXTS = ['mp4', 'mov', 'webm', 'mkv'];
      if (!cleanFileName || (ext && !ALLOWED_EXTS.includes(ext))) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Unsupported video format. Allowed formats: MP4, MOV, WebM, MKV.',
        });
        return;
      }

      if (driveService.isUsingMock) {
        res.status(501).json({
          error: 'NOT_IMPLEMENTED',
          message: 'Direct Google Drive upload is not supported in mock mode.',
          sessionUrl: null,
        });
        return;
      }

      // Check request Origin header against allowed origins
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
        } catch {
          // ignore
        }
      }

      const { folderId } = await driveService.resolveStudentFolder({
        eventName: EVENT_NAME,
        eventYear: env.EVENT_YEAR,
        year: student.year,
        section: student.section,
        branch: student.branch,
        rollNo: student.rollNo,
        name: student.name,
      });

      const fileExt = ext ? `.${ext}` : '.mp4';
      const clean = (s: string) => s.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const videoFileName = `${clean(student.rollNo)}_video${fileExt}`;

      const sessionUrl = await driveService.createResumableUploadSession(
        videoFileName,
        cleanMime,
        sizeNum,
        folderId,
        clientOrigin,
      );

      if (!sessionUrl) {
        res.status(501).json({
          error: 'NOT_IMPLEMENTED',
          message: 'Direct Drive upload session could not be established.',
          sessionUrl: null,
        });
        return;
      }

      const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB
      res.status(200).json({
        sessionUrl,
        chunkSize: CHUNK_SIZE,
      });
    } catch (err: any) {
      console.error('[video-session] Error initiating upload session:', err);
      res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Could not create upload session.',
      });
    }
  },
);

/**
 * POST /api/student/submission/video-complete
 *
 * Finalizes a direct-to-Drive upload after browser finishes uploading chunks.
 * Verifies the file in Drive (owner, size, mimeType, parent folder) before
 * recording the submission. Deletes the file if validation fails.
 */
router.post(
  '/submission/video-complete',
  requireStudentAuth,
  submissionRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: req.student!.studentId },
        select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true },
      });

      if (!student) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Student account not found.' });
        return;
      }

      const { driveFileId } = req.body ?? {};
      if (!driveFileId || typeof driveFileId !== 'string') {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Valid driveFileId is required.' });
        return;
      }

      const { folderId, relativePath } = await driveService.resolveStudentFolder({
        eventName: EVENT_NAME,
        eventYear: env.EVENT_YEAR,
        year: student.year,
        section: student.section,
        branch: student.branch,
        rollNo: student.rollNo,
        name: student.name,
      });

      const maxVideoSizeMb = await getMaxVideoSizeMb();
      const maxBytes = maxVideoSizeMb * 1024 * 1024;

      // Verify the file via Drive API
      const verifyResult = await driveService.verifyUploadedVideoFile(
        driveFileId,
        folderId,
        maxBytes,
      );

      if (!verifyResult.valid || !verifyResult.fileMeta) {
        // Delete invalid file from Drive to avoid orphaned unvalidated files
        deleteStoredFile(driveFileId, relativePath);
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: verifyResult.error || 'Video validation failed.',
        });
        return;
      }

      const submission = await recordStudentVideoSubmission({
        student,
        driveFileId,
        origFilename: verifyResult.fileMeta.name,
        rawMime: verifyResult.fileMeta.mimeType,
        contentLength: verifyResult.fileMeta.size,
        relativePath,
        source: 'direct',
      });

      res.status(201).json({
        success: true,
        id: submission.id,
        videoDriveId: driveFileId,
        message: 'Your introduction video has been submitted successfully.',
      });
    } catch (err: any) {
      console.error('[video-complete] Error completing upload:', err);
      ActivityService.log({
        eventId: EVENT_ID,
        category: 'APPLICATION',
        action: 'Student direct upload finalize failed',
        details: err?.message,
        applicantName: req.student?.name,
        userEmail: req.student?.rollNo,
        status: 'ERROR',
        errorMessage: err?.stack,
      }).catch(() => {});
      if (!res.headersSent) {
        res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not complete video submission.' });
      }
    }
  },
);

router.post(
  '/submission/video-stream',
  requireStudentAuth,
  submissionRateLimiter,
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
      const videoFileName = `${clean(student.rollNo)}_video${ext}`;

      // ── 4. Create Drive resumable session (returns null in mock mode) ─────
      const sessionUrl = await driveService.createResumableUploadSession(
        videoFileName, rawMime, contentLength, folderId,
      );

      // ── 5. Pipe req stream → Drive (THE KEY STEP — no buffering) ─────────
      const driveFileId = await driveService.streamUploadToDrive(
        sessionUrl,
        rawMime,
        contentLength,
        req,   // Express Request is a Node.js Readable
        { relativePath, fileName: videoFileName },
      );

      // ── 6. Persist submission & sync introVideo ──────────────────────────
      const submission = await recordStudentVideoSubmission({
        student,
        driveFileId,
        origFilename,
        rawMime,
        contentLength,
        relativePath,
        source: 'stream',
      });

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
    // thumbnail blob is intentionally excluded; served by /api/public/media/thumbnail/:type/:id
    const resumes = await prisma.resume.findMany({
      where: { studentId: (req as any).studentId },
      orderBy: { submittedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        studentId: true,
        driveFileId: true,
        filename: true,
        sizeMb: true,
        status: true,
        reviewNote: true,
        reviewedBy: true,
        reviewedAt: true,
        isActive: true,
        isPublic: true,
        submittedAt: true,
        updatedAt: true,
      },
    });

    res.set('Cache-Control', 'private, max-age=30, must-revalidate');
    res.json(resumes.map(r => {
      const { driveFileId: _d, ...rest } = r;
      const viewUrl = r.driveFileId ? `/api/public/media/resume/${r.id}` : null;
      const previewUrl = driveService.getPreviewUrl(r.driveFileId);
      const thumbnailUrl = r.driveFileId
        ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}`
        : null;
      return {
        ...rest,
        hasFile: Boolean(r.driveFileId),
        viewUrl: previewUrl || viewUrl,
        fileUrl: previewUrl || viewUrl,
        previewUrl,
        driveFileId: r.driveFileId || null,
        thumbnailUrl,
      };
    }));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/resume', requireStudentAuth, submissionRateLimiter, resumeUpload, async (req: Request, res: Response): Promise<void> => {
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
    const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    const relativePath = `Students/${cleanRollNo}`;

    const existingResume = await prisma.resume.findFirst({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
    });

    if (existingResume?.driveFileId) {
      try {
        await driveService.deleteFileById(existingResume.driveFileId, relativePath);
      } catch (e) {
        console.warn('Failed to delete old resume from Drive:', e);
      }
    }
    await driveService.deleteFilesByPrefix(relativePath, `${cleanRollNo}_resume`).catch(() => {});

    // Upload new resume to Drive or mock storage
    const ext = path.extname(resumeFile.originalname) || '.pdf';
    const fileName = `${cleanRollNo}_resume${ext}`;

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

    let thumbnailBuffer: Buffer | null = null;
    if (driveFileId && typeof driveService.generateThumbnail === 'function') {
      try {
        thumbnailBuffer = await driveService.generateThumbnail(driveFileId, 'resume');
      } catch (thumbErr) {
        console.warn('Could not generate thumbnail for resume at upload:', thumbErr);
      }
    }

    const resume = existingResume
      ? await prisma.resume.update({
          where: { id: existingResume.id },
          data: {
            driveFileId,
            filename: resumeFile.originalname,
            sizeMb,
            thumbnail: thumbnailBuffer,
            // A new or replaced resume re-enters the moderation queue. It must not
            // publish itself, or admin review becomes optional for resumes.
            status: 'PENDING',
            isPublic: false,
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
            thumbnail: thumbnailBuffer,
            status: 'PENDING',
            isPublic: false,
            submittedAt: new Date(),
          },
        });

    const { driveFileId: _d, thumbnail: _t, ...rest } = resume;
    const viewUrl = `/api/public/media/resume/${resume.id}`;
    const thumbnailUrl = driveFileId
      ? `/api/public/media/thumbnail/resume/${resume.id}?v=${encodeURIComponent(driveFileId)}`
      : null;

    res.status(201).json({
      ...rest,
      hasFile: true,
      viewUrl,
      fileUrl: viewUrl,
      thumbnailUrl,
    });
  } catch (err: any) {
    console.error('Error uploading resume:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Failed to upload resume document.' });
  }
});

// DELETE /api/student/resume — withdraw the student's own resume.
// Ownership is enforced against the authenticated student.
router.delete('/resume', requireStudentAuth, async (req: Request, res: Response): Promise<void> => {
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

    const existingResume = await prisma.resume.findFirst({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
    });

    if (!existingResume) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'You have no resume to delete.' });
      return;
    }

    const fileId = existingResume.driveFileId;

    await prisma.resume.delete({ where: { id: existingResume.id } });

    if (fileId) {
      try {
        const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
        await driveService.deleteFileById(fileId, `Students/${cleanRollNo}`);
      } catch (e) {
        console.warn('Could not delete resume file from storage:', e);
      }
    }

    await ActivityService.log({
      eventId: EVENT_ID,
      category: 'FILE_UPLOAD',
      action: 'Student deleted resume',
      details: `Roll: ${student.rollNo}`,
      applicantName: student.name,
      userEmail: student.rollNo,
      status: 'SUCCESS',
    });

    res.json({ success: true, message: 'Your resume has been deleted.' });
  } catch (err: any) {
    console.error('Error deleting resume:', err);
    res.status(500).json({
      error: 'DELETE_FAILED',
      message: 'Could not delete your resume. Please try again.',
    });
  }
});

export default router;
