import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAdminAuth } from '../../middleware/auth';
import * as controller from './reports.controller';

export const adminReportsRouter = Router();
adminReportsRouter.use(requireAdminAuth);

adminReportsRouter.get(['/admin/reports/overview', '/reports/overview', '/overview'], asyncHandler(controller.getOverview));
adminReportsRouter.get(['/admin/reports/courses/:id/export', '/reports/courses/:id/export', '/courses/:id/export', '/:id/export'], asyncHandler(controller.exportCourseReport));
adminReportsRouter.get(['/admin/reports/courses/:id', '/reports/courses/:id', '/courses/:id', '/:id'], asyncHandler(controller.getCourseReport));

export const reportsRouter = Router();
reportsRouter.use(adminReportsRouter);

export default reportsRouter;
