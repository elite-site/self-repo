import { Request, Response } from 'express';
import crypto from 'crypto';
import * as repo from '../public.repository';
import * as service from '../public.service';
import { driveService } from '../../media/drive';
import { dbTimingStorage } from '../../../infrastructure/dbTiming';
import { NotFoundError } from '../../../utils/appError';

async function runWithTiming(fn: () => Promise<void>): Promise<void> {
  if (dbTimingStorage && typeof dbTimingStorage.run === 'function') {
    return dbTimingStorage.run({ dbDuration: 0 }, fn);
  }
  return fn();
}

export async function getPublicStudentsIndex(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

  const cached = service.studentIndexCache.get('public_index');
  if (cached) {
    res.setHeader('ETag', cached.etag);
    res.setHeader('Server-Timing', 'db;dur=0');
    if (req.headers['if-none-match'] === cached.etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(cached.body);
    return;
  }

  await runWithTiming(async () => {
    const dbStart = Date.now();
    const students = await repo.findPublicStudentsIndex();
    const store = dbTimingStorage?.getStore?.();
    const dbDur = store?.dbDuration !== undefined && store.dbDuration > 0
      ? store.dbDuration
      : (Date.now() - dbStart);

    const compactRows = students.map((s) => ({
      id: s.id,
      rollNo: s.rollNo,
      name: s.name,
      year: s.year,
      section: s.section,
      status: s.status,
      profile: s.profile ? {
        id: s.profile.id,
        photoUrl: s.profile.photoUrl ? `/api/public/media/photo/${s.profile.id || s.id}` : null,
        photoOffsetX: s.profile.photoOffsetX ?? null,
        photoOffsetY: s.profile.photoOffsetY ?? null,
        photoZoom: s.profile.photoZoom ?? null,
      } : null,
      skills: s.profile?.skills?.map((sk: any) => sk.skill?.name).filter(Boolean) || [],
    }));

    const body = JSON.stringify(compactRows);
    const hash = crypto.createHash('md5').update(body).digest('hex');
    const etag = `"${hash}"`;

    service.studentIndexCache.set('public_index', { body, etag });

    res.setHeader('ETag', etag);
    res.setHeader('Server-Timing', `db;dur=${dbDur}`);

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(body);
  });
}

export async function listPublicStudents(req: Request, res: Response): Promise<void> {
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
    if (term.length >= 2) {
      if (/^\d+$/.test(term)) {
        where.rollNo = { contains: term, mode: 'insensitive' };
      } else {
        const nonNumericCount = term.replace(/[0-9]/g, '').length;
        const orConditions: any[] = [
          { name: { contains: term, mode: 'insensitive' } },
          { rollNo: { contains: term, mode: 'insensitive' } },
        ];
        if (nonNumericCount >= 3) {
          orConditions.push({
            profile: {
              skills: {
                some: {
                  skill: { name: { contains: term, mode: 'insensitive' } }
                }
              }
            }
          });
        }
        where.OR = orConditions;
      }
    }
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

  await runWithTiming(async () => {
    const dbStart = Date.now();
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

    const store = dbTimingStorage?.getStore?.();
    const dbDur = store?.dbDuration !== undefined && store.dbDuration > 0
      ? store.dbDuration
      : (Date.now() - dbStart);
    res.setHeader('Server-Timing', `db;dur=${dbDur}`);
    res.json(payload);
  });
}

export async function listPublicSkills(_req: Request, res: Response): Promise<void> {
  const skills = await service.skillsCache.wrap('all', () => repo.findActiveSkills());
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(skills);
}

export async function getPublicStudentsEvents(_req: Request, res: Response): Promise<void> {
  const events = await repo.findPublicStudentEvents();
  res.set('Cache-Control', 'public, max-age=60');
  res.json(events);
}

export async function getPublicStudentByRollNo(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'public, max-age=60');
  const student = await service.studentProfileCache.wrap(
    req.params.rollNo,
    () => repo.loadPublicProfile(req.params.rollNo),
  );
  if (!student || (student.status !== 'ACTIVE' && student.status !== 'GRADUATED')) {
    throw new NotFoundError('Student not found');
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
      const { proofDriveId: _p, thumbnail: _thumb, ...rest } = a;
      const viewUrl = a.proofDriveId
        ? `/api/public/media/achievement/${a.id}`
        : (a.proofUrl || null);
      const previewUrl = typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(a.proofDriveId) : null;
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
      const { fileDriveId: _f, thumbnail: _thumb, ...rest } = c;
      const viewUrl = c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null;
      const previewUrl = typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(c.fileDriveId) : null;
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
      const { driveFileId: _d, thumbnail: _thumb, ...rest } = r;
      const viewUrl = r.driveFileId ? `/api/public/media/resume/${r.id}` : null;
      const previewUrl = typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(r.driveFileId) : null;
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
}

export async function getPublicStudentResume(req: Request, res: Response): Promise<void> {
  const student = await repo.findPublicStudentWithResume(req.params.rollNo);
  if (!student || (student.status !== 'ACTIVE' && student.status !== 'GRADUATED') || !student.resumes.length) {
    throw new NotFoundError('Resume not available');
  }

  const resume = student.resumes[0];
  if (!resume.driveFileId) {
    throw new NotFoundError('Resume file not available');
  }
  res.redirect(`/api/public/media/resume/${resume.id}`);
}
