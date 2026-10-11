import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/auth';
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
adminAcademicYearRouter.post('/promote', controller.promoteAcademicYear);

// ── 2. Admin Settings Router (General Settings & Skills) ──
export const adminSettingsRouter = Router();
adminSettingsRouter.use(requireAdminAuth);
adminSettingsRouter.get('/settings', controller.getSettings);
adminSettingsRouter.put('/settings', controller.updateSettings);
adminSettingsRouter.get('/skills', controller.listSkills);
adminSettingsRouter.post('/skills', controller.createSkill);
adminSettingsRouter.delete('/skills/:id', controller.deleteSkill);

// ── 3. Admin Portal Settings Router (RBAC, Portal Settings) ──
export const adminPortalSettingsRouter = Router();
adminPortalSettingsRouter.use(requireAdminAuth);
adminPortalSettingsRouter.get('/settings', controller.getPortalSettings);
adminPortalSettingsRouter.put('/settings', controller.updatePortalSettings);
adminPortalSettingsRouter.get('/roles', controller.listRoles);
adminPortalSettingsRouter.post('/roles', controller.createRole);
adminPortalSettingsRouter.put('/roles/:id', controller.updateRole);
adminPortalSettingsRouter.delete('/roles/:id', controller.deleteRole);
adminPortalSettingsRouter.get('/permissions', controller.listPermissions);
adminPortalSettingsRouter.get('/admins', controller.listAdmins);
adminPortalSettingsRouter.post('/admins', controller.createAdmin);
adminPortalSettingsRouter.put('/admins/:id', controller.updateAdmin);
adminPortalSettingsRouter.delete('/admins/:id', controller.deleteAdmin);

// ── 4. Admin Stats Router ──
export const adminStatsRouter = Router();
adminStatsRouter.use(requireAdminAuth);
adminStatsRouter.get('/stats', controller.getStats);
adminStatsRouter.get('/activity-logs', controller.getActivityLogs);
adminStatsRouter.get('/activity-logs/export', controller.exportActivityLogs);

// ── 5. Admin Storage Router ──
export const adminStorageRouter = Router();
adminStorageRouter.use(requireAdminAuth);
adminStorageRouter.get('/storage', controller.getStorage);
adminStorageRouter.post('/storage/clear-cache', controller.clearStorageCache);

// ── 6. Admin Portal Voting Router ──
export const adminPortalVotingRouter = Router();
adminPortalVotingRouter.use(requireAdminAuth);
adminPortalVotingRouter.get('/voting', controller.listVotingCampaigns);
adminPortalVotingRouter.post('/voting', controller.createVotingCampaign);
adminPortalVotingRouter.get('/voting/:id', controller.getVotingCampaign);
adminPortalVotingRouter.put('/voting/:id', controller.updateVotingCampaign);
adminPortalVotingRouter.delete('/voting/:id', controller.deleteVotingCampaign);
adminPortalVotingRouter.post('/voting/:id/candidates', controller.addVotingCandidate);
adminPortalVotingRouter.delete('/voting/:id/candidates/:candidateId', controller.removeVotingCandidate);

// ── 7. Admin Portal Router ──
export const adminPortalRouter = Router();
adminPortalRouter.use(requireAdminAuth);

adminPortalRouter.get('/students', controller.getPortalStudents);
adminPortalRouter.get('/students/:id', controller.getPortalStudentDetail);
adminPortalRouter.post('/students/:studentId/items/:type/:itemId/request-change', controller.requestItemChange);
adminPortalRouter.delete('/students/:studentId/items/:type/:itemId', controller.deleteStudentItem);
adminPortalRouter.put('/students/:id/status', controller.updateStudentProfileStatus);
adminPortalRouter.put('/students/:id/feature', controller.toggleStudentFeature);

adminPortalRouter.use(portalModerationRouter);
adminPortalRouter.use(portalEventsRouter);
adminPortalRouter.use(adminPortalVotingRouter);

adminPortalRouter.get('/announcements', controller.listPortalAnnouncements);
adminPortalRouter.post('/announcements', controller.createPortalAnnouncement);
adminPortalRouter.post('/announcements/:id/publish', controller.publishPortalAnnouncement);
adminPortalRouter.get('/analytics', controller.getPortalAnalytics);

adminPortalRouter.use(adminPortalSettingsRouter);
adminPortalRouter.use(adminPortalGithubRouter);

// ── 8. Main Admin API Router ──
export const adminApiRouter = Router();
adminApiRouter.use(requireAdminAuth);

adminApiRouter.use(adminEventsRouter);
adminApiRouter.use(adminStatsRouter);

adminApiRouter.get('/submissions', controller.listSubmissions);
adminApiRouter.get('/submissions/:id', controller.getSubmissionDetail);
adminApiRouter.get('/submissions/:id/media/:fileKey', controller.streamMedia);
adminApiRouter.patch('/submissions/:id/rating', controller.updateRating);
adminApiRouter.patch('/submissions/:id/review', controller.updateReview);
adminApiRouter.patch('/submissions/:id/status', controller.updateStatus);
adminApiRouter.post('/submissions/:id/request-video', controller.requestNewVideo);
adminApiRouter.delete('/submissions/:id/video', controller.deleteSubmissionVideo);
adminApiRouter.delete('/submissions/:id', controller.deleteSubmission);

adminApiRouter.get('/students', controller.getRoster);
adminApiRouter.get('/students/export', controller.exportRoster);
adminApiRouter.get('/export/excel', controller.exportSubmissions);

adminApiRouter.use(adminModerationRouter);
adminApiRouter.use(adminVotingRouter);
adminApiRouter.use(adminAnnouncementsRouter);
adminApiRouter.use(adminSettingsRouter);
adminApiRouter.use(adminStorageRouter);
adminApiRouter.use(adminEmailRouter);

export default adminApiRouter;
