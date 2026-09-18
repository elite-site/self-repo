import multer from 'multer';
import { env } from '../config/env';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    // Top limit is max video size (150MB by default)
    fileSize: env.MAX_VIDEO_SIZE_MB * 1024 * 1024,
    files: 5, // photo1, photo2, photo3, video, audio
  },
});

export const submissionUploadMiddleware = upload.fields([
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 },
  { name: 'photo3', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);
