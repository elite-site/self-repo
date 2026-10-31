import multer from 'multer';
import { getMaxVideoHardCapMb } from '../services/limits.service';

/**
 * A rejected upload the caller can fix (wrong type, bad field). Carries an
 * explicit 400 so `errorHandler` does not report it as a server fault.
 */
export class UploadValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    // Hard ceiling on the buffered body. The effective, administrator-configurable
    // limit is enforced in ValidationService.validateVideo, which runs per request
    // and can read the setting; multer only bounds memory.
    fileSize: getMaxVideoHardCapMb() * 1024 * 1024,
    files: 1,
  },
});

export const submissionUploadMiddleware = upload.fields([
  { name: 'video', maxCount: 1 },
]);

export const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg','image/png','image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new UploadValidationError('Only JPG, PNG, WebP allowed'));
  }
}).single('photo');

export const certificateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['application/pdf','image/jpeg','image/png'].includes(file.mimetype)) cb(null, true);
    else cb(new UploadValidationError('Only PDF, JPG, PNG allowed'));
  }
}).single('file');

// Resumes are PDF-only and capped at 10MB. This deliberately does NOT reuse the
// shared `upload` instance: that one is sized for videos (MAX_VIDEO_SIZE_MB) and
// has no type filter, which let any file type through as a "resume" and left the
// server limit disagreeing with the 10MB the portal enforces in the browser.
export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new UploadValidationError('Resume must be a PDF document.'));
  },
}).fields([
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
      cb(new UploadValidationError('Only PDF, JPG, PNG, and WebP allowed'));
    }
  }
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'proof', maxCount: 1 },
]);

/**
 * Study resources are metadata + one attachment. The declared MIME type is only
 * a coarse first pass; ValidationService.validateResourceFile checks magic bytes
 * before anything reaches Drive.
 */
const RESOURCE_ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const resourceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (RESOURCE_ALLOWED_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new UploadValidationError('Unsupported resource file type.'));
  },
}).single('file');
