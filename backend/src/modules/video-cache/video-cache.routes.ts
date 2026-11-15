import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAdminAuth } from '../../middleware/auth';
import * as controller from './video-cache.controller';
import * as adminController from './cache.controller';

export const internalVideoCacheRouter = Router();

internalVideoCacheRouter.post(
  '/video-cache/evict',
  asyncHandler(controller.handleInternalEvict),
);

export const adminVideoCacheRouter = Router();

adminVideoCacheRouter.use('/video-cache', requireAdminAuth);

adminVideoCacheRouter.get(
  '/video-cache',
  asyncHandler(adminController.getVideoCacheStatus),
);

adminVideoCacheRouter.post(
  '/video-cache/:id/retry',
  asyncHandler(adminController.retryFailedCopy),
);

adminVideoCacheRouter.post(
  '/video-cache/purge-idle',
  asyncHandler(adminController.purgeIdleCache),
);
