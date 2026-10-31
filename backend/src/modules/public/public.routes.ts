import { Router } from 'express';
import { submissionUploadMiddleware } from '../../middleware/upload';
import { submissionRateLimiter } from '../../middleware/rateLimiter';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './public.controller';

// 1. General Public Router (/api)
export const publicRouter = Router();

publicRouter.get('/branches', asyncHandler(controller.getBranches));
publicRouter.get('/sections', asyncHandler(controller.getSections));
publicRouter.get('/years', asyncHandler(controller.getYears));
publicRouter.post('/submissions', submissionRateLimiter, submissionUploadMiddleware, asyncHandler(controller.submitLegacyApplication));
publicRouter.get('/public/events', asyncHandler(controller.getPublicEvents));
publicRouter.get('/public/events/:id', asyncHandler(controller.getPublicEventById));
publicRouter.get(['/media/thumbnail/:type/:id', '/public/media/thumbnail/:type/:id'], asyncHandler(controller.getMediaThumbnail));
publicRouter.get('/public/media/:type/:fileId', asyncHandler(controller.streamPublicMedia));

// 2. Public Students Router (/api/public/students)
export const publicStudentRouter = Router();

publicStudentRouter.get('/', asyncHandler(controller.listPublicStudents));
publicStudentRouter.get('/index', asyncHandler(controller.getPublicStudentsIndex));
publicStudentRouter.get('/skills', asyncHandler(controller.listPublicSkills));
publicStudentRouter.get('/events', asyncHandler(controller.getPublicStudentsEvents));
publicStudentRouter.get('/:rollNo', asyncHandler(controller.getPublicStudentByRollNo));
publicStudentRouter.get('/:rollNo/resume', asyncHandler(controller.getPublicStudentResume));

// 3. Public Videos Router (/api/public/videos)
export const publicVideoRouter = Router();

publicVideoRouter.get('/', asyncHandler(controller.listPublicVideos));
publicVideoRouter.get('/featured', asyncHandler(controller.getFeaturedPublicVideos));
publicVideoRouter.get('/stream/:id', asyncHandler(controller.streamPublicVideo));

export default publicRouter;
