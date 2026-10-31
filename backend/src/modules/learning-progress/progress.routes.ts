import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireStudentAuth } from '../../middleware/studentAuth';
import * as controller from './progress.controller';

export const studentProgressRouter = Router();
studentProgressRouter.use(requireStudentAuth);

studentProgressRouter.get('/my-learning', asyncHandler(controller.getMyLearning));
studentProgressRouter.get('/lessons/:id', asyncHandler(controller.getLesson));
studentProgressRouter.post('/lessons/:id/progress', asyncHandler(controller.updateLessonProgress));
