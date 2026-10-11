import { Router, Request, Response, NextFunction } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { submissionRateLimiter } from '../../middleware/rateLimiter';
import { certificateUpload, proofUpload } from '../../middleware/upload';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/appError';
import * as controller from './portfolio.controller';

const handleProofUpload = (req: Request, res: Response, next: NextFunction): void => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    proofUpload(req, res, (err: any) => {
      if (err) {
        return next(new AppError('UPLOAD_ERROR', err.message || 'Proof upload failed', 400));
      }
      if (req.files) {
        const files = req.files as Record<string, Express.Multer.File[]>;
        const f = files['proof']?.[0] || files['file']?.[0];
        if (f) (req as any).file = f;
      }
      next();
    });
    return;
  }
  next();
};

const router = Router();
router.use(requireStudentAuth);

router.get('/', asyncHandler(controller.getPortfolio));

// --- Projects ---
router.get('/projects', asyncHandler(controller.getProjects));
router.post('/projects', asyncHandler(controller.postProject));
router.put('/projects/reorder', asyncHandler(controller.putProjectsReorder));
router.put('/projects/:id', asyncHandler(controller.putProject));
router.delete('/projects/:id', asyncHandler(controller.deleteProjectById));

// --- Achievements ---
router.get('/achievements', asyncHandler(controller.getAchievements));
router.post('/achievements', submissionRateLimiter, handleProofUpload, asyncHandler(controller.postAchievement));
router.put('/achievements/:id', asyncHandler(controller.putAchievement));
router.delete('/achievements/:id', asyncHandler(controller.deleteAchievementById));

// --- Certificates ---
router.get('/certificates', asyncHandler(controller.getCertificates));
router.post('/certificates', submissionRateLimiter, certificateUpload, asyncHandler(controller.postCertificate));
router.patch('/certificates/:id/visibility', asyncHandler(controller.patchCertificateVisibility));
router.delete('/certificates/:id', asyncHandler(controller.deleteCertificateById));

// --- Item Visibility (Universal) ---
router.patch('/:kind/:id/visibility', asyncHandler(controller.patchItemVisibility));

export default router;
