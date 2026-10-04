import { Router, Request, Response } from 'express';
import path from 'path';
import { requireStudentAuth } from '../middleware/studentAuth';
import { submissionRateLimiter } from '../middleware/rateLimiter';
import { prisma } from '../lib/prisma';
import { certificateUpload, proofUpload } from '../middleware/upload';
import { driveService } from '../services/drive.service';
import { env } from '../config/env';

const handleProofUpload = (req: Request, res: Response, next: any) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return proofUpload(req, res, (err: any) => {
      if (err) return res.status(400).json({ error: 'UPLOAD_ERROR', message: err.message });
      if (req.files) {
        const files = req.files as Record<string, Express.Multer.File[]>;
        const f = files['proof']?.[0] || files['file']?.[0];
        if (f) (req as any).file = f;
      }
      next();
    });
  }
  next();
};

const SAFE_LINK_RE = /^https?:\/\/[^\s<>"'`\\]+$/i;

function assertSafeLink(field: string, value: unknown): string | { error: string } {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (!SAFE_LINK_RE.test(raw)) {
    return { error: `${field} must be an absolute http:// or https:// link.` };
  }
  return raw;
}

const router = Router();
router.use(requireStudentAuth);

// --- Projects ---

router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { studentId: (req as any).studentId },
      orderBy: { displayOrder: 'asc' },
      take: 100
    });
    res.set('Cache-Control', 'private, max-age=30, must-revalidate');
    // Map technologies -> techStack for frontend compatibility
    res.json(projects.map(p => ({
      ...p,
      techStack: p.technologies,
      videoUrl: p.driveVideoUrl
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/projects', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const count = await prisma.project.count({ where: { studentId } });
    if (count >= 5) {
      return res.status(400).json({ error: 'LIMIT_EXCEEDED', message: 'Max 5 projects allowed.' });
    }
    const { title, description, techStack, technologies, githubUrl, videoUrl, driveVideoUrl } = req.body;

    const validatedGithubUrl = githubUrl ? assertSafeLink('githubUrl', githubUrl) : '';
    if (typeof validatedGithubUrl !== 'string') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: validatedGithubUrl.error });
    }

    const finalVideoUrl = videoUrl || driveVideoUrl;
    const validatedVideoUrl = finalVideoUrl ? assertSafeLink('videoUrl', finalVideoUrl) : null;
    if (validatedVideoUrl && typeof validatedVideoUrl !== 'string') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: (validatedVideoUrl as any).error });
    }

    // determine display order
    const maxOrderProj = await prisma.project.findFirst({
      where: { studentId },
      orderBy: { displayOrder: 'desc' }
    });
    const displayOrder = maxOrderProj ? maxOrderProj.displayOrder + 1 : 0;

    const project = await prisma.project.create({
      data: {
        studentId,
        title,
        description,
        technologies: techStack || technologies || [],
        githubUrl: validatedGithubUrl || null,
        driveVideoUrl: validatedVideoUrl || null,
        displayOrder,
        status: 'PENDING',
        isPublic: false
      }
    });
    res.status(201).json({
      ...project,
      techStack: project.technologies,
      videoUrl: project.driveVideoUrl
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/projects/reorder', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'INVALID_INPUT', message: 'ids must be an array' });

    await prisma.$transaction(
      ids.map((id: string, index: number) =>
        prisma.project.updateMany({
          where: { id, studentId },
          data: { displayOrder: index }
        })
      )
    );
    res.json({ message: 'Reordered successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/projects/:id', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const { title, description, techStack, technologies, githubUrl, videoUrl, driveVideoUrl } = req.body;

    const updateData: any = {
      title,
      description,
      technologies: techStack || technologies || undefined,
      status: 'PENDING',
      isPublic: false,
      reviewNote: null
    };

    if (githubUrl !== undefined) {
      if (githubUrl) {
        const result = assertSafeLink('githubUrl', githubUrl);
        if (typeof result !== 'string') {
          return res.status(400).json({ error: 'VALIDATION_ERROR', message: result.error });
        }
        updateData.githubUrl = result;
      } else {
        updateData.githubUrl = null;
      }
    }

    const finalVideoUrl = videoUrl || driveVideoUrl;
    if (finalVideoUrl !== undefined) {
      if (finalVideoUrl) {
        const result = assertSafeLink('videoUrl', finalVideoUrl);
        if (typeof result !== 'string') {
          return res.status(400).json({ error: 'VALIDATION_ERROR', message: result.error });
        }
        updateData.driveVideoUrl = result;
      } else {
        updateData.driveVideoUrl = null;
      }
    }

    const proj = await prisma.project.updateMany({
      where: { id: req.params.id, studentId },
      data: updateData
    });
    if (proj.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Project not found' });
    res.json({ message: 'Updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const proj = await prisma.project.deleteMany({
      where: { id: req.params.id, studentId }
    });
    if (proj.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Project not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Achievements ---

router.get('/achievements', async (req: Request, res: Response) => {
  try {
    // thumbnail blob is intentionally excluded; served by /api/public/media/thumbnail/:type/:id
    const achievements = await prisma.achievement.findMany({
      where: { studentId: (req as any).studentId },
      orderBy: { achievedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        studentId: true,
        categoryId: true,
        title: true,
        description: true,
        organization: true,
        achievedAt: true,
        proofDriveId: true,
        proofUrl: true,
        status: true,
        reviewNote: true,
        reviewedBy: true,
        reviewedAt: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        category: true,
      },
    });

    res.set('Cache-Control', 'private, max-age=30, must-revalidate');
    res.json(achievements.map(a => {
      const { proofDriveId: _p, ...rest } = a;
      const proofUrl = a.proofDriveId ? `/api/public/media/achievement/${a.id}` : a.proofUrl || null;
      const previewUrl = driveService.getPreviewUrl(a.proofDriveId);
      const hasProof = Boolean(a.proofDriveId || a.proofUrl);
      return {
        ...rest,
        date: a.achievedAt,
        organizationName: a.organization,
        hasProof,
        viewUrl: previewUrl || proofUrl,
        proofUrl: previewUrl || proofUrl,
        previewUrl,
        driveFileId: a.proofDriveId || null,
        thumbnailUrl: null,
      };
    }));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/achievements', submissionRateLimiter, handleProofUpload, async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const file = (req as any).file || req.file;
    const { title, description, date, achievedAt, organization, organizationName, categoryId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Title is required' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, name: true, year: true, section: true },
    });

    let proofDriveId: string | null = null;
    if (file) {
      const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
      const cleanTitle = title.trim().replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRollNo}_achievement_${cleanTitle}_${Date.now()}${ext}`;
      const relativePath = `Students/${cleanRollNo}`;

      try {
        proofDriveId = await driveService.uploadFile(
          {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype || 'application/octet-stream',
            size: file.size,
          },
          fileName,
          env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
          relativePath
        );
      } catch (uploadErr) {
        console.error('Failed to upload achievement proof to drive:', uploadErr);
        proofDriveId = 'drive_proof_' + Date.now();
      }
    }

    const achievement = await prisma.achievement.create({
      data: {
        studentId,
        title: title.trim(),
        description: description ? description.trim() : null,
        achievedAt: (date || achievedAt) ? new Date(date || achievedAt) : new Date(),
        organization: organization || organizationName || null,
        categoryId: categoryId || null,
        proofDriveId: proofDriveId || req.body.proofDriveId || null,
        proofUrl: req.body.proofUrl ? String(req.body.proofUrl).trim() : null,
        thumbnail: null,
        status: 'PENDING',
        isPublic: false
      }
    });

    const proofUrl = achievement.proofDriveId
      ? `/api/public/media/achievement/${achievement.id}`
      : achievement.proofUrl || null;
    const hasProof = Boolean(achievement.proofDriveId || achievement.proofUrl);

    const { proofDriveId: _p, thumbnail: _t, ...rest } = achievement;
    res.status(201).json({
      ...rest,
      date: achievement.achievedAt,
      organizationName: achievement.organization,
      hasProof,
      viewUrl: proofUrl,
      proofUrl,
      thumbnailUrl: null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/achievements/:id', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const { title, description, date, achievedAt, organization, organizationName, categoryId, status } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (date || achievedAt) updateData.achievedAt = new Date(date || achievedAt);
    if (organization !== undefined || organizationName !== undefined) {
      updateData.organization = organization || organizationName || null;
    }
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (status !== undefined) {
      updateData.status = status;
    } else {
      updateData.status = 'PENDING';
      updateData.isPublic = false;
      updateData.reviewNote = null;
    }

    const updated = await prisma.achievement.updateMany({
      where: { id: req.params.id, studentId },
      data: updateData
    });

    if (updated.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.json({ message: 'Updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/achievements/:id', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const item = await prisma.achievement.findFirst({
      where: { id: req.params.id, studentId },
      include: { student: { select: { rollNo: true } } },
    });
    if (!item) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });

    if (item.proofDriveId) {
      const cleanRollNo = item.student?.rollNo?.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const relativePath = cleanRollNo ? `Students/${cleanRollNo}` : undefined;
      await driveService.deleteFileById(item.proofDriveId, relativePath).catch(() => {});
    }

    await prisma.achievement.delete({ where: { id: item.id } });
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Certificates ---

router.get('/certificates', async (req: Request, res: Response) => {
  try {
    // thumbnail blob is intentionally excluded; served by /api/public/media/thumbnail/:type/:id
    const certificates = await prisma.certificate.findMany({
      where: { studentId: (req as any).studentId },
      orderBy: { issuedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        studentId: true,
        title: true,
        issuer: true,
        issuedAt: true,
        fileDriveId: true,
        status: true,
        reviewNote: true,
        reviewedBy: true,
        reviewedAt: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.set('Cache-Control', 'private, max-age=30, must-revalidate');
    res.json(certificates.map(c => {
      const { fileDriveId: _f, ...rest } = c;
      const viewUrl = c.fileDriveId ? `/api/public/media/certificate/${c.id}` : null;
      const previewUrl = driveService.getPreviewUrl(c.fileDriveId);
      const thumbnailUrl = c.fileDriveId
        ? `/api/public/media/thumbnail/certificate/${c.id}?v=${encodeURIComponent(c.fileDriveId)}`
        : null;
      return {
        ...rest,
        issueDate: c.issuedAt,
        hasFile: Boolean(c.fileDriveId),
        viewUrl: previewUrl || viewUrl,
        fileUrl: previewUrl || viewUrl,
        previewUrl,
        driveFileId: c.fileDriveId || null,
        thumbnailUrl,
      };
    }));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/certificates', submissionRateLimiter, certificateUpload, async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const file = req.file;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, name: true, year: true, section: true },
    });

    let driveFileId: string | null = null;

    if (file) {
      const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
      const cleanTitle = (req.body.title || 'Certificate').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRollNo}_cert_${cleanTitle}_${Date.now()}${ext}`;
      const relativePath = `Students/${cleanRollNo}`;

      try {
        driveFileId = await driveService.uploadFile(
          {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype || 'application/octet-stream',
            size: file.size,
          },
          fileName,
          env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
          relativePath
        );
      } catch (uploadErr) {
        console.error('Failed to upload certificate to drive:', uploadErr);
        driveFileId = 'drive_cert_' + Date.now();
      }
    }

    const certificate = await prisma.certificate.create({
      data: {
        studentId,
        title: req.body.title || 'Certificate',
        issuer: req.body.issuer || '',
        issuedAt: req.body.issueDate || req.body.issuedAt ? new Date(req.body.issueDate || req.body.issuedAt) : new Date(),
        fileDriveId: driveFileId,
        thumbnail: null,
        status: 'PENDING',
        isPublic: false
      }
    });

    const { fileDriveId: _f, thumbnail: _t, ...rest } = certificate;
    const viewUrl = certificate.fileDriveId ? `/api/public/media/certificate/${certificate.id}` : null;

    res.status(201).json({
      ...rest,
      issueDate: certificate.issuedAt,
      hasFile: Boolean(certificate.fileDriveId),
      viewUrl,
      fileUrl: viewUrl,
      thumbnailUrl: certificate.fileDriveId
        ? `/api/public/media/thumbnail/certificate/${certificate.id}?v=${encodeURIComponent(certificate.fileDriveId)}`
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.patch('/certificates/:id/visibility', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const { isPublic } = req.body || {};
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'isPublic must be a boolean' });
    }

    const certificate = await prisma.certificate.findFirst({
      where: { id: req.params.id, studentId }
    });
    if (!certificate) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found' });
    }

    if (isPublic && certificate.status !== 'APPROVED') {
      return res.status(409).json({
        error: 'NOT_APPROVED',
        message: 'Only approved certificates can be displayed on your public profile.'
      });
    }

    const updated = await prisma.certificate.update({
      where: { id: certificate.id },
      data: { isPublic },
      select: { id: true, isPublic: true, status: true }
    });

    res.json({
      success: true,
      isPublic: updated.isPublic,
      message: isPublic
        ? 'Certificate is now visible on your public profile.'
        : 'Certificate has been hidden from your public profile.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/certificates/:id', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const cert = await prisma.certificate.findFirst({
      where: { id: req.params.id, studentId },
      include: { student: { select: { rollNo: true } } },
    });
    if (!cert) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });

    if (cert.fileDriveId) {
      const cleanRollNo = cert.student?.rollNo?.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const relativePath = cleanRollNo ? `Students/${cleanRollNo}` : undefined;
      await driveService.deleteFileById(cert.fileDriveId, relativePath).catch(() => {});
    }

    await prisma.certificate.delete({ where: { id: cert.id } });
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ============================================================================
// STUDENT VISIBILITY TOGGLE (achievements, projects, certificates)
//
// Certificates already had one of these; the rest of the portfolio items did
// not, so a student could not hide an approved achievement or project from
// their public page. One generic route keeps them all behaving identically.
//
// Only APPROVED items may be published — the approval gate must not be
// something a student can talk their way past from their own profile.
// ============================================================================

type PortfolioKind = 'achievements' | 'projects' | 'certificates';

const PORTFOLIO_META: Record<
  PortfolioKind,
  { model: 'achievement' | 'project' | 'certificate'; label: string }
> = {
  achievements: { model: 'achievement', label: 'Achievement' },
  projects: { model: 'project', label: 'Project' },
  certificates: { model: 'certificate', label: 'Certificate' },
};

router.patch('/:kind/:id/visibility', async (req: Request, res: Response) => {
  const kind = String(req.params.kind || '').toLowerCase() as PortfolioKind;
  const meta = PORTFOLIO_META[kind];
  if (!meta) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown portfolio item type' });
  }

  try {
    const studentId = (req as any).studentId;
    const { isPublic } = req.body || {};
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'isPublic must be a boolean' });
    }

    const delegate = (prisma as any)[meta.model];
    const item = await delegate.findFirst({ where: { id: req.params.id, studentId } });
    if (!item) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `${meta.label} not found` });
    }

    if (isPublic && item.status !== 'APPROVED') {
      return res.status(409).json({
        error: 'NOT_APPROVED',
        message: `Only approved ${meta.label.toLowerCase()}s can be displayed on your public profile.`,
      });
    }

    const updated = await delegate.update({
      where: { id: item.id },
      data: { isPublic },
      select: { id: true, isPublic: true, status: true },
    });

    return res.json({
      success: true,
      isPublic: updated.isPublic,
      message: isPublic
        ? `${meta.label} is now visible on your public profile.`
        : `${meta.label} has been hidden from your public profile.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
