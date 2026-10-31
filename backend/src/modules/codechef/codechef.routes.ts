import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { requireAdminAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './codechef.controller';

// 1. Student CodeChef Router (/api/student/codechef)
export const studentCodeChefRouter = Router();
studentCodeChefRouter.use(requireStudentAuth);

studentCodeChefRouter.get('/status', asyncHandler(controller.getStatus));
studentCodeChefRouter.get('/details', asyncHandler(controller.getDetails));
studentCodeChefRouter.post('/connect', asyncHandler(controller.connect));
studentCodeChefRouter.post('/verify', asyncHandler(controller.verify));
studentCodeChefRouter.post('/sync', asyncHandler(controller.sync));
studentCodeChefRouter.put('/visibility', asyncHandler(controller.setVisibility));
studentCodeChefRouter.delete('/', asyncHandler(controller.disconnect));

// 2. Admin CodeChef Router (/admin/api/codechef)
export const adminCodeChefRouter = Router();
adminCodeChefRouter.use(requireAdminAuth);

adminCodeChefRouter.get('/students', asyncHandler(controller.getAdminStudents));
adminCodeChefRouter.get('/leaderboard', asyncHandler(controller.getAdminLeaderboard));
adminCodeChefRouter.get('/stats', asyncHandler(controller.getAdminStats));
adminCodeChefRouter.get('/export', asyncHandler(controller.exportStudentsCsv));
adminCodeChefRouter.get('/students/:studentId', asyncHandler(controller.getAdminStudentDetails));
adminCodeChefRouter.post('/students/:studentId/resync', asyncHandler(controller.adminResyncStudent));
adminCodeChefRouter.post('/students/:studentId/verify', asyncHandler(controller.adminVerifyStudent));
adminCodeChefRouter.delete('/students/:studentId', asyncHandler(controller.adminUnlinkStudent));

// 3. Internal CodeChef Router (/api/internal)
export const internalCodeChefRouter = Router();
internalCodeChefRouter.post('/codechef-sync-tick', asyncHandler(controller.handleInternalSyncTick));

export default studentCodeChefRouter;
