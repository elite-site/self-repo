import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getMe, getDashboard } from '../../controllers/student/overview.controller';

const router = Router();

router.get('/me', requireStudentAuth, asyncHandler(getMe));
router.get('/dashboard', requireStudentAuth, asyncHandler(getDashboard));

export default router;
