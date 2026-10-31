import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './admin.controller';

// Cross-module routers that are mounted within admin
import { adminEventsRouter, portalEventsRouter } from '../events';
import { adminModerationRouter, portalModerationRouter } from '../moderation';
import { adminVotingRouter } from '../voting';
import { announcementsRouter as adminAnnouncementsRouter } from '../announcements';
import { emailRouter as adminEmailRouter } from '../email';
import { adminPortalGithubRouter } from '../github';

// ── 1. Admin Academic Year Router ──
export const adminAcademicYearRouter = Router();
adminAcademicYearRouter.use(requireAdminAuth);
adminAcademicYearRouter.post('/promote', asyncHandler(controller.promoteAcademicYear));

// ── 2. Admin Portal Settings Router (RBAC, Portal Settings) ──
export const adminPortalSettingsRouter = Router();
adminPortalSettingsRouter.use(requireAdminAuth);
adminPortalSettingsRouter.get('/settings', asyncHandler(controller.getPortalSettings));
adminPortalSettingsRouter.put('/settings', asyncHandler(controller.updatePortalSettings));
adminPortalSettingsRouter.get('/roles', asyncHandler(controller.listRoles));
adminPortalSettingsRouter.post('/roles', asyncHandler(controller.createRole));
adminPortalSettingsRouter.post('/roles/assign', asyncHandler(controller.assignRole));
adminPortalSettingsRouter.put('/roles/:id', asyncHandler(controller.updateRole));
adminPortalSettingsRouter.delete('/roles/:id', asyncHandler(controller.deleteRole));
adminPortalSettingsRouter.get('/permissions', asyncHandler(controller.listPermissions));
adminPortalSettingsRouter.get('/admins', asyncHandler(controller.listAdmins));
adminPortalSettingsRouter.post('/admins', asyncHandler(controller.createAdmin));
adminPortalSettingsRouter.put('/admins/:id', asyncHandler(controller.updateAdmin));
adminPortalSettingsRouter.delete('/admins/:id', asyncHandler(controller.deleteAdmin));

// ── 3. Admin Stats Router ──
export const adminStatsRouter = Router();
adminStatsRouter.use(requireAdminAuth);
adminStatsRouter.get('/stats', asyncHandler(controller.getStats));
adminStatsRouter.get('/activity-logs', asyncHandler(controller.getActivityLogs));
adminStatsRouter.get('/activity-logs/export', asyncHandler(controller.exportActivityLogs));

// ── 4. Admin Storage Router ──
export const adminStorageRouter = Router();
adminStorageRouter.use(requireAdminAuth);
adminStorageRouter.get('/storage', asyncHandler(controller.getStorage));
adminStorageRouter.post('/storage/clear-cache', asyncHandler(controller.clearStorageCache));
adminStorageRouter.post(
  '/storage/ensure-viewer-permissions',
  asyncHandler(controller.ensureViewerPermissions)
);

// ── 5. Admin Portal Router ──
export const adminPortalRouter = Router();
adminPortalRouter.use(requireAdminAuth);

adminPortalRouter.get('/students/:id', asyncHandler(controller.getPortalStudentDetail));
adminPortalRouter.post('/students/:studentId/items/:type/:itemId/request-change', asyncHandler(controller.requestItemChange));
adminPortalRouter.delete('/students/:studentId/items/:type/:itemId', asyncHandler(controller.deleteStudentItem));
adminPortalRouter.put('/students/:id/status', asyncHandler(controller.updateStudentProfileStatus));
adminPortalRouter.put('/students/:id/feature', asyncHandler(controller.toggleStudentFeature));

adminPortalRouter.use(portalModerationRouter);
adminPortalRouter.use(portalEventsRouter);

adminPortalRouter.get('/announcements', asyncHandler(controller.listPortalAnnouncements));
adminPortalRouter.post('/announcements', asyncHandler(controller.createPortalAnnouncement));
adminPortalRouter.post('/announcements/:id/publish', asyncHandler(controller.publishPortalAnnouncement));
adminPortalRouter.get('/analytics', asyncHandler(controller.getPortalAnalytics));

adminPortalRouter.use(adminPortalSettingsRouter);
adminPortalRouter.use(adminPortalGithubRouter);

// ── 6. Main Admin API Router ──
export const adminApiRouter = Router();
adminApiRouter.use(requireAdminAuth);

adminApiRouter.use(adminEventsRouter);
adminApiRouter.use(adminStatsRouter);

adminApiRouter.get('/submissions', asyncHandler(controller.listSubmissions));
adminApiRouter.get('/submissions/export', asyncHandler(controller.exportSubmissions));
adminApiRouter.get('/submissions/:id', asyncHandler(controller.getSubmissionDetail));
adminApiRouter.get('/submissions/:id/media/:fileKey', asyncHandler(controller.streamMedia));
adminApiRouter.patch('/submissions/:id/rating', asyncHandler(controller.updateRating));
adminApiRouter.patch('/submissions/:id/review', asyncHandler(controller.updateReview));
adminApiRouter.patch('/submissions/:id/status', asyncHandler(controller.updateStatus));
adminApiRouter.post('/submissions/:id/request-video', asyncHandler(controller.requestNewVideo));
adminApiRouter.delete('/submissions/:id/video', asyncHandler(controller.deleteSubmissionVideo));
adminApiRouter.delete('/submissions/:id', asyncHandler(controller.deleteSubmission));

adminApiRouter.get('/students', asyncHandler(controller.getRoster));
adminApiRouter.get('/students/export', asyncHandler(controller.exportRoster));
adminApiRouter.get('/export/excel', asyncHandler(controller.exportSubmissions));

adminApiRouter.use(adminModerationRouter);
adminApiRouter.use(adminVotingRouter);
adminApiRouter.use(adminAnnouncementsRouter);
adminApiRouter.use(adminStorageRouter);
adminApiRouter.use(adminEmailRouter);

export default adminApiRouter;
