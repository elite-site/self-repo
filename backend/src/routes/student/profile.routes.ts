import { Router } from 'express';
import { requireStudentAuth } from '../../middleware/studentAuth';
import { profilePhotoUpload } from '../../middleware/upload';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  getProfile,
  updateProfile,
  uploadPhoto,
  deletePhoto,
  getSkills,
  updateSkills,
  submitChangeRequest,
  getChangeRequests,
} from '../../controllers/student/profile.controller';

const router = Router();
router.use(requireStudentAuth);

router.get('/', asyncHandler(getProfile));
router.put('/', asyncHandler(updateProfile));
router.post('/photo', profilePhotoUpload, asyncHandler(uploadPhoto));
router.delete('/photo', asyncHandler(deletePhoto));
router.get('/skills', asyncHandler(getSkills));
router.put('/skills', asyncHandler(updateSkills));
router.post('/change-request', asyncHandler(submitChangeRequest));
router.get('/change-requests', asyncHandler(getChangeRequests));

export default router;
