/**
 * Admin — new portal management routes skeleton — Phase 7
 * All require requireAdminAuth (already set at /admin/api level in server.ts).
 *
 * Students:
 *   GET  /admin/api/portal/students              — student list with filters
 *   GET  /admin/api/portal/students/:id          — student detail
 *   PUT  /admin/api/portal/students/:id/status   — change student status/visibility
 *   PUT  /admin/api/portal/students/:id/feature  — feature / unfeature
 *
 * Moderation:
 *   GET  /admin/api/portal/moderation            — queue (tab: videos|resumes|achievements|certs)
 *   POST /admin/api/portal/moderation/:type/:id/approve
 *   POST /admin/api/portal/moderation/:type/:id/reject
 *   POST /admin/api/portal/moderation/:type/:id/request-changes
 *   POST /admin/api/portal/moderation/:type/:id/hide
 *
 * Events (admin):
 *   GET  /admin/api/portal/events
 *   POST /admin/api/portal/events
 *   PUT  /admin/api/portal/events/:id
 *   POST /admin/api/portal/events/:id/publish
 *   POST /admin/api/portal/events/:id/close
 *   POST /admin/api/portal/events/:id/archive
 *   GET  /admin/api/portal/events/:id/registrations
 *   POST /admin/api/portal/events/:id/form-fields
 *   PUT  /admin/api/portal/events/:id/form-fields/:fieldId
 *   DELETE /admin/api/portal/events/:id/form-fields/:fieldId
 *
 * Voting:
 *   GET  /admin/api/portal/voting
 *   POST /admin/api/portal/voting
 *   GET  /admin/api/portal/voting/:id
 *   POST /admin/api/portal/voting/:id/activate
 *   POST /admin/api/portal/voting/:id/close
 *   POST /admin/api/portal/voting/:id/finalize
 *   GET  /admin/api/portal/voting/:id/results
 *
 * Communications:
 *   GET  /admin/api/portal/announcements
 *   POST /admin/api/portal/announcements
 *   POST /admin/api/portal/announcements/:id/publish
 *
 * Analytics:
 *   GET  /admin/api/portal/analytics
 *
 * Settings:
 *   GET  /admin/api/portal/settings
 *   PUT  /admin/api/portal/settings
 *
 * Roles:
 *   GET  /admin/api/portal/roles
 *   POST /admin/api/portal/roles
 *   PUT  /admin/api/portal/roles/:id
 *   GET  /admin/api/portal/roles/:id/permissions
 *   PUT  /admin/api/portal/roles/:id/permissions
 *
 * Change Requests:
 *   GET  /admin/api/portal/change-requests
 *   POST /admin/api/portal/change-requests/:id/approve
 *   POST /admin/api/portal/change-requests/:id/reject
 *
 * Skill Requests:
 *   GET  /admin/api/portal/skill-requests
 *   POST /admin/api/portal/skill-requests/:id/approve
 *   POST /admin/api/portal/skill-requests/:id/reject
 *
 * Skills:
 *   GET  /admin/api/portal/skills
 *   POST /admin/api/portal/skills
 *   PUT  /admin/api/portal/skills/:id
 */
import { Router, Request, Response } from 'express';
import { requireAdminAuth } from '../middleware/auth';

const router = Router();
router.use(requireAdminAuth);

const stub = (_req: Request, res: Response) =>
  res.status(501).json({ error: 'NOT_IMPLEMENTED', message: 'Phase 7 — admin portal management coming soon' });

// ── Students
router.get('/students', stub);
router.get('/students/:id', stub);
router.put('/students/:id/status', stub);
router.put('/students/:id/feature', stub);

// ── Moderation
router.get('/moderation', stub);
router.post('/moderation/:type/:id/approve', stub);
router.post('/moderation/:type/:id/reject', stub);
router.post('/moderation/:type/:id/request-changes', stub);
router.post('/moderation/:type/:id/hide', stub);

// ── Events (admin)
router.get('/events', stub);
router.post('/events', stub);
router.get('/events/:id', stub);
router.put('/events/:id', stub);
router.post('/events/:id/publish', stub);
router.post('/events/:id/close', stub);
router.post('/events/:id/archive', stub);
router.get('/events/:id/registrations', stub);
router.post('/events/:id/form-fields', stub);
router.put('/events/:id/form-fields/:fieldId', stub);
router.delete('/events/:id/form-fields/:fieldId', stub);

// ── Voting
router.get('/voting', stub);
router.post('/voting', stub);
router.get('/voting/:id', stub);
router.post('/voting/:id/activate', stub);
router.post('/voting/:id/close', stub);
router.post('/voting/:id/finalize', stub);
router.get('/voting/:id/results', stub);

// ── Communications
router.get('/announcements', stub);
router.post('/announcements', stub);
router.post('/announcements/:id/publish', stub);

// ── Analytics
router.get('/analytics', stub);

// ── Settings
router.get('/settings', stub);
router.put('/settings', stub);

// ── Roles & Permissions
router.get('/roles', stub);
router.post('/roles', stub);
router.put('/roles/:id', stub);
router.get('/roles/:id/permissions', stub);
router.put('/roles/:id/permissions', stub);

// ── Change Requests (academic)
router.get('/change-requests', stub);
router.post('/change-requests/:id/approve', stub);
router.post('/change-requests/:id/reject', stub);

// ── Skill Requests
router.get('/skill-requests', stub);
router.post('/skill-requests/:id/approve', stub);
router.post('/skill-requests/:id/reject', stub);

// ── Skills
router.get('/skills', stub);
router.post('/skills', stub);
router.put('/skills/:id', stub);

export default router;
