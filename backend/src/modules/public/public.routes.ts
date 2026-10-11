import { Router } from 'express';
import { submissionUploadMiddleware } from '../../middleware/upload';
import { submissionRateLimiter } from '../../middleware/rateLimiter';
import * as controller from './public.controller';

// 1. General Public Router (/api)
export const publicRouter = Router();

publicRouter.get('/branches', controller.getBranches);
publicRouter.get('/sections', controller.getSections);
publicRouter.get('/years', controller.getYears);
publicRouter.post('/submissions', submissionRateLimiter, submissionUploadMiddleware, controller.submitLegacyApplication);
publicRouter.get('/public/events', controller.getPublicEvents);
publicRouter.get('/public/events/:id', controller.getPublicEventById);
publicRouter.get(['/media/thumbnail/:type/:id', '/public/media/thumbnail/:type/:id'], controller.getMediaThumbnail);
publicRouter.get('/public/media/:type/:fileId', controller.streamPublicMedia);

// 2. Public Students Router (/api/public/students)
export const publicStudentRouter = Router();

publicStudentRouter.get('/', controller.listPublicStudents);
publicStudentRouter.get('/index', controller.getPublicStudentsIndex);
publicStudentRouter.get('/skills', controller.listPublicSkills);
publicStudentRouter.get('/events', controller.getPublicStudentsEvents);
publicStudentRouter.get('/:rollNo', controller.getPublicStudentByRollNo);
publicStudentRouter.get('/:rollNo/resume', controller.getPublicStudentResume);

// 3. Public Videos Router (/api/public/videos)
export const publicVideoRouter = Router();

publicVideoRouter.get('/', controller.listPublicVideos);
publicVideoRouter.get('/featured', controller.getFeaturedPublicVideos);
publicVideoRouter.get('/stream/:id', controller.streamPublicVideo);

export default publicRouter;
