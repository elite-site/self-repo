import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/auth';
import * as controller from './moderation.controller';

export const adminModerationRouter = Router();
adminModerationRouter.use(requireAdminAuth);

adminModerationRouter.get('/moderation', controller.listModerationItems);
adminModerationRouter.get('/moderation/videos', controller.getVideoQueue);
adminModerationRouter.get('/moderation/resumes', controller.getResumeQueue);
adminModerationRouter.get('/moderation/achievements', controller.getAchievementQueue);
adminModerationRouter.get('/moderation/certificates', controller.getCertificateQueue);
adminModerationRouter.patch('/moderation/videos/:id', controller.moderateVideo);
adminModerationRouter.patch('/moderation/videos/:id/visibility', controller.updateVideoVisibility);
adminModerationRouter.patch('/moderation/resumes/:id', controller.moderateResume);
adminModerationRouter.patch('/moderation/achievements/:id', controller.moderateAchievement);

export const portalModerationRouter = Router();
portalModerationRouter.use(requireAdminAuth);

portalModerationRouter.get('/moderation', controller.getPortalModeration);
portalModerationRouter.post('/moderation/:type/:id/approve', controller.portalApprove);
portalModerationRouter.post('/moderation/:type/:id/reject', controller.portalReject);
portalModerationRouter.post('/moderation/:type/:id/request-changes', controller.portalRequestChanges);
portalModerationRouter.post('/moderation/:type/:id/hide', controller.portalHide);

export default adminModerationRouter;
