import fs from 'fs';
import { env } from '../../../config/env';
import { DriveContext } from './types';
import { initDriveClient } from '../../../services/drive.client';

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
    setViewerPerm(env.GOOGLE_DRIVE_ROOT_FOLDER_ID).catch(() => {});
    resolveFolder('Students', env.GOOGLE_DRIVE_ROOT_FOLDER_ID).catch((err) => {
      console.warn('[Drive] Pre-creating Students folder notice:', err?.message || err);
    });
  }
}
