import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { videoPlaybackRateLimiter } from '../../middleware/rateLimiter';
import * as controller from './progress.controller';

export const studentProgressRouter = Router();
studentProgressRouter.use(requireStudentAuth);

studentProgressRouter.get('/my-learning', asyncHandler(controller.getMyLearning));
studentProgressRouter.get('/lessons/:id', asyncHandler(controller.getLesson));
studentProgressRouter.post('/lessons/:id/progress', asyncHandler(controller.updateLessonProgress));

// Video playback and lease management
studentProgressRouter.post('/lessons/:id/playback', videoPlaybackRateLimiter, asyncHandler(controller.getLessonPlayback));
studentProgressRouter.post('/lessons/:id/playback/heartbeat', videoPlaybackRateLimiter, asyncHandler(controller.heartbeatLessonPlayback));
studentProgressRouter.delete('/lessons/:id/playback', asyncHandler(controller.releaseLessonPlayback));
studentProgressRouter.post('/lessons/:id/playback/release', asyncHandler(controller.releaseLessonPlayback));
