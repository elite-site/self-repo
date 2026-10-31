import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { requireAdminAuth } from '../../middleware/auth';
import * as controller from './quizzes.controller';

export const studentQuizzesRouter = Router();
studentQuizzesRouter.use(requireStudentAuth);
studentQuizzesRouter.get(['/quizzes/:quizId', '/:quizId'], asyncHandler(controller.getStudentQuiz));
studentQuizzesRouter.post(['/quizzes/:quizId/start', '/:quizId/start'], asyncHandler(controller.startQuizAttempt));
studentQuizzesRouter.post(['/quizzes/:quizId/submit', '/:quizId/submit'], asyncHandler(controller.submitQuizAttempt));
studentQuizzesRouter.get(['/quizzes/:quizId/attempts', '/:quizId/attempts'], asyncHandler(controller.getStudentAttempts));

export const adminQuizzesRouter = Router();
adminQuizzesRouter.use(requireAdminAuth);
adminQuizzesRouter.post(['/admin/courses/:id/quizzes', '/courses/:id/quizzes', '/:id/quizzes'], asyncHandler(controller.createAdminQuiz));
adminQuizzesRouter.get(['/admin/courses/:id/quizzes/:quizId', '/courses/:id/quizzes/:quizId', '/:id/quizzes/:quizId'], asyncHandler(controller.getAdminQuiz));
adminQuizzesRouter.put(['/admin/courses/:id/quizzes/:quizId', '/courses/:id/quizzes/:quizId', '/:id/quizzes/:quizId'], asyncHandler(controller.updateAdminQuiz));
