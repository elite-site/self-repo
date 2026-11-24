import fs from 'fs';
import path from 'path';
import { google, drive_v3 } from 'googleapis';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { DriveContext } from './types';

export interface DriveClientInitResult {
  drive: drive_v3.Drive | null;
  isMock: boolean;
  mockBaseDir: string;
  oauthClient: InstanceType<typeof google.auth.OAuth2> | null;
  serviceAccountAuth: InstanceType<typeof google.auth.GoogleAuth> | null;
}

export function initDriveClient(): DriveClientInitResult {
  const mockBaseDir = path.resolve(process.cwd(), 'storage/mock-drive');
  let drive: drive_v3.Drive | null = null;
  let isMock: boolean;
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
      logger.info('[Drive] Initialized Google Drive API with OAuth 2.0 Refresh Token');
    } catch (err) {
      if (env.NODE_ENV === 'production') {
        throw new Error('[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.', { cause: err });
      }
      logger.warn('[Drive] Failed to initialize OAuth 2.0 auth; falling back to local storage mock', { err });
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
      logger.info('[Drive] Initialized Google Drive API with Service Account');
    } catch (err) {
      if (env.NODE_ENV === 'production') {
        throw new Error('[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.', { cause: err });
      }
      logger.warn('[Drive] Failed to initialize Google Drive auth; falling back to local storage mock', { err });
      isMock = true;
    }
  } else {
    if (env.NODE_ENV === 'production') {
      throw new Error('[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.');
    }
    logger.info('[Drive] Credentials not set; using local mock storage');
    isMock = true;
  }

  if (isMock && !fs.existsSync(mockBaseDir)) {
    fs.mkdirSync(mockBaseDir, { recursive: true });
  }

  return { drive, isMock, mockBaseDir, oauthClient, serviceAccountAuth };
}

export function createDriveContext(): DriveContext {
  const initialized = initDriveClient();

  return {
    drive: initialized.drive,
    isMock: initialized.isMock,
    mockBaseDir: initialized.mockBaseDir,
    oauthClient: initialized.oauthClient,
    serviceAccountAuth: initialized.serviceAccountAuth,
    viewerPermissionCache: new Set<string>(),
    anyoneReadableCache: new Map<string, number>(),
    negativePermissionCache: new Map<string, number>(),
    folderMemoryCache: new Map<string, string>(),
    fileMetadataCache: new Map<string, { mimeType: string; size?: number; name?: string; cachedAt: number }>(),
    directLinkProbeCache: new Map<string, number>(),
  };
}

export async function assertRootReachable(
  ctx: DriveContext,
  setViewerPerm: (id: string) => Promise<boolean>,
  resolveFolder: (rel: string, rootId?: string) => Promise<string>,
): Promise<void> {
  if (ctx.isMock || !ctx.drive) {
    if (!fs.existsSync(ctx.mockBaseDir)) {
      fs.mkdirSync(ctx.mockBaseDir, { recursive: true });
    }
    return;
  }
  const res = await ctx.drive.files.get({
    fileId: env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
    fields: 'id,trashed',
    supportsAllDrives: true,
  });
  if (res.data.trashed) throw new Error('Drive root folder is trashed');
  if (env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    setViewerPerm(env.GOOGLE_DRIVE_ROOT_FOLDER_ID).catch((err) => {
      logger.warn('[Drive] Failed to set viewer permission on root folder', { err });
    });
    resolveFolder('Students', env.GOOGLE_DRIVE_ROOT_FOLDER_ID).catch((err) => {
      logger.warn('[Drive] Failed to pre-create Students folder', { err });
    });
  }
}
