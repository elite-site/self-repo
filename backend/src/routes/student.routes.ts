import { Router } from 'express';
import authRoutes from './student/auth.routes';
import overviewRoutes from './student/overview.routes';
import videoRoutes from './student/video.routes';
import resumeRoutes from './student/resume.routes';

const router = Router();

router.use(authRoutes);
router.use(overviewRoutes);
router.use(videoRoutes);
router.use(resumeRoutes);

export { serializeStudentView } from '../services/student/overview.serializer';
export { studentSubmissionVideoCache } from '../services/student/videoStream.service';
export { authRoutes, overviewRoutes, videoRoutes, resumeRoutes };
export default router;
