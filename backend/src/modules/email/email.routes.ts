import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './email.controller';

const router = Router();
router.use(requireAdminAuth);

router.get('/email/automations', asyncHandler(controller.getEmailAutomations));
router.post('/email/automations', asyncHandler(controller.createEmailAutomation));
router.patch('/email/automations/:id/toggle', asyncHandler(controller.toggleEmailAutomation));
router.post('/email/automations/:id/run', asyncHandler(controller.runEmailAutomation));
router.get('/email/history', asyncHandler(controller.getEmailHistory));
router.get('/email/templates', asyncHandler(controller.getEmailTemplates));

export default router;
