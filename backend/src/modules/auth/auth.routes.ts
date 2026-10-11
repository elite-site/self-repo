import { Router } from 'express';
import { adminLoginRateLimiter, studentLoginRateLimiter } from '../../middleware/rateLimiter';
import { requireAdminAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  adminLogin,
  adminLogout,
  adminMe,
  authorize,
  googleCallback,
  studentLogout,
} from './auth.controller';

export const adminAuthRouter = Router();

adminAuthRouter.post('/login', adminLoginRateLimiter, adminLogin);
adminAuthRouter.post('/logout', adminLogout);
adminAuthRouter.get('/me', requireAdminAuth, adminMe);

export const studentAuthRouter = Router();

studentAuthRouter.get('/google/authorize', studentLoginRateLimiter, authorize);
studentAuthRouter.get('/google/callback', studentLoginRateLimiter, asyncHandler(googleCallback));
studentAuthRouter.post('/logout', studentLogout);

export default adminAuthRouter;
