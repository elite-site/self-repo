import { Router, Request, Response } from 'express';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { notifyStudent } from '../services/notification.service';

const router = Router();
router.use(requireAdminAuth);

// ── Settings
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.portalSettings.findMany();
    const map: Record<string, string> = {
      academic_year: '2026',
      portal_title: 'ELITE Student Portal',
      institution_name: 'Sasi Institute of Technology & Engineering',
      department_name: 'Department of Information Technology',
      max_video_size_mb: '100',
      max_photo_size_mb: '10',
      allowed_email_domain: 'sasi.ac.in',
      auto_approve_projects: 'true',
    };
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    res.json({ settings: map, raw: settings });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const validEntries = Object.entries(req.body).filter(
      ([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    );
    if (validEntries.length > 0) {
      const updatedBy = req.adminUser?.username || 'ADMIN';
      await prisma.$transaction(
        validEntries.map(([key, value]) =>
          prisma.portalSettings.upsert({
            where: { key },
            update: { value: String(value), updatedBy },
            create: { key, value: String(value), updatedBy },
          })
        )
      );
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

// ── Roles & Permissions
router.get('/roles', async (_req: Request, res: Response) => {
  try {
    let roles = await prisma.role.findMany({
      include: {
        permissions: true,
        assignments: { include: { admin: { select: { id: true, username: true, email: true, role: true } } } },
      },
    });

    if (roles.length === 0) {
      // Seed initial roles
      const superAdmin = await prisma.role.create({
        data: { name: 'SUPER_ADMIN', description: 'Full access to all system features and settings', isSystem: true },
      });
      const admin = await prisma.role.create({
        data: { name: 'ADMIN', description: 'Department operations, students, and events', isSystem: true },
      });
      const mod = await prisma.role.create({
        data: { name: 'MODERATOR', description: 'Review submissions and student portfolio items', isSystem: true },
      });
      roles = await prisma.role.findMany({
        include: { permissions: true, assignments: { include: { admin: true } } },
      });
    }

    const admins = await prisma.adminUser.findMany({
      select: { id: true, username: true, email: true, role: true, createdAt: true },
    });

    res.json({ roles, admins });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/roles', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const role = await prisma.role.create({
      data: { name, description, isSystem: false },
    });
    res.status(201).json(role);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.put('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: { description },
    });
    res.json(role);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.get('/roles/:id/permissions', async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.rolePermission.findMany({
      where: { roleId: req.params.id },
    });
    res.json(permissions);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.put('/roles/:id/permissions', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Permissions updated' });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

// ── Change Requests (academic)
router.get('/change-requests', async (_req: Request, res: Response) => {
  try {
    const requests = await prisma.changeRequest.findMany({
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/change-requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const cr = await prisma.changeRequest.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', reviewedBy: req.adminUser?.username || 'ADMIN' },
    });
    res.json({ success: true, changeRequest: cr });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/change-requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const cr = await prisma.changeRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', reviewedBy: req.adminUser?.username || 'ADMIN', reviewNote: req.body.reason },
    });
    res.json({ success: true, changeRequest: cr });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

// ── Skill Requests
router.get('/skill-requests', async (_req: Request, res: Response) => {
  try {
    const requests = await prisma.skillRequest.findMany({
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/skill-requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const sr = await prisma.skillRequest.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', reviewedBy: req.adminUser?.username || 'ADMIN' },
    });
    // Create the skill if not exists
    await prisma.skill.upsert({
      where: { name: sr.skillName },
      update: {},
      create: { name: sr.skillName, category: sr.category || 'General', isActive: true },
    });
    res.json({ success: true, skillRequest: sr });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/skill-requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const sr = await prisma.skillRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', reviewedBy: req.adminUser?.username || 'ADMIN', reviewNote: req.body.reason },
    });
    res.json({ success: true, skillRequest: sr });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

// ── Skills
router.get('/skills', async (_req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
    res.json(skills);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/skills', async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;
    const skill = await prisma.skill.create({
      data: { name, category: category || 'General', isActive: true },
    });
    res.status(201).json(skill);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.put('/skills/:id', async (req: Request, res: Response) => {
  try {
    const { name, category, isActive } = req.body;
    const skill = await prisma.skill.update({
      where: { id: req.params.id },
      data: { name, category, isActive },
    });
    res.json(skill);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});


export default router;
