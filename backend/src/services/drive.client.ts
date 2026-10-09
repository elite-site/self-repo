import fs from 'fs';
import path from 'path';
import { google, drive_v3 } from 'googleapis';
import { env } from '../config/env';

export interface DriveClientInitResult {
  drive: drive_v3.Drive | null;
  isMock: boolean;
  mockBaseDir: string;
  oauthClient: InstanceType<typeof google.auth.OAuth2> | null;
  serviceAccountAuth: InstanceType<typeof google.auth.GoogleAuth> | null;
}

export function initDriveClient(): DriveClientInitResult {
  const mockBaseDir = path.resolve(__dirname, '../../storage/mock-drive');
  let drive: drive_v3.Drive | null = null;
  let isMock = false;
  let oauthClient: InstanceType<typeof google.auth.OAuth2> | null = null;
  let serviceAccountAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

  // 1. Try Google OAuth 2.0 (Primary & Recommended for Workspace My Drive)
  if (
    env.GOOGLE_OAUTH_CLIENT_ID &&
    env.GOOGLE_OAUTH_CLIENT_SECRET &&
    env.GOOGLE_OAUTH_REFRESH_TOKEN &&
    env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  ) {
    try {
      const oauth2 = new google.auth.OAuth2(
        env.GOOGLE_OAUTH_CLIENT_ID,
        env.GOOGLE_OAUTH_CLIENT_SECRET
      );
      oauth2.setCredentials({
        refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
      });
      drive = google.drive({ version: 'v3', auth: oauth2 });
      oauthClient = oauth2; // store for token refresh
      isMock = false;
      console.log('✅ Google Drive API initialized with OAuth 2.0 Refresh Token (Workspace Account)');
    } catch (err) {
      if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
        throw new Error('[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.');
      }
      console.warn('⚠️ Failed to initialize Google Drive OAuth 2.0 auth. Falling back to local storage mock.', err);
      isMock = true;
    }
  }
  // 2. Try Service Account Auth (Legacy Fallback)
  else if (
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  ) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      drive = google.drive({ version: 'v3', auth });
      serviceAccountAuth = auth; // store for token refresh
      isMock = false;
      console.log('✅ Google Drive API initialized with Service Account');
    } catch (err) {
      if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
        throw new Error('[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.');
      }
      console.warn('⚠️ Failed to initialize Google Drive auth. Falling back to local storage mock.', err);
      isMock = true;
    }
  } else {
    if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
      throw new Error('[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.');
    }
    console.log('ℹ️ Google Drive credentials not set. Using local mock storage for Drive.');
    isMock = true;
  }

  if (isMock && !fs.existsSync(mockBaseDir)) {
    fs.mkdirSync(mockBaseDir, { recursive: true });
  }

  return { drive, isMock, mockBaseDir, oauthClient, serviceAccountAuth };
}
