import { Router } from 'express';
import { learningHomeRouter } from './learning-home.routes';
import { studentCoursesRouter, adminCoursesRouter } from '../learning-courses';
import { studentProgressRouter } from '../learning-progress';
import { studentQuizzesRouter, adminQuizzesRouter } from '../learning-quizzes';
import { adminReportsRouter } from '../learning-reports';

export const studentLearningRouter = Router();
studentLearningRouter.use(learningHomeRouter);
studentLearningRouter.use(studentProgressRouter);
studentLearningRouter.use(studentCoursesRouter);
studentLearningRouter.use(studentQuizzesRouter);

export const adminLearningRouter = Router();
adminLearningRouter.use(adminCoursesRouter);
adminLearningRouter.use(adminQuizzesRouter);
adminLearningRouter.use(adminReportsRouter);
