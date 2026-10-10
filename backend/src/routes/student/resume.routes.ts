import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { submissionRateLimiter } from '../../middleware/rateLimiter';
import { resumeUpload } from '../../middleware/upload';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  getResumes,
  postResume,
  deleteResume,
} from '../../controllers/student/resume.controller';

const router = Router();

router.get('/resume', requireStudentAuth, asyncHandler(getResumes));
router.post('/resume', requireStudentAuth, submissionRateLimiter, resumeUpload, asyncHandler(postResume));
router.delete('/resume', requireStudentAuth, asyncHandler(deleteResume));

export default router;
