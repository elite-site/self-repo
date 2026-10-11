import { Router } from 'express';
import { studentAuthRouter as authRoutes } from '../auth';
import overviewRoutes from './routes/overview.routes';
import videoRoutes from './routes/video.routes';
import resumeRoutes from './routes/resume.routes';
import profileRoutes from './routes/profile.routes';
import interactionsRoutes from './routes/interactions.routes';

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
