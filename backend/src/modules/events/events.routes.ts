import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { requireAdminAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './events.controller';

// Student events router (mounted at /api/student/events)
export const studentEventsRouter = Router();
studentEventsRouter.use(requireStudentAuth);
studentEventsRouter.get('/', asyncHandler(controller.getStudentEvents));
studentEventsRouter.get('/:id', asyncHandler(controller.getStudentEventById));

// Admin API events router (mounted in /admin/api)
export const adminEventsRouter = Router();
adminEventsRouter.use(requireAdminAuth);
adminEventsRouter.get('/events', asyncHandler(controller.getAdminEvents));
adminEventsRouter.get('/registrations', asyncHandler(controller.getRegistrations));
adminEventsRouter.get('/registrations/export', asyncHandler(controller.exportRegistrations));
adminEventsRouter.get('/registrations/:id', asyncHandler(controller.getRegistrationById));
adminEventsRouter.patch('/registrations/:id/status', asyncHandler(controller.updateRegistrationStatus));
adminEventsRouter.delete('/registrations/:id', asyncHandler(controller.deleteRegistration));
adminEventsRouter.get('/teams', asyncHandler(controller.getTeams));
adminEventsRouter.patch('/teams/:id/status', asyncHandler(controller.updateTeamStatus));
adminEventsRouter.post('/teams/:id/members/remove', asyncHandler(controller.removeTeamMember));

// Admin Portal events router (mounted in /admin/portal)
export const portalEventsRouter = Router();
portalEventsRouter.use(requireAdminAuth);
portalEventsRouter.get('/events', asyncHandler(controller.getPortalEvents));
portalEventsRouter.post('/events', asyncHandler(controller.createPortalEvent));
portalEventsRouter.get('/events/:id', asyncHandler(controller.getPortalEventById));
portalEventsRouter.put('/events/:id', asyncHandler(controller.updatePortalEvent));
portalEventsRouter.post('/events/:id/publish', asyncHandler(controller.publishPortalEvent));
portalEventsRouter.post('/events/:id/close', asyncHandler(controller.closePortalEvent));
portalEventsRouter.post('/events/:id/archive', asyncHandler(controller.archivePortalEvent));
portalEventsRouter.delete('/events/:id', asyncHandler(controller.deletePortalEvent));
portalEventsRouter.get('/events/:id/registrations', asyncHandler(controller.getPortalEventRegistrations));
portalEventsRouter.post('/events/:id/form-fields', asyncHandler(controller.createPortalEventFormField));
portalEventsRouter.put('/events/:id/form-fields/:fieldId', asyncHandler(controller.updatePortalEventFormField));
portalEventsRouter.delete('/events/:id/form-fields/:fieldId', asyncHandler(controller.deletePortalEventFormField));

export default studentEventsRouter;
