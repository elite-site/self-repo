import multer from 'multer';
import { env } from '../config/env';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    // Top limit is max video size (25MB by default)
    fileSize: env.MAX_VIDEO_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

export const submissionUploadMiddleware = upload.fields([
  { name: 'video', maxCount: 1 },
]);

export const profilePhotoUpload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (['image/jpeg','image/png','image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WebP allowed'));
  }
}).single('photo');

export const certificateUpload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (['application/pdf','image/jpeg','image/png'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, JPG, PNG allowed'));
  }
}).single('file');

export const resumeUpload = upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

export const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, and WebP allowed'));
    }
  }
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'proof', maxCount: 1 },
]);