import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { requireAdminAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './github.controller';

// 1. Student GitHub Router (/api/student/github)
export const studentGithubRouter = Router();

// OAuth callback from GitHub (unprotected by JWT)
studentGithubRouter.get('/callback', asyncHandler(controller.handleCallback));

// Protected student routes
studentGithubRouter.use(requireStudentAuth);

studentGithubRouter.get('/', asyncHandler(controller.getStatus));
studentGithubRouter.get('/summary', asyncHandler(controller.getSummary));
studentGithubRouter.get('/repos/:id/readme', asyncHandler(controller.getReadme));
studentGithubRouter.post('/connect', asyncHandler(controller.connect));
studentGithubRouter.post('/sync', asyncHandler(controller.sync));
studentGithubRouter.put('/showcase', asyncHandler(controller.updateShowcase));
studentGithubRouter.put('/skills/showcase', asyncHandler(controller.updateSkillShowcase));
studentGithubRouter.put('/skills', asyncHandler(controller.updateSkillShowcase));
studentGithubRouter.delete('/', asyncHandler(controller.disconnect));
studentGithubRouter.post('/reminder/snooze', asyncHandler(controller.snoozeReminder));

// 2. Admin Portal GitHub Router (/admin/portal)
export const adminPortalGithubRouter = Router();
adminPortalGithubRouter.use(requireAdminAuth);

adminPortalGithubRouter.get('/github/overview', asyncHandler(controller.getAdminOverview));
adminPortalGithubRouter.get('/github/logs', asyncHandler(controller.getAdminLogs));
adminPortalGithubRouter.post('/github/resync/:studentId', asyncHandler(controller.adminResyncStudent));
adminPortalGithubRouter.get('/github/projects', asyncHandler(controller.getAdminProjects));

// 3. Internal GitHub Router (/api/internal)
export const internalGithubRouter = Router();
internalGithubRouter.post('/github-sync-tick', asyncHandler(controller.handleInternalSyncTick));

export default studentGithubRouter;

