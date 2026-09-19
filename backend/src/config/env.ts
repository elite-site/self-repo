import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/photoclub?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_photoclub_change_in_production',
  ADMIN_SESSION_COOKIE_NAME: process.env.ADMIN_SESSION_COOKIE_NAME || 'pc_admin_session',
  STUDENT_JWT_SECRET: process.env.STUDENT_JWT_SECRET || 'student_jwt_secret_change_in_production',

  // Google Drive OAuth 2.0 (Primary)
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '',

  // Google Drive Service Account (Legacy/Fallback)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',

  // Resend
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'Self Introduction <elite@sasi.ac.in>',

  // Size Limits (25 MB strictly for videos)
  MAX_IMAGE_SIZE_MB: parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10),
  MAX_AUDIO_SIZE_MB: parseInt(process.env.MAX_AUDIO_SIZE_MB || '10', 10),
  MAX_VIDEO_SIZE_MB: parseInt(process.env.MAX_VIDEO_SIZE_MB || '25', 10),

  // CORS - parse comma-separated list of allowed origins or single origin safely
  ALLOWED_ORIGINS: (() => {
    const raw = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '';
    const defaults = [
      'https://self-repo.onrender.com',
      'https://self-e.netlify.app',
      'https://elitephotoit.netlify.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
    ];

    const set = new Set<string>();
    if (raw) {
      for (const item of raw.split(',')) {
        const trimmed = item.trim().replace(/\/$/, '');
        if (trimmed) set.add(trimmed);
      }
    }
    for (const d of defaults) {
      set.add(d.trim().replace(/\/$/, ''));
    }
    return Array.from(set);
  })(),

  // Defaults
  EVENT_YEAR: parseInt(process.env.EVENT_YEAR || '2026', 10),
  ADMIN_DEFAULT_EMAIL: process.env.ADMIN_DEFAULT_EMAIL || 'admin@club.internal',
  ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_DEFAULT_PASSWORD || 'AdminPassword123!',
};
