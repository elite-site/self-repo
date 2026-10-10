import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { submissionRateLimiter } from '../../middleware/rateLimiter';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  deprecatedSubmission,
  deleteSubmission,
  updateVisibility,
  streamVideo,
  createSession,
  completeVideo,
  streamUpload,
} from '../../controllers/student/video.controller';

const router = Router();

router.post('/submission', requireStudentAuth, deprecatedSubmission);
router.delete('/submission', requireStudentAuth, asyncHandler(deleteSubmission));
router.patch('/submission/video-visibility', requireStudentAuth, asyncHandler(updateVisibility));
router.get('/submission/media/video', requireStudentAuth, asyncHandler(streamVideo));
router.post('/submission/video-session', requireStudentAuth, submissionRateLimiter, asyncHandler(createSession));
router.post('/submission/video-complete', requireStudentAuth, submissionRateLimiter, asyncHandler(completeVideo));
router.post('/submission/video-stream', requireStudentAuth, submissionRateLimiter, asyncHandler(streamUpload));

export default router;
