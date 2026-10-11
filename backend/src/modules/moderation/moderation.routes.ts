import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './moderation.controller';

export const adminModerationRouter = Router();
adminModerationRouter.use(requireAdminAuth);

adminModerationRouter.get('/moderation', asyncHandler(controller.listModerationItems));
adminModerationRouter.get('/moderation/videos', asyncHandler(controller.getVideoQueue));
adminModerationRouter.get('/moderation/resumes', asyncHandler(controller.getResumeQueue));
adminModerationRouter.get('/moderation/achievements', asyncHandler(controller.getAchievementQueue));
adminModerationRouter.get('/moderation/certificates', asyncHandler(controller.getCertificateQueue));
adminModerationRouter.patch('/moderation/videos/:id', asyncHandler(controller.moderateVideo));
adminModerationRouter.patch('/moderation/videos/:id/visibility', asyncHandler(controller.updateVideoVisibility));
adminModerationRouter.patch('/moderation/resumes/:id', asyncHandler(controller.moderateResume));
adminModerationRouter.patch('/moderation/achievements/:id', asyncHandler(controller.moderateAchievement));

export const portalModerationRouter = Router();
portalModerationRouter.use(requireAdminAuth);

portalModerationRouter.get('/moderation', asyncHandler(controller.getPortalModeration));
portalModerationRouter.post('/moderation/:type/:id/approve', asyncHandler(controller.portalApprove));
portalModerationRouter.post('/moderation/:type/:id/reject', asyncHandler(controller.portalReject));
portalModerationRouter.post('/moderation/:type/:id/request-changes', asyncHandler(controller.portalRequestChanges));
portalModerationRouter.post('/moderation/:type/:id/hide', asyncHandler(controller.portalHide));

export default adminModerationRouter;
