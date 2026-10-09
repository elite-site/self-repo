import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { driveService } from '../services/drive.service';
import { TtlCache } from '../utils/ttlCache';
import { EXCLUDE_INTERNAL_EVENT } from '../config/constants';

const router = Router();

/**
 * Public read caches. Every value stored here is already public and identical
 * for all callers, which is the only thing that makes sharing it across
 * requests safe. Nothing student-scoped may go through these.
 *
 * Entries are bounded: roll numbers are unbounded input, so a per-student cache
 * would otherwise grow until it exhausted the heap.
 */
const studentListCache = new TtlCache<unknown>(20_000, 100);
const skillsCache = new TtlCache<unknown>(300_000, 4);

router.get('/', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    const { search, year, section, skills, skillName, status } = req.query;

    const where: any = {};

    // Only students who have approved access (status: 'ACTIVE' or 'GRADUATED') are returned to the public
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

    // Keyed on every input that reaches the `where` clause, sorted so that
    // `?year=3&section=A` and `?section=A&year=3` share one entry. Without this
    // a burst of visitors to the public directory is a burst of identical
    // count+findMany pairs; with it, the second visitor onward is served from
    // memory. The 20s window is short because this directory is the page whose
    // contents change when a student is approved or graduates.
    // JSON.stringify rather than a `|` join. A join is ambiguous: `search=x|y` and
    // `skillName=z` collide with `search=x` and `skillName=y|z`, and whichever
    // arrived first would be served for both. `search` is also trimmed, because
    // the query trims it — keying on the raw value made `?search=%20react` a
    // guaranteed miss against the identical query `?search=react` produced.
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

    const payload = await studentListCache.wrap(cacheKey, async () => {
      const [total, students] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
          where,
          select: {
            id: true,
            rollNo: true,
            name: true,
            year: true,
            section: true,
            status: true,
            graduatedAt: true,
            profile: {
              select: {
                id: true,
                photoUrl: true,
                photoOffsetX: true,
                photoOffsetY: true,
                photoZoom: true,
                biography: true,
                specialQualities: true,
                skills: { include: { skill: true } }
              }
            }
          },
          orderBy: [{ year: 'desc' }, { section: 'asc' }, { rollNo: 'asc' }],
          skip,
          take: limit
        })
      ]);

      const mapped = students.map(s => {
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

// GET /api/public/students/skills — searchable skill categories and items
router.get('/skills', async (_req: Request, res: Response) => {
  try {
    const skills = await skillsCache.wrap('all', () => prisma.skill.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' }
    }));
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(skills);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

/**
 * The public profile query, hoisted so its result type can be derived for the
 * cache. `thumbnail` blobs are intentionally not selected; they are served by
 * /api/public/media/thumbnail/:type/:id so profile loads stay light.
 */
const loadPublicProfile = (rollNo: string) =>
  prisma.student.findUnique({
    where: { rollNo },
    include: {
      profile: { include: { skills: { include: { skill: true } } } },
      projects: {
        where: { status: 'APPROVED', isPublic: true },
        orderBy: { displayOrder: 'asc' },
        take: 100,
        select: {
          id: true,
          title: true,
          description: true,
          technologies: true,
          githubUrl: true,
          driveVideoUrl: true,
          displayOrder: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      achievements: {
        where: { status: 'APPROVED' },
        orderBy: { achievedAt: 'desc' },
        take: 100,
        select: {
          id: true, studentId: true, categoryId: true, title: true, description: true,
          organization: true, achievedAt: true, proofDriveId: true, proofUrl: true,
          status: true, reviewNote: true, reviewedBy: true, reviewedAt: true,
          isPublic: true, createdAt: true, updatedAt: true, category: true,
        },
      },
      certificates: {
        where: { status: 'APPROVED', isPublic: true },
        take: 100,
        select: {
          id: true, studentId: true, title: true, issuer: true, issuedAt: true,
          fileDriveId: true, status: true, reviewNote: true, reviewedBy: true,
          reviewedAt: true, isPublic: true, createdAt: true, updatedAt: true,
        },
      },
      resumes: {
        where: { status: 'APPROVED' },
        take: 1,
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true, studentId: true, driveFileId: true, filename: true, sizeMb: true,
          status: true, reviewNote: true, reviewedBy: true, reviewedAt: true,
          isActive: true, isPublic: true, submittedAt: true, updatedAt: true,
        },
      },
      // Only an approved + published video is ever attached to a public
      // profile, so a pending or unapproved recording stays invisible.
      introVideos: {
        where: { status: 'APPROVED', isPublic: true, driveFileId: { not: null } },
        take: 1,
        orderBy: { publishedAt: 'desc' },
        select: { id: true, submittedAt: true, publishedAt: true, sizeMb: true, driveFileId: true, status: true, isPublic: true },
      },
      githubAccount: {
        select: {
          login: true,
          avatarUrl: true,
          lastSyncedAt: true,
        },
      },
      githubRepos: {
        where: { isShowcased: true, removedFromGithub: false },
        orderBy: { showcaseRank: 'asc' },
        take: 30,
        select: {
          id: true,
          githubRepoId: true,
          name: true,
          description: true,
          readmeExcerpt: true,
          htmlUrl: true,
          stars: true,
          primaryLanguage: true,
          languages: true,
          commitCount: true,
          isFork: true,
          showcaseRank: true,
        },
      },
      githubSkills: {
        include: { skill: true },
        orderBy: [{ repoCount: 'desc' }, { totalBytes: 'desc' }],
        take: 30,
      },
    }
  });

type PublicProfile = NonNullable<Awaited<ReturnType<typeof loadPublicProfile>>>;

const studentProfileCache = new TtlCache<PublicProfile | null>(30_000, 200);

/** Resets the public read caches. Exported so tests are not order-dependent. */
export const clearPublicStudentCaches = (): void => {
  studentListCache.clear();
  studentProfileCache.clear();
  skillsCache.clear();
};

router.get('/events', async (_req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        status: 'OPEN',
        ...EXCLUDE_INTERNAL_EVENT,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.set('Cache-Control', 'public, max-age=60');
    res.json(events);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.get('/:rollNo', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    // Only the query is cached, not the assembled response. The mapping below is
    // pure in-memory work, so re-running it per request is free, and it keeps
    // every URL-shaping decision in one place instead of freezing today's
    // output into the cache.
    const student = await studentProfileCache.wrap(
      req.params.rollNo,
      () => loadPublicProfile(req.params.rollNo),
    );
    if (!student || (student.status !== 'ACTIVE' && student.status !== 'GRADUATED')) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
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
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.get('/:rollNo/resume', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { rollNo: req.params.rollNo },
      include: {
        profile: true,
        resumes: { where: { status: 'APPROVED' }, take: 1, orderBy: { submittedAt: 'desc' } }
      }
    });

    if (!student || (student.status !== 'ACTIVE' && student.status !== 'GRADUATED') || !student.resumes.length) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Resume not available' });
    }

    const resume = student.resumes[0];
    if (!resume.driveFileId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Resume file not available' });
    }
    res.redirect(`/api/public/media/resume/${resume.id}`);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

export default router;
