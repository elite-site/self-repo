import { Router, Request, Response } from 'express';
import path from 'path';
import { requireStudentAuth } from '../middleware/studentAuth';
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

const router = Router();
router.use(requireStudentAuth);

// --- Projects ---

router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { studentId: (req as any).studentId },
      orderBy: { displayOrder: 'asc' }
    });
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
        githubUrl,
        driveVideoUrl: videoUrl || driveVideoUrl || null,
        displayOrder
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
    const proj = await prisma.project.updateMany({
      where: { id: req.params.id, studentId },
      data: {
        title,
        description,
        technologies: techStack || technologies || undefined,
        githubUrl,
        driveVideoUrl: videoUrl || driveVideoUrl || undefined
      }
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
    const achievements = await prisma.achievement.findMany({
      where: { studentId: (req as any).studentId },
      include: { category: true },
      orderBy: { achievedAt: 'desc' }
    });
    res.json(achievements.map(a => ({
      ...a,
      date: a.achievedAt,
      organizationName: a.organization,
      proofUrl: a.proofUrl || (a.proofDriveId ? `/api/public/media/achievement/${a.proofDriveId}` : null),
      watchUrl: typeof driveService.getWatchUrl === 'function'
        ? driveService.getWatchUrl(a.proofDriveId)
        : (a.proofDriveId && !a.proofDriveId.startsWith('mock_') && !a.proofDriveId.startsWith('drive_') ? `https://drive.google.com/file/d/${a.proofDriveId}/view` : null),
      previewUrl: typeof driveService.getPreviewUrl === 'function'
        ? driveService.getPreviewUrl(a.proofDriveId)
        : (a.proofDriveId && !a.proofDriveId.startsWith('mock_') && !a.proofDriveId.startsWith('drive_') ? `https://drive.google.com/file/d/${a.proofDriveId}/preview` : null),
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/achievements', handleProofUpload, async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    let {
      title,
      description,
      date,
      achievedAt,
      organization,
      organizationName,
      categoryId,
      proofUrl,
      certificateUrl,
      proofDriveId
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Title is required' });
    }

    let finalProofDriveId = proofDriveId || null;
    let finalProofUrl = proofUrl || certificateUrl || null;

    if ((req as any).file) {
      const file = (req as any).file;
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { rollNo: true, name: true, year: true, section: true },
      });
      const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
      const cleanName = student?.name ? student.name.replace(/[^a-zA-Z0-9]/g, '') : '';
      const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Proof_${cleanRollNo}_${cleanTitle}_${Date.now()}${ext}`;
      const studentFolder = cleanName ? `${cleanRollNo}_${cleanName}` : cleanRollNo;
      const relativePath = `Achievements/${student?.year || 'All'}-${student?.section || 'All'}/${studentFolder}`;

      try {
        finalProofDriveId = await driveService.uploadFile(
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
        finalProofDriveId = 'drive_proof_' + Date.now();
      }
      finalProofUrl = `/api/public/media/achievement/${finalProofDriveId}`;
    }

    const achievement = await prisma.achievement.create({
      data: {
        studentId,
        title: title.trim(),
        description: description ? description.trim() : null,
        achievedAt: date || achievedAt ? new Date(date || achievedAt) : new Date(),
        organization: organization || organizationName || null,
        categoryId: categoryId || null,
        proofDriveId: finalProofDriveId,
        proofUrl: finalProofUrl,
        status: 'PENDING' // always default to PENDING on creation
      }
    });

    res.status(201).json({
      ...achievement,
      date: achievement.achievedAt,
      organizationName: achievement.organization,
      proofUrl: achievement.proofUrl || (achievement.proofDriveId ? `/api/public/media/achievement/${achievement.proofDriveId}` : null)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/achievements/:id', handleProofUpload, async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    let {
      title,
      description,
      date,
      achievedAt,
      organization,
      organizationName,
      categoryId,
      status,
      proofUrl,
      certificateUrl,
      proofDriveId
    } = req.body;

    let finalProofDriveId = proofDriveId !== undefined ? proofDriveId : undefined;
    let finalProofUrl = (proofUrl !== undefined || certificateUrl !== undefined)
      ? (proofUrl || certificateUrl)
      : undefined;

    if ((req as any).file) {
      const file = (req as any).file;
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { rollNo: true, name: true, year: true, section: true },
      });
      const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
      const cleanTitle = (title || 'Proof').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Proof_${cleanRollNo}_${cleanTitle}_${Date.now()}${ext}`;
      const relativePath = `Achievements/${cleanRollNo}`;

      try {
        finalProofDriveId = await driveService.uploadFile(
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
        console.error('Failed to upload updated achievement proof to drive:', uploadErr);
        finalProofDriveId = 'drive_proof_' + Date.now();
      }
      finalProofUrl = `/api/public/media/achievement/${finalProofDriveId}`;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (date || achievedAt) updateData.achievedAt = new Date(date || achievedAt);
    if (organization !== undefined || organizationName !== undefined) {
      updateData.organization = organization || organizationName || null;
    }
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (finalProofDriveId !== undefined) updateData.proofDriveId = finalProofDriveId;
    if (finalProofUrl !== undefined) updateData.proofUrl = finalProofUrl;
    if (status !== undefined) updateData.status = status;

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
    const deleted = await prisma.achievement.deleteMany({
      where: { id: req.params.id, studentId }
    });
    if (deleted.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Certificates ---

router.get('/certificates', async (req: Request, res: Response) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { studentId: (req as any).studentId },
      orderBy: { issuedAt: 'desc' }
    });
    res.json(certificates.map(c => ({
      ...c,
      issueDate: c.issuedAt,
      fileUrl: c.fileDriveId ? `/api/public/media/certificate/${c.fileDriveId}` : null,
      watchUrl: typeof driveService.getWatchUrl === 'function'
        ? driveService.getWatchUrl(c.fileDriveId)
        : (c.fileDriveId && !c.fileDriveId.startsWith('mock_') && !c.fileDriveId.startsWith('drive_') ? `https://drive.google.com/file/d/${c.fileDriveId}/view` : null),
      previewUrl: typeof driveService.getPreviewUrl === 'function'
        ? driveService.getPreviewUrl(c.fileDriveId)
        : (c.fileDriveId && !c.fileDriveId.startsWith('mock_') && !c.fileDriveId.startsWith('drive_') ? `https://drive.google.com/file/d/${c.fileDriveId}/preview` : null),
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/certificates', certificateUpload, async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'NO_FILE', message: 'File is required' });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, name: true, year: true, section: true },
    });

    const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
    const cleanName = student?.name ? student.name.replace(/[^a-zA-Z0-9]/g, '') : '';
    const cleanTitle = (req.body.title || 'Certificate').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Cert_${cleanRollNo}_${cleanTitle}_${Date.now()}${ext}`;
    const studentFolder = cleanName ? `${cleanRollNo}_${cleanName}` : cleanRollNo;
    const relativePath = `Certificates/${student?.year || 'All'}-${student?.section || 'All'}/${studentFolder}`;

    let driveFileId: string;
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

    const certificate = await prisma.certificate.create({
      data: {
        studentId,
        title: req.body.title || 'Certificate',
        issuer: req.body.issuer || '',
        issuedAt: req.body.issueDate || req.body.issuedAt ? new Date(req.body.issueDate || req.body.issuedAt) : new Date(),
        fileDriveId: driveFileId,
        status: 'PENDING'
      }
    });
    res.status(201).json({
      ...certificate,
      issueDate: certificate.issuedAt,
      fileUrl: `/api/public/media/certificate/${driveFileId}`,
      watchUrl: typeof driveService.getWatchUrl === 'function'
        ? driveService.getWatchUrl(driveFileId)
        : (driveFileId && !driveFileId.startsWith('mock_') && !driveFileId.startsWith('drive_') ? `https://drive.google.com/file/d/${driveFileId}/view` : null),
      previewUrl: typeof driveService.getPreviewUrl === 'function'
        ? driveService.getPreviewUrl(driveFileId)
        : (driveFileId && !driveFileId.startsWith('mock_') && !driveFileId.startsWith('drive_') ? `https://drive.google.com/file/d/${driveFileId}/preview` : null),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/certificates/:id', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const deleted = await prisma.certificate.deleteMany({
      where: { id: req.params.id, studentId }
    });
    if (deleted.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
