import { Router } from 'express';
import { studentLoginRateLimiter } from '../../middleware/rateLimiter';
import { asyncHandler } from '../../utils/asyncHandler';
import { authorize, googleCallback, logout } from '../../controllers/student/auth.controller';

const router = Router();

router.get('/google/authorize', studentLoginRateLimiter, authorize);
router.get('/google/callback', studentLoginRateLimiter, asyncHandler(googleCallback));
router.post('/logout', logout);

export default router;
