import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { httpError } from '../middleware/apiError';
import { requireAdminAuth } from '../middleware/auth';
import { driveService } from '../services/drive.service';
import { ActivityService } from '../services/activity.service';

const router = Router();
router.use(requireAdminAuth);

router.get('/storage', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const [
      submissionVideos,
      introVideos,
      resumes,
      certificates,
      achievementProofs,
      profilePhotos,
      cacheCount,
      cacheEntries,
    ] = await Promise.all([
      prisma.submission.count({ where: { videoDriveId: { not: null } } }),
      prisma.introVideo.count({ where: { driveFileId: { not: null } } }),
      prisma.resume.count({ where: { driveFileId: { not: null } } }),
      prisma.certificate.count({ where: { fileDriveId: { not: null } } }),
      prisma.achievement.count({ where: { proofDriveId: { not: null } } }),
      prisma.studentProfile.count({ where: { photoDriveId: { not: null } } }),
      prisma.driveFolderCache.count(),
      prisma.driveFolderCache.findMany({ take: 20 }),
    ]);

    const totalFiles =
      submissionVideos +
      introVideos +
      resumes +
      certificates +
      achievementProofs +
      profilePhotos;

    const mem = process.memoryUsage();
    const memoryUsedMb = Math.round(mem.rss / (1024 * 1024));

    res.json({
      drive: {
        status: 'CONNECTED',
        account: 'organizer@sasi.ac.in',
        mode: 'OAuth 2.0 Workspace Token',
        rootFolder: 'ELITE_PORTAL_ROOT',
        cacheEntriesCount: cacheCount,
        recentCache: cacheEntries,
      },
      inventory: {
        totalFiles,
        submissionVideos,
        introVideos,
        resumes,
        certificates,
        achievementProofs,
        profilePhotos,
      },
      system: {
        memoryUsedMb,
        uptimeSeconds: Math.round(process.uptime()),
        database: 'PostgreSQL 16 (Connected)',
      },
    });
  } catch (err: any) {
    console.error('Error fetching storage stats:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/storage/clear-cache', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const deleted = await prisma.driveFolderCache.deleteMany();
    await ActivityService.log({
      eventId: 'photo-2026',
      category: 'ADMIN',
      action: 'Admin cleared Drive folder cache',
      details: `Purged ${deleted.count} cached folder lookups`,
      status: 'SUCCESS',
    });
    res.json({ success: true, message: `Purged ${deleted.count} cache entries.` });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/storage/ensure-viewer-permissions', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const result = typeof driveService.ensureAllFilesViewerAccess === 'function'
      ? await driveService.ensureAllFilesViewerAccess()
      : { count: 0, failed: 0 };

    await ActivityService.log({
      eventId: 'photo-2026',
      category: 'ADMIN',
      action: 'Admin synchronized Drive viewer permissions',
      details: `Granted viewer access to ${result.count} files/folders (${result.failed} failed)`,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: `Viewer permissions updated for ${result.count} Drive items.`,
      ...result,
    });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// ==========================================
// EMAIL AUTOMATIONS & HISTORY
// ==========================================


export default router;
