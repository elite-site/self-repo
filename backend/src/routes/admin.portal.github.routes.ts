import { Router, Request, Response } from 'express';
import { requireAdminAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { githubSyncService } from '../services/github.sync.service';
import { GithubSyncTrigger } from '@prisma/client';

const router = Router();
router.use(requireAdminAuth);

// ── GitHub Integration Management (Admin)

router.get('/github/overview', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '25', search } = req.query;
    const p = Math.max(1, parseInt(String(page), 10));
    const l = Math.max(1, Math.min(100, parseInt(String(limit), 10)));
    const skip = (p - 1) * l;

    const studentWhere: any = {};
    if (search) {
      studentWhere.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { rollNo: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const where: any = search ? { student: studentWhere } : {};

    const [totalConnected, total, accounts] = await Promise.all([
      prisma.githubAccount.count(),
      prisma.githubAccount.count({ where }),
      prisma.githubAccount.findMany({
        where,
        skip,
        take: l,
        orderBy: { connectedAt: 'desc' },
        include: {
          student: {
            select: { id: true, name: true, rollNo: true, year: true, section: true },
          },
        },
      }),
    ]);

    const studentIds = accounts.map((a) => a.studentId);
    const [repoCounts, showcasedCounts] = await Promise.all([
      prisma.githubRepo.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: studentIds },
          removedFromGithub: false,
        },
        _count: { id: true },
      }),
      prisma.githubRepo.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: studentIds },
          isShowcased: true,
          removedFromGithub: false,
        },
        _count: { id: true },
      }),
    ]);

    const repoCountMap = new Map(repoCounts.map((rc) => [rc.studentId, rc._count.id]));
    const showcasedMap = new Map(showcasedCounts.map((sc) => [sc.studentId, sc._count.id]));

    res.json({
      totalConnected,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      accounts: accounts.map((acc) => ({
        id: acc.id,
        studentId: acc.studentId,
        student: acc.student,
        githubUserId: String(acc.githubUserId),
        login: acc.login,
        avatarUrl: acc.avatarUrl,
        connectedAt: acc.connectedAt,
        lastSyncedAt: acc.lastSyncedAt,
        syncStatus: acc.syncStatus,
        syncError: acc.syncError,
        reposCount: repoCountMap.get(acc.studentId) || 0,
        showcasedCount: showcasedMap.get(acc.studentId) || 0,
      })),
    });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.get('/github/logs', async (req: Request, res: Response) => {
  try {
    const { status, filter } = req.query;
    const where: any = {};

    if (status) {
      const statuses = String(status).split(',').map((s) => s.trim()) as any[];
      where.status = { in: statuses };
    } else if (filter === 'errors' || filter === 'failed') {
      where.status = { in: ['FAILED', 'SKIPPED_RATE_LIMIT'] };
    }

    const logs = await prisma.githubSyncLog.findMany({
      where,
      take: 20,
      orderBy: { startedAt: 'desc' },
      include: {
        student: {
          select: { id: true, name: true, rollNo: true },
        },
      },
    });

    res.json(logs);
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.post('/github/resync/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;
    const account = await prisma.githubAccount.findUnique({
      where: { studentId },
    });
    if (!account) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Student does not have a connected GitHub account.' });
    }

    const result = await githubSyncService.queueSync(studentId, GithubSyncTrigger.MANUAL);
    res.json({ success: true, ...result });
  } catch (err: any) {
    if (err.name === 'GithubSyncCooldownError') {
      return res.status(429).json({ error: 'SYNC_COOLDOWN', message: err.message, secondsRemaining: err.secondsRemaining });
    }
    if (err.name === 'GithubSyncDailyCapError') {
      return res.status(429).json({ error: 'SYNC_DAILY_CAP', message: err.message });
    }
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

router.get('/github/projects', async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const p = Math.max(1, parseInt(String(page), 10));
    const l = Math.max(1, Math.min(100, parseInt(String(limit), 10)));
    const skip = (p - 1) * l;

    const where: any = {
      removedFromGithub: false,
      isShowcased: true,
    };
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { student: { name: { contains: String(search), mode: 'insensitive' } } },
        { student: { rollNo: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const [total, repos] = await Promise.all([
      prisma.githubRepo.count({ where }),
      prisma.githubRepo.findMany({
        where,
        skip,
        take: l,
        orderBy: [{ stars: 'desc' }, { pushedAt: 'desc' }],
        include: {
          student: {
            select: { id: true, name: true, rollNo: true, year: true, section: true },
          },
        },
      }),
    ]);

    res.json({
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      items: repos.map((r) => ({
        ...r,
        githubRepoId: String(r.githubRepoId),
      })),
    });
  } catch (err: any) {
    console.error("Internal server error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again later." });
  }
});

export default router;
