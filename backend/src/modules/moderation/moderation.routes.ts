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
adminModerationRouter.get('/moderation/projects', asyncHandler(controller.getProjectQueue));
adminModerationRouter.patch('/moderation/:type/:id', asyncHandler(controller.moderateItem));
adminModerationRouter.patch('/moderation/:type/:id/visibility', asyncHandler(controller.updateItemVisibility));
adminModerationRouter.delete('/moderation/:type/:id', asyncHandler(controller.deleteItem));
adminModerationRouter.post('/moderation/:type/:id/request-changes', asyncHandler(controller.requestItemChanges));

export const portalModerationRouter = Router();
portalModerationRouter.use(requireAdminAuth);

portalModerationRouter.post('/moderation/:type/:id/approve', asyncHandler(controller.portalApprove));
portalModerationRouter.post('/moderation/:type/:id/reject', asyncHandler(controller.portalReject));
portalModerationRouter.post('/moderation/:type/:id/hide', asyncHandler(controller.portalHide));

export default adminModerationRouter;
