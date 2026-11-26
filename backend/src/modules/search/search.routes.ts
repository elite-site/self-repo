import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { searchRateLimiter } from '../../middleware/rateLimiter';
import * as controller from './search.controller';

export const searchRouter = Router();
searchRouter.use(requireStudentAuth, searchRateLimiter);
searchRouter.get('/', asyncHandler(controller.search));
