import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { requireAdminAuth } from '../../middleware/auth';
import * as controller from './resources.controller';

export const studentResourcesRouter = Router();
studentResourcesRouter.use(requireStudentAuth);
studentResourcesRouter.get('/semesters', asyncHandler(controller.getStudentSemesters));
studentResourcesRouter.get('/', asyncHandler(controller.getStudentResources));

export const adminResourcesRouter = Router();
adminResourcesRouter.use(requireAdminAuth);
adminResourcesRouter.get('/', asyncHandler(controller.adminListResources));
adminResourcesRouter.post('/', asyncHandler(controller.adminCreateResource));
adminResourcesRouter.put('/:id', asyncHandler(controller.adminUpdateResource));
adminResourcesRouter.delete('/:id', asyncHandler(controller.adminDeleteResource));

export const resourcesRouter = Router();
resourcesRouter.use(studentResourcesRouter);
resourcesRouter.use(adminResourcesRouter);

export default resourcesRouter;
