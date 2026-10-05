import { Router, Request, Response } from 'express';
import { BRANCHES, SECTIONS, YEARS, EXCLUDE_INTERNAL_EVENT, isInternalEvent } from '../config/constants';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { submissionUploadMiddleware } from '../middleware/upload';
import { submissionRateLimiter } from '../middleware/rateLimiter';
import { ValidationService } from '../services/validation.service';
import { driveService } from '../services/drive.service';
import { ActivityService } from '../services/activity.service';
import { resolveContentRange } from '../utils/rangeParser';
import { TtlCache } from '../utils/ttlCache';

const router = Router();
export const mediaDriveIdCache = new TtlCache<string>(300_000, 1000);

export function invalidateMediaDriveIdCache(type: string, id: string): void {
  mediaDriveIdCache.delete(`${type}:${id}`);
}

const EVENT_ID = env.ACTIVE_EVENT_ID;
const EVENT_NAME = 'Self Introduction';

/**
 * Media types handed to the browser as a Drive redirect instead of being
 * streamed through this process. See the comment on the redirect in
 * `GET /public/media/:type/:fileId` for why video is the only member.
 */
const REDIRECTABLE_TYPES = new Set(['video']);

// GET /api/branches
router.get('/branches', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ branches: BRANCHES });
});

// GET /api/sections
router.get('/sections', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ sections: SECTIONS });
});

// GET /api/years
router.get('/years', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=86400');
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
    let currentStudentEmail = '';

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
      currentStudentEmail = email;

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

      // Sync introVideo table if student account exists
      if (uploadResult.videoDriveId) {
        try {
          const student = await prisma.student.findFirst({
            where: {
              OR: [
                { rollNo: { equals: rollNo, mode: 'insensitive' } },
                { email: { equals: email, mode: 'insensitive' } },
              ],
            },
          });
          if (student) {
            const sizeMb = parseFloat((videoFile.size / (1024 * 1024)).toFixed(2));
            let thumbnailBuffer: Buffer | null = null;
            try {
              thumbnailBuffer = await driveService.generateThumbnail(uploadResult.videoDriveId, 'video');
            } catch {}
            const ivData = {
              driveFileId: uploadResult.videoDriveId,
              filename: videoFile.originalname,
              mimeType: videoFile.mimetype,
              sizeMb,
              thumbnail: thumbnailBuffer,
              status: 'PENDING' as const,
              reviewNote: null,
              reviewedBy: null,
              reviewedAt: null,
              submittedAt: new Date(),
              isActive: true,
              isPublic: false,
              publishedAt: null,
              changeRequestedAt: null,
              changeRequestNote: null,
            };
            const iv = await prisma.introVideo.findFirst({
              where: { studentId: student.id },
              orderBy: { submittedAt: 'desc' },
            });
            if (iv) {
              await prisma.introVideo.update({ where: { id: iv.id }, data: ivData });
            } else {
              await prisma.introVideo.create({ data: { studentId: student.id, ...ivData } });
            }
          }
        } catch (syncErr) {
          console.warn('[public submit] introVideo sync notice:', syncErr);
        }
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
        userEmail: currentStudentEmail || currentRollNo,
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
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        status: 'OPEN',
        ...EXCLUDE_INTERNAL_EVENT,
      },
      orderBy: { eventDate: 'asc' }
    });
    res.set('Cache-Control', 'public, max-age=60');

    const mapped = events.map((e) => {
      const eventDate = e.eventDate || e.createdAt;
      const isPast = eventDate < now;
      const status = isPast ? 'Ended' : e.status;
      const eligibility =
        e.eligibilityYears && e.eligibilityYears.length > 0
          ? e.eligibilityYears.map((y) => `Year ${y}`).join(', ')
          : 'All students';

      return {
        ...e,
        title: e.name,
        date: eventDate,
        type: e.type || 'GENERAL',
        eligibility,
        deadline: e.registrationEnd || e.createdAt,
        status,
        isPast,
      };
    });

    mapped.sort((a, b) => {
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return a.isPast ? timeB - timeA : timeA - timeB;
    });

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/public/events/:id - Public event detail
router.get('/public/events/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (isInternalEvent(req.params.id)) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
      return;
    }

    const event = await prisma.event.findFirst({
      where: { id: req.params.id, status: { in: ['OPEN', 'CLOSED'] } },
      include: { formFields: { orderBy: { displayOrder: 'asc' } } }
    });
    if (!event) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
      return;
    }
    const now = new Date();
    const eventDate = event.eventDate || event.createdAt;
    const isPast = eventDate < now;
    const status = isPast ? 'Ended' : event.status;
    const eligibility =
      event.eligibilityYears && event.eligibilityYears.length > 0
        ? event.eligibilityYears.map((y) => `Year ${y}`).join(', ')
        : 'All students';

    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      ...event,
      title: event.name,
      date: eventDate,
      type: event.type || 'GENERAL',
      eligibility,
      deadline: event.registrationEnd || event.createdAt,
      status,
      isPast,
      registrationFields: event.formFields
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// SVG placeholder generator for when thumbnail is unavailable
function getThumbnailPlaceholderSvg(type: string): string {
  const iconPaths: Record<string, { label: string; icon: string }> = {
    video: {
      label: 'VIDEO PREVIEW',
      icon: '<polygon points="23 7 16 12 23 17 23 7" fill="#DC2626"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none" stroke="#DC2626" stroke-width="2"/>',
    },
    resume: {
      label: 'RESUME PDF',
      icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="#DC2626" stroke-width="2"/><polyline points="14 2 14 8 20 8" fill="none" stroke="#DC2626" stroke-width="2"/><line x1="16" y1="13" x2="8" y2="13" stroke="#DC2626" stroke-width="2"/><line x1="16" y1="17" x2="8" y2="17" stroke="#DC2626" stroke-width="2"/>',
    },
    certificate: {
      label: 'VERIFIED CERTIFICATE',
      icon: '<circle cx="12" cy="8" r="7" fill="none" stroke="#DC2626" stroke-width="2"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" fill="none" stroke="#DC2626" stroke-width="2"/>',
    },
    achievement: {
      label: 'ACHIEVEMENT PROOF',
      icon: '<circle cx="12" cy="8" r="6" fill="none" stroke="#DC2626" stroke-width="2"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" fill="none" stroke="#DC2626" stroke-width="2"/>',
    },
  };

  const info = iconPaths[type] || {
    label: 'DOCUMENT',
    icon: '<rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#DC2626" stroke-width="2"/>',
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240">
  <rect width="320" height="240" fill="#0B192C"/>
  <g transform="translate(148, 85) scale(1)">
    ${info.icon}
  </g>
  <text x="160" y="145" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" letter-spacing="1" text-anchor="middle">${info.label}</text>
  <text x="160" y="165" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="600" text-anchor="middle">SASI · IT DEPARTMENT</text>
</svg>`;
}

// GET /api/media/thumbnail/:type/:id - Serve small WebP thumbnail with versioned ETag and immutable caching
router.get(
  ['/media/thumbnail/:type/:id', '/public/media/thumbnail/:type/:id'],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, id } = req.params;
      if (!id || !type) {
        res.status(400).json({ error: 'MISSING_PARAMS', message: 'Type and ID are required' });
        return;
      }

      let record: any = null;
      let driveFileId: string | null = null;
      let thumbnail: Buffer | null = null;

      if (type === 'certificate') {
        record = await prisma.certificate.findUnique({ where: { id } });
        driveFileId = record?.fileDriveId ?? null;
      } else if (type === 'achievement') {
        record = await prisma.achievement.findUnique({ where: { id } });
        driveFileId = record?.proofDriveId ?? null;
      } else if (type === 'resume') {
        record = await prisma.resume.findUnique({ where: { id } });
        driveFileId = record?.driveFileId ?? null;
      } else if (type === 'video') {
        record = await prisma.introVideo.findUnique({ where: { id } });
        driveFileId = record?.driveFileId ?? null;
        if (!record) {
          const sub = await prisma.submission.findFirst({
            where: { OR: [{ id }, { rollNo: id }] },
          });
          driveFileId = sub?.videoDriveId ?? null;
          if (driveFileId) {
            record = await prisma.introVideo.findFirst({
              where: {
                OR: [
                  { driveFileId },
                  { student: { rollNo: sub?.rollNo || id } },
                ],
              },
            });
          }
        }

        const requestedVersion = typeof req.query.v === 'string' ? req.query.v.trim() : null;
        if (requestedVersion && requestedVersion.length > 0) {
          driveFileId = requestedVersion;
        }

        // If video was deleted or has no driveFileId, return placeholder SVG immediately rather than serving a stale or cached thumbnail
        if (!driveFileId || !driveFileId.trim()) {
          const svg = getThumbnailPlaceholderSvg('video');
          res.setHeader('Content-Type', 'image/svg+xml');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.status(200).send(svg);
          return;
        }
      }

      // Only use stored thumbnail if it matches the current driveFileId and no force-refresh query is present
      if (!req.query.t && record?.thumbnail) {
        const matchesCurrentVideo = !record.driveFileId || !driveFileId || record.driveFileId === driveFileId;
        if (matchesCurrentVideo) {
          thumbnail = Buffer.isBuffer(record.thumbnail)
            ? record.thumbnail
            : Buffer.from(record.thumbnail);
        }
      }

      const versionKey = driveFileId || id;
      const etag = `"${versionKey}"`;

      if (req.headers['if-none-match'] === etag && !req.query.t) {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        res.setHeader('ETag', etag);
        res.status(304).end();
        return;
      }

      // If thumbnail is not pre-stored but Drive file exists:
      // For certificate/achievement, avoid canvas/pdfjs errors by serving the file directly if it's an image, or falling back to SVG.
      if (!thumbnail && driveFileId) {
        if (type === 'certificate' || type === 'achievement') {
          try {
            const { stream, mimeType } = await driveService.streamDriveFile(driveFileId);
            if (mimeType && mimeType.startsWith('image/')) {
              res.setHeader('Content-Type', mimeType);
              res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
              res.setHeader('ETag', etag);
              stream.pipe(res);
              return;
            }
          } catch (streamErr) {
            // Safe fallback to placeholder SVG below
          }
        } else {
          try {
            const generated = await driveService.generateThumbnail(
              driveFileId,
              type as 'video' | 'resume',
            );
            if (generated) {
              thumbnail = generated;
              if (type === 'resume') {
                await prisma.resume.update({ where: { id }, data: { thumbnail: generated } }).catch(() => {});
              } else if (type === 'video') {
                if (record?.id) {
                  await prisma.introVideo.update({ where: { id: record.id }, data: { thumbnail: generated } }).catch(() => {});
                } else {
                  await prisma.introVideo.updateMany({
                    where: { driveFileId },
                    data: { thumbnail: generated },
                  }).catch(() => {});
                }
              }
            }
          } catch (genErr) {
            console.warn(`[thumbnail] Lazy generation failed for ${type}/${id}:`, genErr);
          }
        }
      }

      if (thumbnail) {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        res.setHeader('ETag', etag);
        res.setHeader('Content-Type', 'image/webp');
        res.status(200).send(thumbnail);
      } else {
        const svg = getThumbnailPlaceholderSvg(type);
        res.setHeader('Content-Type', 'image/svg+xml');
        // Do NOT cache fallback placeholder so fresh thumbnail displays as soon as ready!
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).send(svg);
      }
    } catch (err: any) {
      console.warn(`[thumbnail] Error serving thumbnail ${req.params?.type}/${req.params?.id}:`, err?.message || err);
      if (!res.headersSent) {
        const svg = getThumbnailPlaceholderSvg(req.params?.type || 'document');
        res.setHeader('Content-Type', 'image/svg+xml');
        res.status(200).send(svg);
      }
    }
  },
);

// GET /api/public/media/:type/:fileId - Public streaming proxy for photos, resumes, certificates, and videos
router.get('/public/media/:type/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, fileId } = req.params;
    if (!fileId) {
      res.status(400).json({ error: 'MISSING_FILE_ID', message: 'File ID is required' });
      return;
    }

    const cacheKey = `${type}:${fileId}`;
    if (req.query.t || req.query.v) {
      mediaDriveIdCache.delete(cacheKey);
    }
    let resolvedDriveId: string | null = mediaDriveIdCache.get(cacheKey) || null;
    if (!resolvedDriveId && (fileId.startsWith('mock_') || fileId.startsWith('drive_'))) {
      resolvedDriveId = fileId;
      mediaDriveIdCache.set(cacheKey, fileId);
    } else if (!resolvedDriveId) {
      try {
      if (type === 'certificate') {
        const cert = await prisma.certificate.findUnique({ where: { id: fileId } });
        if (cert?.fileDriveId) resolvedDriveId = cert.fileDriveId;
      } else if (type === 'achievement') {
        const ach = await prisma.achievement.findUnique({ where: { id: fileId } });
        if (ach?.proofDriveId) resolvedDriveId = ach.proofDriveId;
      } else if (type === 'resume') {
        const resRec = await prisma.resume.findUnique({ where: { id: fileId } });
        if (resRec?.driveFileId) resolvedDriveId = resRec.driveFileId;
      } else if (type === 'photo') {
        const prof = await prisma.studentProfile.findFirst({
          where: { OR: [{ id: fileId }, { studentId: fileId }] },
        });
        if (prof?.photoDriveId) resolvedDriveId = prof.photoDriveId;
      } else if (type === 'video') {
        const vid = await prisma.introVideo.findFirst({
          where: { OR: [{ id: fileId }, { studentId: fileId }] },
        });
        if (vid?.driveFileId) {
          resolvedDriveId = vid.driveFileId;
        } else {
          const sub = await prisma.submission.findFirst({
            where: { OR: [{ id: fileId }, { rollNo: fileId }] },
          });
          if (sub?.videoDriveId) resolvedDriveId = sub.videoDriveId;
        }
      }
    } catch (lookupErr) {
      console.warn(`[public media] DB lookup error for ${type}/${fileId}:`, lookupErr);
    }
    if (resolvedDriveId) {
      mediaDriveIdCache.set(cacheKey, resolvedDriveId);
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

    // Redirect rather than proxy, for the one payload that is large enough to
    // matter: video. A 25 MB intro video streamed through this process costs an
    // inbound Drive read plus an outbound write per viewer, so concurrent
    // viewers compete for this instance's bandwidth no matter how fast the
    // database is. A 302 hands the transfer to Drive's CDN instead.
    //
    // Videos only, deliberately:
    //   - PDFs and images are small, and this route is also what renders a
    //     resume inside an iframe. Drive answers `export=download` with an
    //     attachment disposition, which would turn inline viewing into a
    //     download. Small payloads are not the bottleneck.
    //   - The permission check keeps the proxy as a fallback, so a file that is
    //     not `anyone`-readable still streams rather than 403ing from Drive.
    //
    // Deliberately NOT gated on `resolvedDriveId`. Admin moderation plays
    // videos by raw Drive id (`admin.api.routes.ts` builds
    // `/api/public/media/video/<driveFileId>`), which matches no database id, so
    // requiring a resolved row disabled the redirect for the one caller that
    // streams 25 MB files — while the lookup ran anyway.
    //
    // Amplification from caller-chosen ids is bounded instead by caching the
    // failure: `isPubliclyReadable` remembers an id it could not confirm, so a
    // bogus id costs one `permissions.list` per window rather than one per
    // request. The pre-existing streaming path already spent outbound calls on
    // the same ids, so this does not widen the surface.
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
          console.warn(`[PublicMedia] Direct link probe failed for ${targetDriveFileId} (${type}), falling back to proxy stream`);
        }
      }
      // Not publicly readable (or a failed check): fall through to streaming,
      // which authenticates as the service account and still works.
    }

    const rangeHeader = req.headers.range;

    // Honour Range requests so <video> can seek instead of buffering the whole
    // file. The byte range is fetched from storage, so the body always matches
    // the advertised Content-Range.
    const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
      targetDriveFileId,
      undefined,
      rangeHeader,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('ETag', etag);

    // Allow PDF documents and media to be rendered inside portal iframes
    res.removeHeader('X-Frame-Options');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' data: blob: https:; frame-ancestors 'self' https://*.netlify.app https://*.onrender.com https://*.vercel.app http://localhost:* http://127.0.0.1:*;"
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
    console.warn(`[public media] Could not stream media ${req.params?.type}/${req.params?.fileId}:`, err?.message || err);
    if (!res.headersSent) {
      const type = req.params?.type;
      const fileId = req.params?.fileId || 'document';

      if (type === 'certificate' || type === 'achievement' || type === 'resume') {
        const docTitle =
          type === 'certificate'
            ? 'Certificate Document'
            : type === 'achievement'
            ? 'Achievement Proof'
            : 'Resume Document';
        const subtitle =
          type === 'certificate'
            ? 'Course Completion / Certification Record'
            : type === 'achievement'
            ? 'Achievement Verification Document'
            : 'Curriculum Vitae';

        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" width="100%" height="100%">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#DC2626"/>
      <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <rect width="800" height="520" rx="16" fill="url(#cardBg)" stroke="#334155" stroke-width="2"/>
  <rect x="30" y="30" width="740" height="460" rx="12" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="8 6"/>
  <rect x="30" y="30" width="740" height="6" rx="3" fill="url(#accent)"/>

  <circle cx="400" cy="140" r="44" fill="#1E293B" stroke="#334155" stroke-width="2"/>
  <circle cx="400" cy="140" r="34" fill="url(#gold)" opacity="0.15"/>
  <path d="M400 115 L407 130 L424 132 L411 144 L415 160 L400 151 L385 160 L389 144 L376 132 L393 130 Z" fill="url(#gold)"/>

  <text x="400" y="220" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" fill="#F8FAFC" text-anchor="middle">${docTitle}</text>
  <text x="400" y="248" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#94A3B8" text-anchor="middle">${subtitle}</text>

  <line x1="280" y1="275" x2="520" y2="275" stroke="#334155" stroke-width="1.5"/>

  <rect x="305" y="300" width="190" height="30" rx="15" fill="#1E293B" stroke="#38BDF8" stroke-width="1.5"/>
  <circle cx="323" cy="315" r="4" fill="#38BDF8"/>
  <text x="408" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#38BDF8" text-anchor="middle">DOCUMENT ON RECORD</text>

  <text x="400" y="365" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#E2E8F0" text-anchor="middle">Student verification document received</text>
  <text x="400" y="390" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748B" text-anchor="middle">Ref ID: ${fileId}</text>
  <text x="400" y="425" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94A3B8" text-anchor="middle">Submitted via ELITE Student Portal • Ready for administrative review</text>
</svg>
        `.trim();

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.removeHeader('X-Frame-Options');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self' data: blob: https:; frame-ancestors 'self' https://*.netlify.app https://*.onrender.com https://*.vercel.app http://localhost:* http://127.0.0.1:*;"
        );
        res.status(200).send(svg);
        return;
      }

      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: 'Requested media could not be found or loaded.' });
    }
  }
});

export default router;
