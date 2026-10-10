import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { httpError } from '../middleware/apiError';
import { requireAdminAuth } from '../middleware/auth';
import { ActivityService } from '../services/activity.service';

const router = Router();
router.use(requireAdminAuth);

router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.portalSettings.findMany();
    res.json(settings);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { key, value, group } = req.body;
    if (key) {
      await prisma.portalSettings.upsert({
        where: { key },
        update: { value: String(value), group: group || 'general' },
        create: { key, value: String(value), group: group || 'general' }
      });
    }
    res.json({ message: 'Success' });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/skills', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany();
    res.json(skills);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/skills', async (req, res) => {
  try {
    const { name, category } = req.body;
    const skill = await prisma.skill.create({
      data: { name, category: category || 'GENERAL', isActive: true }
    });
    res.status(201).json(skill);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.delete('/skills/:id', async (req, res) => {
  try {
    await prisma.skill.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/achievement-categories', async (req, res) => {
  try {
    const categories = await prisma.achievementCategory.findMany();
    res.json(categories);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/achievement-categories', async (req, res) => {
  try {
    const { name } = req.body;
    const cat = await prisma.achievementCategory.create({
      data: { name }
    });
    res.status(201).json(cat);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// ==========================================
// STORAGE MANAGEMENT (Storage.tsx)
// ==========================================


router.get('/roles', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    let roles = await prisma.role.findMany({
      include: {
        permissions: true,
        assignments: { include: { admin: { select: { id: true, username: true, email: true, role: true } } } },
      },
    });

    if (roles.length === 0) {
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
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/roles/assign', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { adminId, roleId } = req.body;
    if (!adminId || !roleId) {
      res.status(400).json({ error: 'MISSING_DATA', message: 'adminId and roleId are required' });
      return;
    }
    const assignment = await prisma.roleAssignment.upsert({
      where: { adminId_roleId: { adminId, roleId } },
      update: {},
      create: { adminId, roleId },
    });
    res.json({ success: true, assignment });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

export default router;
