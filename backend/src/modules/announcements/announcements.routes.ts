import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/auth';
import * as controller from './announcements.controller';

const router = Router();
router.use(requireAdminAuth);

router.get('/announcements', controller.listAnnouncements);
router.get('/announcements/preview', controller.getAudiencePreview);
router.post('/announcements', controller.createAnnouncement);
router.post('/announcements/:id/publish', controller.publishAnnouncement);
router.delete('/announcements/:id', controller.deleteAnnouncement);

export default router;
