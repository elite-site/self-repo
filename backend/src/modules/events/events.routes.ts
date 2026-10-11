import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { requireAdminAuth } from '../../middleware/auth';
import * as controller from './events.controller';

// Student events router (mounted at /api/student/events)
export const studentEventsRouter = Router();
studentEventsRouter.use(requireStudentAuth);
studentEventsRouter.get('/', controller.getStudentEvents);
studentEventsRouter.get('/:id', controller.getStudentEventById);

// Admin API events router (mounted in /admin/api)
export const adminEventsRouter = Router();
adminEventsRouter.use(requireAdminAuth);
adminEventsRouter.get('/events', controller.getAdminEvents);
adminEventsRouter.get('/registrations', controller.getRegistrations);
adminEventsRouter.get('/registrations/export', controller.exportRegistrations);
adminEventsRouter.get('/registrations/:id', controller.getRegistrationById);
adminEventsRouter.patch('/registrations/:id/status', controller.updateRegistrationStatus);
adminEventsRouter.delete('/registrations/:id', controller.deleteRegistration);
adminEventsRouter.get('/teams', controller.getTeams);
adminEventsRouter.patch('/teams/:id/status', controller.updateTeamStatus);
adminEventsRouter.post('/teams/:id/members/remove', controller.removeTeamMember);

// Admin Portal events router (mounted in /admin/portal)
export const portalEventsRouter = Router();
portalEventsRouter.use(requireAdminAuth);
portalEventsRouter.get('/events', controller.getPortalEvents);
portalEventsRouter.post('/events', controller.createPortalEvent);
portalEventsRouter.get('/events/:id', controller.getPortalEventById);
portalEventsRouter.put('/events/:id', controller.updatePortalEvent);
portalEventsRouter.post('/events/:id/publish', controller.publishPortalEvent);
portalEventsRouter.post('/events/:id/close', controller.closePortalEvent);
portalEventsRouter.post('/events/:id/archive', controller.archivePortalEvent);
portalEventsRouter.delete('/events/:id', controller.deletePortalEvent);
portalEventsRouter.get('/events/:id/registrations', controller.getPortalEventRegistrations);
portalEventsRouter.post('/events/:id/form-fields', controller.createPortalEventFormField);
portalEventsRouter.put('/events/:id/form-fields/:fieldId', controller.updatePortalEventFormField);
portalEventsRouter.delete('/events/:id/form-fields/:fieldId', controller.deletePortalEventFormField);

export default studentEventsRouter;
