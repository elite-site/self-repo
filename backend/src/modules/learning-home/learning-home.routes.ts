import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireStudentAuth } from '../../middleware/studentAuth';
import * as controller from './learning-home.controller';

export const learningHomeRouter = Router();

learningHomeRouter.use(requireStudentAuth);
learningHomeRouter.get(['/home', '/'], asyncHandler(controller.getLearningHome));

export default learningHomeRouter;
