import { Request, Response, Router } from 'express';
import { requireAdminAuth } from '../middleware/auth';
import {
  AcademicYearPromotionError,
  promoteAcademicYear,
} from '../services/academicYear.service';

const router = Router();

router.post('/promote', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminEmail = req.adminUser?.email || req.adminUser?.username || 'ADMIN';
    const result = await promoteAcademicYear({
      adminEmail,
      force: req.body?.force === true,
      academicYear: req.body?.academicYear,
    });

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof AcademicYearPromotionError) {
      if (err.code === 'NO_ACTIVE_STUDENTS') {
        res.status(409).json({
          error: 'NO_ACTIVE_STUDENTS',
          message: 'No active students to promote.',
        });
        return;
      }

      res.status(409).json({
        error: 'ALREADY_PROMOTED',
        message: `Already promoted for academic year ${err.targetYear} — run again anyway?`,
        alreadyPromoted: true,
      });
      return;
    }

    console.error('Error promoting academic year:', err);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Internal server error',
    });
  }
});

export default router;
