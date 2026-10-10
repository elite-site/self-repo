import { Router } from 'express';
import authRoutes from './auth.routes';
import overviewRoutes from './overview.routes';
import videoRoutes from './video.routes';
import resumeRoutes from './resume.routes';

const router = Router();

router.use(authRoutes);
router.use(overviewRoutes);
router.use(videoRoutes);
router.use(resumeRoutes);

export { authRoutes, overviewRoutes, videoRoutes, resumeRoutes };
export default router;
