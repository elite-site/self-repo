import { Request, Response } from 'express';
import { BRANCHES, SECTIONS, YEARS, INTERNAL_EVENT_ID } from '../../../config/constants';
import { env } from '../../../config/env';
import * as repo from '../public.repository';
import * as service from '../public.service';
import { driveService } from '../../media/drive';
import { ActivityService } from '../../admin';
import { ValidationService } from '../../../services/validation.service';
import { logger } from '../../../utils/logger';
import { ConflictError, ValidationError } from '../../../utils/appError';

const EVENT_ID = INTERNAL_EVENT_ID;
const EVENT_NAME = 'Self Introduction';

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
  const mapped = await service.getPublicEventsList();
  res.set('Cache-Control', 'public, max-age=60');
  res.json(mapped);
}

export async function getPublicEventById(req: Request, res: Response): Promise<void> {
  const result = await service.getPublicEventDetail(req.params.id);
  res.set('Cache-Control', 'public, max-age=60');
  res.json(result);
}

export async function submitLegacyApplication(req: Request, res: Response): Promise<void> {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  const rollNo = (req.body.rollNo || '').trim().toUpperCase();
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const phoneNo = (req.body.phoneNo || '').trim();
  const section = String(req.body.section || '').trim().toUpperCase();
  const year = parseInt(String(req.body.year || ''), 10);
  const branch = 'IT';

  if (!rollNo) {
    throw new ValidationError('Roll number is required.', [
      { field: 'rollNo', message: 'Roll number is required.' },
    ]);
  }
  if (!name || name.length < 2 || name.length > 100) {
    throw new ValidationError('Please enter your full name.', [
      { field: 'name', message: 'Please enter your full name.' },
    ]);
  }
  if (!YEARS.includes(year as any)) {
    throw new ValidationError(`Invalid year. Available options: ${YEARS.join(', ')}.`, [
      { field: 'year', message: `Invalid year. Available options: ${YEARS.join(', ')}.` },
    ]);
  }
  if (!SECTIONS.includes(section as any)) {
    throw new ValidationError(`Invalid section. Available options: ${SECTIONS.join(', ')}.`, [
      { field: 'section', message: `Invalid section. Available options: ${SECTIONS.join(', ')}.` },
    ]);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new ValidationError('Please enter a valid email address.', [
      { field: 'email', message: 'Please enter a valid email address.' },
    ]);
  }
  if (!/^\+?\d{10,15}$/.test(phoneNo)) {
    throw new ValidationError('Please enter a valid phone number (10–15 digits).', [
      { field: 'phoneNo', message: 'Please enter a valid phone number (10–15 digits).' },
    ]);
  }

  const videoFile = files?.video?.[0];
  if (!videoFile) {
    throw new ValidationError('Self introduction video is required.', [
      { field: 'video', message: 'Self introduction video is required.' },
    ]);
  }

  const vVideo = await ValidationService.validateVideo(videoFile.buffer, videoFile.originalname, videoFile.size);
  if (!vVideo.valid) {
    ActivityService.logNonBlocking({
      eventId: EVENT_ID,
      category: 'FILE_UPLOAD',
      action: 'File validation failed (Video)',
      details: vVideo.error,
      applicantName: name,
      userEmail: email,
      status: 'ERROR',
      errorMessage: vVideo.error,
    });
    const message = vVideo.error || 'Video validation failed.';
    throw new ValidationError(message, [{ field: 'video', message }]);
  }

  const existing = await repo.findSubmissionByEventAndStudent(EVENT_ID, rollNo, year, branch, section);
  if (existing && existing.videoDriveId) {
    ActivityService.logNonBlocking({
      eventId: EVENT_ID,
      category: 'APPLICATION',
      action: 'Submission rejected (Video already uploaded)',
      details: `Roll Number: ${rollNo}`,
      applicantName: name,
      userEmail: email,
      status: 'WARNING',
    });
    throw new ConflictError(
      `A self introduction video has already been submitted for roll number ${rollNo}. You can upload again only if the admin removes the current video.`,
      'DUPLICATE_VIDEO',
    );
  }

  try {
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
          } catch (err) {
            // Non-fatal: the submission is already stored and must succeed even
            // when the optional thumbnail cannot be generated.
            logger.warn('Failed generating video thumbnail for submission', { error: err });
          }
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
        // Non-fatal: mirroring the submission into the intro-video table is a
        // convenience sync; the submission itself is already committed.
        logger.warn('[public submit] introVideo sync notice', { error: syncErr });
      }
    }

    ActivityService.logNonBlocking({
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
    logger.error('Application submission failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    ActivityService.logNonBlocking({
      eventId: EVENT_ID,
      category: 'APPLICATION',
      action: 'Application submission failed',
      details: err?.message || 'Unexpected server error',
      applicantName: name,
      userEmail: email || rollNo,
      status: 'ERROR',
      errorMessage: err?.stack || err?.message,
    });

    if (err?.code === 'P2002') {
      throw new ConflictError('An entry with this roll number already exists.', 'DUPLICATE_SUBMISSION');
    }
    throw err;
  }
}
