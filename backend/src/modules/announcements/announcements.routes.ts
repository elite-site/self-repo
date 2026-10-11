import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './announcements.controller';

const router = Router();
router.use(requireAdminAuth);

router.get('/announcements', asyncHandler(controller.listAnnouncements));
router.get('/announcements/preview', asyncHandler(controller.getAudiencePreview));
router.post('/announcements', asyncHandler(controller.createAnnouncement));
router.post('/announcements/:id/publish', asyncHandler(controller.publishAnnouncement));
router.delete('/announcements/:id', asyncHandler(controller.deleteAnnouncement));

export default router;
