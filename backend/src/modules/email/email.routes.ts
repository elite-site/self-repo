import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/auth';
import * as controller from './email.controller';

const router = Router();
router.use(requireAdminAuth);

router.get('/email/automations', controller.getEmailAutomations);
router.post('/email/automations', controller.createEmailAutomation);
router.patch('/email/automations/:id/toggle', controller.toggleEmailAutomation);
router.post('/email/automations/:id/run', controller.runEmailAutomation);
router.get('/email/history', controller.getEmailHistory);
router.get('/email/templates', controller.getEmailTemplates);

export default router;
