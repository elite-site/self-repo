import { Router } from 'express';
import authRoutes from '../../routes/student/auth.routes';
import overviewRoutes from '../../routes/student/overview.routes';
import videoRoutes from '../../routes/student/video.routes';
import resumeRoutes from '../../routes/student/resume.routes';
import profileRoutes from '../../routes/student/profile.routes';
import interactionsRoutes from '../../routes/student/interactions.routes';

// Main student router (/api/student)
export const studentRouter = Router();
studentRouter.use(authRoutes);
studentRouter.use(overviewRoutes);
studentRouter.use(videoRoutes);
studentRouter.use(resumeRoutes);

// Profile router (/api/student/profile)
export const studentProfileRouter = profileRoutes;

// Interactions router (/api/student)
export const studentInteractionsRouter = interactionsRoutes;

export default studentRouter;
