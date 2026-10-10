import { Router, Request, Response, NextFunction } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { submissionRateLimiter } from '../../middleware/rateLimiter';
import { certificateUpload, proofUpload } from '../../middleware/upload';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  getPortfolio,
  getProjects,
  postProject,
  putProjectsReorder,
  putProject,
  deleteProjectById,
  getAchievements,
  postAchievement,
  putAchievement,
  deleteAchievementById,
  getCertificates,
  postCertificate,
  patchCertificateVisibility,
  deleteCertificateById,
  patchItemVisibility,
} from '../../controllers/student/portfolio.controller';

const handleProofUpload = (req: Request, res: Response, next: NextFunction) => {
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

router.get('/', asyncHandler(getPortfolio));

// --- Projects ---
router.get('/projects', asyncHandler(getProjects));
router.post('/projects', asyncHandler(postProject));
router.put('/projects/reorder', asyncHandler(putProjectsReorder));
router.put('/projects/:id', asyncHandler(putProject));
router.delete('/projects/:id', asyncHandler(deleteProjectById));

// --- Achievements ---
router.get('/achievements', asyncHandler(getAchievements));
router.post('/achievements', submissionRateLimiter, handleProofUpload, asyncHandler(postAchievement));
router.put('/achievements/:id', asyncHandler(putAchievement));
router.delete('/achievements/:id', asyncHandler(deleteAchievementById));

// --- Certificates ---
router.get('/certificates', asyncHandler(getCertificates));
router.post('/certificates', submissionRateLimiter, certificateUpload, asyncHandler(postCertificate));
router.patch('/certificates/:id/visibility', asyncHandler(patchCertificateVisibility));
router.delete('/certificates/:id', asyncHandler(deleteCertificateById));

// --- Generic Visibility Toggle ---
router.patch('/:kind/:id/visibility', asyncHandler(patchItemVisibility));

export default router;
