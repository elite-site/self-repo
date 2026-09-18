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

export const studentImportUploadMiddleware = upload.single('file');