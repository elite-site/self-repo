import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  handleCallback,
  getStatus,
  getSummary,
  getReadme,
  connect,
  sync,
  updateShowcase,
  disconnect,
  snoozeReminder,
} from '../../controllers/student/github.controller';

const router = Router();

// OAuth callback from GitHub (unprotected by JWT)
router.get('/callback', asyncHandler(handleCallback));

// Protected student routes
router.use(requireStudentAuth);

router.get('/', asyncHandler(getStatus));
router.get('/summary', asyncHandler(getSummary));
router.get('/repos/:id/readme', asyncHandler(getReadme));
router.post('/connect', asyncHandler(connect));
router.post('/sync', asyncHandler(sync));
router.put('/showcase', asyncHandler(updateShowcase));
router.delete('/', asyncHandler(disconnect));
router.post('/reminder/snooze', asyncHandler(snoozeReminder));

export default router;
