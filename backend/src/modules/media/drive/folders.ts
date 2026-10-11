import fs from 'fs';
import path from 'path';
import { env } from '../../../config/env';
import { mediaRepo } from '../index';
import { DriveContext, StudentFolderMeta } from './types';

export async function getOrCreateDriveFolder(
  ctx: DriveContext,
  name: string,
  parentId: string,
  cacheKey?: string,
  setViewerPermission?: (id: string) => Promise<boolean>,
): Promise<string> {
  const memoryKey = cacheKey || `${parentId}:${name}`;
  if (ctx.folderMemoryCache.has(memoryKey)) {
    return ctx.folderMemoryCache.get(memoryKey)!;
  }

  if (cacheKey) {
    const cached = await mediaRepo.findFolderCache(cacheKey);
    if (cached) {
      ctx.folderMemoryCache.set(memoryKey, cached.driveFolderId);
      return cached.driveFolderId;
    }
  }

  if (ctx.isMock || !ctx.drive) {
    const folderId = `mock_folder_${cacheKey ? cacheKey.replace(/[\/\s]/g, '_') : name}`;
    ctx.folderMemoryCache.set(memoryKey, folderId);
    if (cacheKey) {
      await mediaRepo.upsertFolderCache(cacheKey, folderId);
    }
    return folderId;
  }

  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`;
  const res = await ctx.drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    const folderId = res.data.files[0].id!;
    ctx.folderMemoryCache.set(memoryKey, folderId);
    if (cacheKey) {
      ctx.folderMemoryCache.set(cacheKey, folderId);
      await mediaRepo.upsertFolderCache(cacheKey, folderId);
    }
    if (setViewerPermission) setViewerPermission(folderId).catch(() => {});
    return folderId;
  }

  const created = await ctx.drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    supportsAllDrives: true,
    fields: 'id',
  });

  const folderId = created.data.id!;
  ctx.folderMemoryCache.set(memoryKey, folderId);
  if (cacheKey) ctx.folderMemoryCache.set(cacheKey, folderId);

  if (setViewerPermission) setViewerPermission(folderId).catch(() => {});
  if (cacheKey) {
    await mediaRepo.upsertFolderCache(cacheKey, folderId);
  }
  return folderId;
}

export async function resolveStudentFolder(
  ctx: DriveContext,
  meta: StudentFolderMeta,
  setViewerPermission?: (id: string) => Promise<boolean>,
): Promise<{ folderId: string; relativePath: string }> {
  const cleanRollNo = meta.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const relativePath = `Students/${cleanRollNo}`;

  if (ctx.isMock || !ctx.drive) {
    const fullMockPath = path.join(ctx.mockBaseDir, relativePath);
    fs.mkdirSync(fullMockPath, { recursive: true });
    return { folderId: `mock_${cleanRollNo}`, relativePath };
  }

  const folderId = await resolveFolderPath(ctx, relativePath, env.GOOGLE_DRIVE_ROOT_FOLDER_ID, setViewerPermission);
  return { folderId, relativePath };
}

export async function resolveFolderPath(
  ctx: DriveContext,
  relativePath: string,
  rootFolderId?: string,
  setViewerPermission?: (id: string) => Promise<boolean>,
): Promise<string> {
  const rootId = rootFolderId || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root';
  if (ctx.isMock || !ctx.drive) {
    const fullMockPath = path.join(ctx.mockBaseDir, relativePath);
    fs.mkdirSync(fullMockPath, { recursive: true });
    return `mock_folder_${relativePath.replace(/[\/\s]/g, '_')}`;
  }

  const segments = relativePath.split('/').map((s) => s.trim()).filter(Boolean);
  let currentFolderId = rootId;
  let accumulatedPath = '';

  for (const segment of segments) {
    accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment;
    currentFolderId = await getOrCreateDriveFolder(ctx, segment, currentFolderId, accumulatedPath, setViewerPermission);
  }

  return currentFolderId;
}
