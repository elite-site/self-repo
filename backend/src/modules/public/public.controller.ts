import { Request, Response } from 'express';
import { BRANCHES, SECTIONS, YEARS, EXCLUDE_INTERNAL_EVENT, isInternalEvent, INTERNAL_EVENT_ID } from '../../config/constants';
import { env } from '../../config/env';
import * as repo from './public.repository';
import * as service from './public.service';
import { driveService } from '../../services/drive.service';
import { ActivityService } from '../../services/activity.service';
import { ValidationService } from '../../services/validation.service';

const EVENT_ID = INTERNAL_EVENT_ID;
const EVENT_NAME = 'Self Introduction';
const REDIRECTABLE_TYPES = new Set(['video']);

export function getBranches(_req: Request, res: Response) {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ branches: BRANCHES });
}

export function getSections(_req: Request, res: Response) {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ sections: SECTIONS });
}

export function getYears(_req: Request, res: Response) {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ years: YEARS });
}

export async function getPublicEvents(_req: Request, res: Response): Promise<void> {
  try {
    const mapped = await service.getPublicEventsList();
    res.set('Cache-Control', 'public, max-age=60');
    res.json(mapped);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getPublicEventById(req: Request, res: Response): Promise<void> {
  try {
    const result = await service.getPublicEventDetail(req.params.id);
    res.set('Cache-Control', 'public, max-age=60');
    res.json(result);
  } catch (err: any) {
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function submitLegacyApplication(req: Request, res: Response): Promise<void> {
  let currentRollNo = '';
  let currentStudentName = '';
  let currentStudentEmail = '';

  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

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

    const dbEvent = await repo.findEventById(EVENT_ID);
    if (!dbEvent) {
      await repo.createEventRecord({
        id: EVENT_ID,
        name: EVENT_NAME,
        slug: 'self-introduction',
        year: env.EVENT_YEAR,
        status: 'OPEN',
      });
    }

    const videoFile = files?.video?.[0];
    if (!videoFile) {
      res.status(400).json({ error: 'VALIDATION_ERROR', field: 'video', message: 'Self introduction video is required.' });
      return;
    }

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

    const existing = await repo.findSubmissionByEventAndStudent(EVENT_ID, rollNo, year, branch, section);
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

    let submission;
    if (existing) {
      submission = await repo.updateSubmissionRecord(existing.id, {
        name,
        section,
        year,
        email,
        phoneNo,
        videoDriveId: uploadResult.videoDriveId || null,
        driveFolderPath: uploadResult.driveFolderPath,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      });
    } else {
      submission = await repo.createSubmissionRecord({
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
      });
    }

    if (uploadResult.videoDriveId) {
      try {
        const student = await repo.findStudentForSubmissionSync(rollNo, email);
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
          const iv = await repo.findIntroVideoByStudent(student.id);
          if (iv) {
            await repo.updateIntroVideoRecord(iv.id, ivData);
          } else {
            await repo.createIntroVideoRecord({ studentId: student.id, ...ivData });
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
      res.status(409).json({ error: 'DUPLICATE_SUBMISSION', message: 'An entry with this roll number already exists.' });
      return;
    }
    res.status(500).json({ error: 'SUBMISSION_FAILED', message: 'An error occurred while uploading your submission. Please try again.' });
  }
}

export async function getMediaThumbnail(req: Request, res: Response): Promise<void> {
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
      record = await repo.findCertificateById(id);
      driveFileId = record?.fileDriveId ?? null;
    } else if (type === 'achievement') {
      record = await repo.findAchievementById(id);
      driveFileId = record?.proofDriveId ?? null;
    } else if (type === 'resume') {
      record = await repo.findResumeById(id);
      driveFileId = record?.driveFileId ?? null;
    } else if (type === 'video') {
      record = await repo.findIntroVideoById(id);
      driveFileId = record?.driveFileId ?? null;
      if (!record) {
        const sub = await repo.findSubmissionByIdOrRollNo(id);
        driveFileId = sub?.videoDriveId ?? null;
        if (driveFileId) {
          const iv = await repo.findIntroVideoByStudent(sub?.rollNo || id);
          if (iv) record = iv;
        }
      }

      const requestedVersion = typeof req.query.v === 'string' ? req.query.v.trim() : null;
      if (requestedVersion && requestedVersion.length > 0) {
        driveFileId = requestedVersion;
      }

      if (!driveFileId || !driveFileId.trim()) {
        const svg = service.getThumbnailPlaceholderSvg('video');
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).send(svg);
        return;
      }
    }

    if (!req.query.t && record?.thumbnail) {
      const matchesCurrentVideo = !record.driveFileId || !driveFileId || record.driveFileId === driveFileId;
      if (matchesCurrentVideo) {
        thumbnail = Buffer.isBuffer(record.thumbnail) ? record.thumbnail : Buffer.from(record.thumbnail);
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
        } catch {}
      } else {
        try {
          const generated = await driveService.generateThumbnail(driveFileId, type as 'video' | 'resume');
          if (generated) {
            thumbnail = generated;
            if (type === 'resume') {
              await repo.updateResumeThumbnail(id, generated);
            } else if (type === 'video') {
              if (record?.id) {
                await repo.updateVideoThumbnail(record.id, generated);
              } else {
                await repo.updateVideoThumbnailByDriveId(driveFileId, generated);
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
      const svg = service.getThumbnailPlaceholderSvg(type);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).send(svg);
    }
  } catch (err: any) {
    console.warn(`[thumbnail] Error serving thumbnail:`, err?.message || err);
    if (!res.headersSent) {
      const svg = service.getThumbnailPlaceholderSvg(req.params?.type || 'document');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.status(200).send(svg);
    }
  }
}

export async function streamPublicMedia(req: Request, res: Response): Promise<void> {
  try {
    const { type, fileId } = req.params;
    if (!fileId) {
      res.status(400).json({ error: 'MISSING_FILE_ID', message: 'File ID is required' });
      return;
    }

    const cacheKey = `${type}:${fileId}`;
    if (req.query.t || req.query.v) {
      service.mediaDriveIdCache.delete(cacheKey);
    }
    let resolvedDriveId: string | null = service.mediaDriveIdCache.get(cacheKey) || null;
    if (!resolvedDriveId && (fileId.startsWith('mock_') || fileId.startsWith('drive_'))) {
      resolvedDriveId = fileId;
      service.mediaDriveIdCache.set(cacheKey, fileId);
    } else if (!resolvedDriveId) {
      try {
        if (type === 'certificate') {
          const cert = await repo.findCertificateById(fileId);
          if (cert?.fileDriveId) resolvedDriveId = cert.fileDriveId;
        } else if (type === 'achievement') {
          const ach = await repo.findAchievementById(fileId);
          if (ach?.proofDriveId) resolvedDriveId = ach.proofDriveId;
        } else if (type === 'resume') {
          const resRec = await repo.findResumeById(fileId);
          if (resRec?.driveFileId) resolvedDriveId = resRec.driveFileId;
        } else if (type === 'photo') {
          const prof = await repo.findStudentProfileByIdOrStudent(fileId);
          if (prof?.photoDriveId) resolvedDriveId = prof.photoDriveId;
        } else if (type === 'video') {
          const vid = await repo.findIntroVideoForPublicMedia(fileId);
          if (vid?.driveFileId) {
            resolvedDriveId = vid.driveFileId;
          } else {
            const sub = await repo.findSubmissionByIdOrRollNo(fileId);
            if (sub?.videoDriveId) resolvedDriveId = sub.videoDriveId;
          }
        }
      } catch (lookupErr) {
        console.warn(`[public media] DB lookup error for ${type}/${fileId}:`, lookupErr);
      }
      if (resolvedDriveId) {
        service.mediaDriveIdCache.set(cacheKey, resolvedDriveId);
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

    const forceStream = req.query.stream === '1' || req.query.stream === 'true' || req.query.proxy === 'true' || req.query.proxy === '1';
    if (!forceStream && REDIRECTABLE_TYPES.has(type) && driveService.canRedirectToDrive()) {
      const directLink = driveService.getDirectLink(targetDriveFileId);
      if (directLink && (await driveService.isPubliclyReadable(targetDriveFileId))) {
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.setHeader('ETag', etag);
        res.redirect(302, directLink);
        return;
      }
    }

    const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
      targetDriveFileId,
      undefined,
      req.headers.range,
    );

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('ETag', etag);

    if (contentRange) {
      res.setHeader('Content-Range', `bytes ${contentRange.start}-${contentRange.end}/${contentRange.total}`);
      res.setHeader('Content-Length', String(contentRange.end - contentRange.start + 1));
      res.status(206);
    } else if (size !== undefined) {
      res.setHeader('Content-Length', String(size));
      res.status(200);
    } else {
      res.status(200);
    }

    stream.on('error', () => {
      if (!res.headersSent) res.status(500);
      res.end();
    });
    stream.pipe(res);
  } catch (err: any) {
    console.error('Error streaming public media:', err);
    if (!res.headersSent) {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: 'Requested media could not be found or loaded.' });
    }
  }
}

// Public Students Controllers
export async function listPublicStudents(req: Request, res: Response): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    const { search, year, section, skills, skillName, status } = req.query;

    const where: any = {};
    if (status === 'ACTIVE' || status === 'GRADUATED') {
      where.status = status;
    } else if (status) {
      where.status = { in: [] };
    } else {
      where.status = { in: ['ACTIVE', 'GRADUATED'] };
    }

    if (year && year !== 'ALL') {
      const parsedYear = parseInt(String(year), 10);
      if (!isNaN(parsedYear)) where.year = parsedYear;
    }

    if (section && section !== 'ALL') {
      where.section = String(section);
    }

    if (search) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { rollNo: { contains: term, mode: 'insensitive' } },
        {
          profile: {
            skills: {
              some: {
                skill: { name: { contains: term, mode: 'insensitive' } }
              }
            }
          }
        }
      ];
    }

    const skillsFilter = skills || skillName;
    if (skillsFilter) {
      const skillsArray = (Array.isArray(skillsFilter) ? skillsFilter : [skillsFilter]).map(String);
      where.profile = {
        ...where.profile,
        skills: {
          some: {
            OR: [
              { skillId: { in: skillsArray } },
              { skill: { name: { in: skillsArray, mode: 'insensitive' } } }
            ]
          }
        }
      };
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const cacheKey = JSON.stringify([
      'students',
      status || '',
      year || '',
      section || '',
      search ? String(search).trim() : '',
      skillName ? String(skillName).trim() : '',
      skillsFilter ?? [],
      page,
      limit,
    ]);

    const payload = await service.studentListCache.wrap(cacheKey, async () => {
      const [total, students] = await Promise.all([
        repo.countPublicStudents(where),
        repo.findPublicStudents(where, skip, limit),
      ]);

      const mapped = students.map((s) => {
        const profile = s.profile ? {
          ...s.profile,
          photoUrl: s.profile.photoUrl ? `/api/public/media/photo/${s.profile.id || s.id}` : null,
          viewUrl: s.profile.photoUrl ? `/api/public/media/photo/${s.profile.id || s.id}` : null,
        } : null;
        return { ...s, profile };
      });

      return {
        students: mapped,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    });

    res.json(payload);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function listPublicSkills(_req: Request, res: Response): Promise<void> {
  try {
    const skills = await service.skillsCache.wrap('all', () => repo.findActiveSkills());
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(skills);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getPublicStudentsEvents(_req: Request, res: Response): Promise<void> {
  try {
    const events = await repo.findPublicStudentEvents();
    res.set('Cache-Control', 'public, max-age=60');
    res.json(events);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getPublicStudentByRollNo(req: Request, res: Response): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    const student = await service.studentProfileCache.wrap(
      req.params.rollNo,
      () => repo.loadPublicProfile(req.params.rollNo),
    );
    if (!student || (student.status !== 'ACTIVE' && student.status !== 'GRADUATED')) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
      return;
    }

    const introVideo = student.introVideos?.[0];
    const isApprovedIntroVideo = Boolean(
      introVideo &&
      introVideo.status === 'APPROVED' &&
      introVideo.isPublic === true &&
      introVideo.driveFileId !== null
    );

    const maskedProfile = student.profile ? {
      ...student.profile,
      photoDriveId: undefined,
      photoUrl: (student.profile.photoDriveId || student.profile.photoUrl)
        ? `/api/public/media/photo/${student.profile.id || student.id}`
        : null,
      viewUrl: (student.profile.photoDriveId || student.profile.photoUrl)
        ? `/api/public/media/photo/${student.profile.id || student.id}`
        : null,
    } : null;

    const studentWithProofs = {
      ...student,
      profile: maskedProfile,
      introVideos: undefined,
      introVideo: isApprovedIntroVideo
        ? {
            id: introVideo!.id,
            submittedAt: introVideo!.submittedAt,
            publishedAt: introVideo!.publishedAt,
            sizeMb: introVideo!.sizeMb,
            streamUrl: `/api/public/videos/stream/${introVideo!.id}`,
            thumbnailUrl: introVideo!.driveFileId
              ? `/api/public/media/thumbnail/video/${introVideo!.id}?v=${encodeURIComponent(introVideo!.driveFileId)}`
              : null,
            driveFileId: introVideo!.driveFileId || null,
            previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(introVideo!.driveFileId) : null,
          }
        : null,
      achievements: student.achievements.map((a: any) => {
        const { proofDriveId: _p, ...rest } = a;
        const viewUrl = a.proofDriveId
          ? `/api/public/media/achievement/${a.id}`
          : (a.proofUrl || null);
        const previewUrl = driveService.getPreviewUrl(a.proofDriveId);
        const thumbnailUrl = a.proofDriveId
          ? `/api/public/media/thumbnail/achievement/${a.id}?v=${encodeURIComponent(a.proofDriveId)}`
          : null;
        return {
          ...rest,
          viewUrl,
          proofUrl: viewUrl,
          previewUrl,
          driveFileId: a.proofDriveId || null,
          thumbnailUrl,
        };
      }),
      projects: (student.projects || [])
        .filter((p: any) => p.status === 'APPROVED' && p.isPublic === true)
        .map((p: any) => ({
          ...p,
          techStack: p.technologies || [],
          videoUrl: p.driveVideoUrl || null,
        })),
      githubAccount: student.githubAccount || null,
      githubProjects: (student.githubRepos || []).map((r: any) => ({
        id: r.id,
        githubRepoId: String(r.githubRepoId),
        title: r.name,
        name: r.name,
        description: r.description,
        readmeExcerpt: r.readmeExcerpt || null,
        githubUrl: r.htmlUrl,
        stars: r.stars,
        primaryLanguage: r.primaryLanguage,
        languages: r.languages,
        commitCount: r.commitCount,
        isFork: r.isFork,
        showcaseRank: r.showcaseRank,
        source: 'GITHUB',
      })),
      githubSkills: (student.githubSkills || []).map((s: any) => ({
        id: s.id,
        skillId: s.skillId,
        name: s.skill?.name || '',
        category: s.skill?.category || null,
        repoCount: s.repoCount,
      })),
      certificates: student.certificates.map((c: any) => {
        const { fileDriveId: _f, ...rest } = c;
        const viewUrl = c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null;
        const previewUrl = driveService.getPreviewUrl(c.fileDriveId);
        const thumbnailUrl = c.fileDriveId
          ? `/api/public/media/thumbnail/certificate/${c.id}?v=${encodeURIComponent(c.fileDriveId)}`
          : null;
        return {
          ...rest,
          issueDate: c.issuedAt || null,
          viewUrl,
          fileUrl: viewUrl,
          previewUrl,
          driveFileId: c.fileDriveId || null,
          thumbnailUrl,
        };
      }),
      resumes: student.resumes.map((r: any) => {
        const { driveFileId: _d, ...rest } = r;
        const viewUrl = r.driveFileId ? `/api/public/media/resume/${r.id}` : null;
        const previewUrl = driveService.getPreviewUrl(r.driveFileId);
        const thumbnailUrl = r.driveFileId
          ? `/api/public/media/thumbnail/resume/${r.id}?v=${encodeURIComponent(r.driveFileId)}`
          : null;
        return {
          ...rest,
          viewUrl,
          fileUrl: viewUrl,
          previewUrl,
          driveFileId: r.driveFileId || null,
          thumbnailUrl,
        };
      }),
    };
    res.json(studentWithProofs);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getPublicStudentResume(req: Request, res: Response): Promise<void> {
  try {
    const student = await repo.findPublicStudentWithResume(req.params.rollNo);
    if (!student || (student.status !== 'ACTIVE' && student.status !== 'GRADUATED') || !student.resumes.length) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Resume not available' });
      return;
    }

    const resume = student.resumes[0];
    if (!resume.driveFileId) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Resume file not available' });
      return;
    }
    res.redirect(`/api/public/media/resume/${resume.id}`);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

// Public Videos Controllers
const PUBLIC_VIDEO_WHERE = {
  status: 'APPROVED' as const,
  isPublic: true,
  isActive: true,
};

export async function listPublicVideos(req: Request, res: Response): Promise<void> {
  try {
    const rawLimit = parseInt(String(req.query.limit), 10);
    const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 24 : Math.min(rawLimit, 60);

    const payload = await service.videoListCache.wrap(`list:${limit}`, () =>
      repo.listPublishedVideos(limit, PUBLIC_VIDEO_WHERE).then(({ items, total }) => ({
        items: items.map(service.serializePublicVideo),
        total,
      }))
    );

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (err: any) {
    console.error('Error fetching public videos:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getFeaturedPublicVideos(_req: Request, res: Response): Promise<void> {
  try {
    const payload = await service.videoListCache.wrap('featured:6', () =>
      repo.listPublishedVideos(6, PUBLIC_VIDEO_WHERE).then(({ items, total }) => ({
        items: items.map(service.serializePublicVideo),
        total,
      }))
    );

    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(payload);
  } catch (err: any) {
    console.error('Error fetching featured public videos:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function streamPublicVideo(req: Request, res: Response): Promise<void> {
  try {
    let fileId = service.videoFileIdCache.get(req.params.id);

    if (!fileId) {
      const video = await repo.findPublishedVideoById(req.params.id, PUBLIC_VIDEO_WHERE);
      if (!video?.driveFileId) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'This video is not published.' });
        return;
      }
      fileId = video.driveFileId;
      service.videoFileIdCache.set(req.params.id, fileId);
    }

    const etag = `"${req.params.id}"`;

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    const forceStream = req.query.stream === '1' || req.query.stream === 'true' || req.query.proxy === 'true' || req.query.proxy === '1';
    const directLink = driveService.getDirectLink(fileId);
    if (!forceStream && directLink && (await driveService.isPubliclyReadable(fileId))) {
      const probeOk = await driveService.probeDirectLink(directLink, fileId);
      if (probeOk) {
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('ETag', etag);
        res.redirect(302, directLink);
        return;
      } else {
        console.warn(`[PublicVideos] Direct link probe failed for ${fileId}, falling back to proxy stream`);
      }
    }

    const { stream, mimeType, size, contentRange } = await driveService.streamDriveFile(
      fileId,
      undefined,
      req.headers.range,
    );

    res.setHeader('Content-Type', mimeType || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('ETag', etag);

    if (contentRange) {
      res.setHeader('Content-Range', `bytes ${contentRange.start}-${contentRange.end}/${contentRange.total}`);
      res.setHeader('Content-Length', String(contentRange.end - contentRange.start + 1));
      res.status(206);
    } else if (size !== undefined) {
      res.setHeader('Content-Length', String(size));
      res.status(200);
    } else {
      res.status(200);
    }

    stream.on('error', () => {
      if (!res.headersSent) res.status(500);
      res.end();
    });
    stream.pipe(res);
  } catch (err: any) {
    console.error('Error streaming public video:', err);
    if (!res.headersSent) {
      res.status(404).json({ error: 'MEDIA_NOT_FOUND', message: 'Requested media could not be found or loaded.' });
    }
  }
}
