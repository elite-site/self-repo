import fs from 'fs';
import path from 'path';
import { env } from '../../../config/env';
import { mediaRepo } from '../index';
import { DriveContext } from './types';
import { streamDriveFile as doStreamDriveFile, DriveStreamResult } from '../../../services/drive.stream';
import { generateThumbnail as doGenerateThumbnail } from '../../../services/drive.thumbnail';

const ANYONE_READABLE_TTL_MS = 10 * 60_000;
const MAX_TRACKED_ANYONE_FILES = 500;

export function getWatchUrl(fileId?: string | null): string | null {
  if (!fileId || fileId.startsWith('mock_') || fileId.startsWith('drive_')) return null;
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

export function getFolderWatchUrl(folderId?: string | null): string | null {
  if (!folderId || folderId.startsWith('mock_') || folderId.startsWith('drive_')) return null;
  return `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
}

export function getPreviewUrl(fileId?: string | null): string | null {
  if (!fileId || fileId.startsWith('mock_') || fileId.startsWith('drive_')) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function canRedirectToDrive(ctx: DriveContext): boolean {
  return !ctx.isMock && !!ctx.drive;
}

export function getDirectLink(ctx: DriveContext, fileId?: string | null): string | null {
  if (!fileId || !canRedirectToDrive(ctx)) return null;
  if (fileId.startsWith('mock_') || fileId.startsWith('drive_')) return null;
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
}

export function rememberAnyoneReadable(ctx: DriveContext, fileId: string): void {
  ctx.anyoneReadableCache.delete(fileId);
  ctx.anyoneReadableCache.set(fileId, Date.now() + ANYONE_READABLE_TTL_MS);
  while (ctx.anyoneReadableCache.size > MAX_TRACKED_ANYONE_FILES) {
    const oldest = ctx.anyoneReadableCache.keys().next();
    if (oldest.done) break;
    ctx.anyoneReadableCache.delete(oldest.value);
  }
}

export async function setViewerPermission(ctx: DriveContext, fileOrFolderId?: string | null): Promise<boolean> {
  if (!fileOrFolderId || ctx.isMock || !ctx.drive) return false;
  if (fileOrFolderId.startsWith('mock_') || fileOrFolderId.startsWith('drive_')) return false;
  if (ctx.viewerPermissionCache.has(fileOrFolderId)) return true;

  try {
    await ctx.drive.permissions.create({
      fileId: fileOrFolderId,
      requestBody: { role: 'reader', type: 'anyone', allowFileDiscovery: false },
      supportsAllDrives: true,
      sendNotificationEmail: false,
    });
    ctx.viewerPermissionCache.add(fileOrFolderId);
    rememberAnyoneReadable(ctx, fileOrFolderId);
    ctx.drive.files.update({
      fileId: fileOrFolderId,
      requestBody: { copyRequiresWriterPermission: false },
      supportsAllDrives: true,
    }).catch(() => {});
    return true;
  } catch (permErr: any) {
    const msg = permErr?.message || String(permErr);
    if (msg.includes('already exists') || msg.includes('duplicate')) {
      ctx.viewerPermissionCache.add(fileOrFolderId);
      rememberAnyoneReadable(ctx, fileOrFolderId);
      return true;
    }

    if (env.GOOGLE_SSO_HD) {
      try {
        await ctx.drive.permissions.create({
          fileId: fileOrFolderId,
          requestBody: { role: 'reader', type: 'domain', domain: env.GOOGLE_SSO_HD, allowFileDiscovery: false },
          supportsAllDrives: true,
          sendNotificationEmail: false,
        });
        ctx.viewerPermissionCache.add(fileOrFolderId);
        return true;
      } catch (domainErr: any) {
        const dMsg = domainErr?.message || String(domainErr);
        if (dMsg.includes('already exists') || dMsg.includes('duplicate')) {
          ctx.viewerPermissionCache.add(fileOrFolderId);
          return true;
        }
      }
    }
    return false;
  }
}

export async function isPubliclyReadable(ctx: DriveContext, fileId?: string | null): Promise<boolean> {
  if (!fileId || ctx.isMock || !ctx.drive || fileId.startsWith('mock_')) return false;
  const known = ctx.anyoneReadableCache.get(fileId);
  if (known !== undefined) {
    if (Date.now() < known) {
      rememberAnyoneReadable(ctx, fileId);
      return true;
    }
    ctx.anyoneReadableCache.delete(fileId);
  }

  const negative = ctx.negativePermissionCache.get(fileId);
  if (negative !== undefined) {
    if (Date.now() < negative) return false;
    ctx.negativePermissionCache.delete(fileId);
  }

  try {
    const res = await ctx.drive.permissions.list({
      fileId,
      fields: 'permissions(type,role)',
      supportsAllDrives: true,
      pageSize: 100,
    });
    const anyone = (res.data.permissions || []).some(
      (p) => p.type === 'anyone' && (p.role === 'reader' || p.role === 'writer'),
    );
    if (anyone) {
      rememberAnyoneReadable(ctx, fileId);
    } else {
      ctx.negativePermissionCache.set(fileId, Date.now() + 60_000);
    }
    return anyone;
  } catch (err: any) {
    ctx.negativePermissionCache.set(fileId, Date.now() + 60_000);
    return false;
  }
}

export async function probeDirectLink(ctx: DriveContext, directLink: string, fileId?: string): Promise<boolean> {
  if (!directLink) return false;
  const cacheKey = fileId || directLink;
  const expires = ctx.directLinkProbeCache.get(cacheKey);
  if (expires && expires > Date.now()) return true;

  try {
    const resp = await fetch(directLink, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal: AbortSignal.timeout(3000),
    });
    if (resp.body) await resp.body.cancel().catch(() => {});
    if (resp.status === 200 || resp.status === 206) {
      ctx.directLinkProbeCache.set(cacheKey, Date.now() + 60_000);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function clearProbeCache(ctx: DriveContext, key?: string): void {
  if (key) ctx.directLinkProbeCache.delete(key);
  else ctx.directLinkProbeCache.clear();
}

export async function clearCopyRequiresWriterPermission(ctx: DriveContext, fileId: string): Promise<boolean> {
  if (ctx.isMock || !ctx.drive) return false;
  try {
    await ctx.drive.files.update({
      fileId,
      requestBody: { copyRequiresWriterPermission: false },
      supportsAllDrives: true,
    });
    return true;
  } catch (err) {
    return false;
  }
}

export async function clearAllFilesCopyProtection(ctx: DriveContext): Promise<{ count: number; failed: number }> {
  if (ctx.isMock || !ctx.drive) return { count: 0, failed: 0 };
  let count = 0;
  let failed = 0;
  const fileIds = new Set<string>();

  try {
    const allFiles = await mediaRepo.findAllMediaFileDriveIds();
    allFiles.introVideos.forEach((id) => fileIds.add(id));
    allFiles.submissionFiles.forEach((id) => fileIds.add(id));
    allFiles.resumes.forEach((id) => fileIds.add(id));
    allFiles.certificates.forEach((id) => fileIds.add(id));
    allFiles.achievements.forEach((id) => fileIds.add(id));
  } catch (e) {
    console.warn('[Drive] Error fetching files for copy protection clearing:', e);
  }

  for (const fileId of fileIds) {
    const ok = await clearCopyRequiresWriterPermission(ctx, fileId);
    if (ok) count++; else failed++;
  }
  return { count, failed };
}

export async function ensureAllFilesViewerAccess(ctx: DriveContext): Promise<{ count: number; failed: number }> {
  if (ctx.isMock || !ctx.drive) return { count: 0, failed: 0 };
  let count = 0;
  let failed = 0;

  if (env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    const ok = await setViewerPermission(ctx, env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
    if (ok) count++; else failed++;
  }

  try {
    const allFiles = await mediaRepo.findAllMediaFileDriveIds();
    const allIds = [
      ...allFiles.cachedFolders,
      ...allFiles.resumes,
      ...allFiles.certificates,
      ...allFiles.achievements,
      ...allFiles.introVideos,
      ...allFiles.submissionFiles,
      ...allFiles.profilePhotos,
    ];
    for (const id of allIds) {
      if (id) {
        const ok = await setViewerPermission(ctx, id);
        if (ok) count++; else failed++;
      }
    }
  } catch (e) {
    console.warn('[Drive] Error ensuring media files viewer access:', e);
  }

  return { count, failed };
}

export async function checkFileExists(ctx: DriveContext, fileId?: string | null, relativePath?: string): Promise<boolean> {
  if (!fileId) return false;
  if (ctx.isMock || !ctx.drive || fileId.startsWith('mock_') || fileId.startsWith('drive_')) {
    if (relativePath) {
      const dirPath = path.join(ctx.mockBaseDir, relativePath);
      if (fs.existsSync(dirPath)) {
        for (const f of fs.readdirSync(dirPath)) {
          if (!f.endsWith('.meta.json')) continue;
          try {
            const meta = JSON.parse(fs.readFileSync(path.join(dirPath, f), 'utf-8'));
            if (meta.id === fileId) return true;
          } catch (_) {}
        }
      }
    }
    return false;
  }
  try {
    const res = await ctx.drive.files.get({ fileId, fields: 'id, trashed', supportsAllDrives: true });
    return Boolean(res.data.id && !res.data.trashed);
  } catch {
    return false;
  }
}

export async function streamDriveFile(
  ctx: DriveContext,
  fileId: string,
  relativePath?: string,
  rangeHeader?: string,
): Promise<DriveStreamResult> {
  return doStreamDriveFile({
    drive: ctx.drive,
    isMock: ctx.isMock,
    mockBaseDir: ctx.mockBaseDir,
    fileMetadataCache: ctx.fileMetadataCache,
    viewerPermissionCache: ctx.viewerPermissionCache,
    setViewerPermission: (id) => setViewerPermission(ctx, id),
    fileId,
    relativePath,
    rangeHeader,
  });
}

export async function generateThumbnail(
  ctx: DriveContext,
  fileId: string,
  type: 'video' | 'resume' | 'certificate' | 'achievement' = 'certificate',
): Promise<Buffer | null> {
  return doGenerateThumbnail(ctx.drive, ctx.isMock, ctx.mockBaseDir, fileId, type);
}
