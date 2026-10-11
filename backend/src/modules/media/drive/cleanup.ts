import fs from 'fs';
import path from 'path';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { DriveContext } from './types';

export async function cleanupFailedUpload(
  ctx: DriveContext,
  fileIds: string[],
  folderId?: string,
  relativePath?: string,
): Promise<void> {
  if (ctx.isMock || !ctx.drive) {
    if (relativePath) {
      const dirPath = path.join(ctx.mockBaseDir, relativePath);
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    }
    return;
  }

  for (const fileId of fileIds) {
    try {
      await ctx.drive.files.delete({ fileId, supportsAllDrives: true });
    } catch (err) {
      console.warn(`Failed to delete orphaned Drive file ${fileId}`, err);
    }
  }

  if (folderId) {
    try {
      await ctx.drive.files.delete({ fileId: folderId, supportsAllDrives: true });
    } catch (err) {
      console.warn(`Failed to delete orphaned Drive folder ${folderId}`, err);
    }
  }
}

export async function deleteFileById(
  ctx: DriveContext,
  fileId: string,
  relativePath?: string,
): Promise<boolean> {
  if (!fileId) return false;

  if (ctx.isMock || !ctx.drive) {
    try {
      const candidates: string[] = [];
      if (relativePath) candidates.push(path.join(ctx.mockBaseDir, relativePath));
      candidates.push(ctx.mockBaseDir);

      for (const dir of candidates) {
        if (!fs.existsSync(dir)) continue;
        const stack = [dir];
        while (stack.length) {
          const current = stack.pop()!;
          for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
              stack.push(full);
              continue;
            }
            if (!entry.name.endsWith('.meta.json')) continue;
            try {
              const meta = JSON.parse(fs.readFileSync(full, 'utf-8'));
              if (meta.id !== fileId) continue;
              fs.rmSync(full, { force: true });
              fs.rmSync(full.replace(/\.meta\.json$/, ''), { force: true });
              return true;
            } catch (err) {
              // Non-fatal: mock file entry unreadable or already deleted
              logger.warn('Failed cleaning mock metadata file', { error: err });
            }
          }
        }
      }
      return false;
    } catch (err) {
      console.warn(`[drive] failed to delete mock file ${fileId}:`, err);
      return false;
    }
  }

  try {
    await ctx.drive.files.delete({ fileId, supportsAllDrives: true });
    return true;
  } catch (err) {
    console.warn(`[drive] failed to delete file ${fileId}:`, err);
    return false;
  }
}

export async function deleteFilesByPrefix(
  ctx: DriveContext,
  folderRelativePath: string,
  filePrefix: string,
  resolveFolderPath: (rel: string, rootId?: string) => Promise<string>,
): Promise<number> {
  let deletedCount = 0;
  if (ctx.isMock || !ctx.drive) {
    const dirPath = path.join(ctx.mockBaseDir, folderRelativePath);
    if (fs.existsSync(dirPath)) {
      for (const file of fs.readdirSync(dirPath)) {
        if (file.startsWith(filePrefix)) {
          try {
            fs.rmSync(path.join(dirPath, file), { force: true });
            deletedCount++;
          } catch (err) {
            // Non-fatal: mock file might already be removed
            logger.warn('Failed removing mock file with prefix', { file, error: err });
          }
        }
      }
    }
    return deletedCount;
  }

  try {
    const folderId = await resolveFolderPath(folderRelativePath, env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
    const res = await ctx.drive.files.list({
      q: `'${folderId}' in parents and name contains '${filePrefix.replace(/'/g, "\\'")}' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      pageSize: 50,
    });
    if (res.data.files) {
      for (const f of res.data.files) {
        if (f.id && f.name && f.name.startsWith(filePrefix)) {
          await ctx.drive.files.delete({ fileId: f.id, supportsAllDrives: true }).catch(() => {});
          deletedCount++;
        }
      }
    }
  } catch (err) {
    console.warn(`[Drive] Error deleting files by prefix ${filePrefix}:`, err);
  }
  return deletedCount;
}

export async function deleteVideo(
  ctx: DriveContext,
  submission: {
    videoDriveId?: string | null;
    driveFolderPath: string;
  },
): Promise<void> {
  if (!submission.videoDriveId) {
    return;
  }

  if (ctx.isMock || !ctx.drive) {
    if (submission.driveFolderPath) {
      const dirPath = path.join(ctx.mockBaseDir, submission.driveFolderPath);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (!file.endsWith('.meta.json')) continue;
          try {
            const metaPath = path.join(dirPath, file);
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            if (meta.id === submission.videoDriveId) {
              fs.unlinkSync(metaPath);
              const targetName = meta.fileName || meta.name || file.replace('.meta.json', '');
              const actualFilePath = path.join(dirPath, targetName);
              if (fs.existsSync(actualFilePath)) {
                fs.unlinkSync(actualFilePath);
              }
              const fallback = path.join(dirPath, file.replace('.meta.json', ''));
              if (fallback !== actualFilePath && fs.existsSync(fallback)) {
                fs.unlinkSync(fallback);
              }
            }
          } catch (err) {
            // Non-fatal: corrupted or partially removed mock meta file
            logger.warn('Failed cleaning mock video meta files', { file, error: err });
          }
        }
      }
    }
    return;
  }

  try {
    await ctx.drive.files.delete({
      fileId: submission.videoDriveId,
      supportsAllDrives: true,
    });
  } catch (err) {
    console.warn(`Failed to delete Drive video file ${submission.videoDriveId}:`, err);
  }
}

export async function deleteSubmissionFiles(
  ctx: DriveContext,
  submission: {
    photo1DriveId?: string | null;
    photo2DriveId?: string | null;
    photo3DriveId?: string | null;
    videoDriveId?: string | null;
    audioDriveId?: string | null;
    driveFolderPath: string;
  },
  deleteFileByIdFn: (fileId: string, relPath?: string) => Promise<boolean>,
): Promise<void> {
  const fileIds = [
    ...(submission.photo1DriveId ? [submission.photo1DriveId] : []),
    ...(submission.photo2DriveId ? [submission.photo2DriveId] : []),
    ...(submission.photo3DriveId ? [submission.photo3DriveId] : []),
    ...(submission.videoDriveId ? [submission.videoDriveId] : []),
    ...(submission.audioDriveId ? [submission.audioDriveId] : []),
  ];

  if (ctx.isMock || !ctx.drive) {
    for (const fileId of fileIds) {
      await deleteFileByIdFn(fileId, submission.driveFolderPath);
    }
    if (submission.driveFolderPath) {
      const dirPath = path.join(ctx.mockBaseDir, submission.driveFolderPath);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        if (files.length === 0) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      }
    }
    return;
  }

  for (const fileId of fileIds) {
    if (!fileId) continue;
    try {
      await ctx.drive.files.delete({ fileId, supportsAllDrives: true });
    } catch (err) {
      console.warn(`Failed to delete Drive file ${fileId}:`, err);
    }
  }

  try {
    const folderName = path.basename(submission.driveFolderPath);
    if (folderName) {
      const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
      const res = await ctx.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (res.data.files && res.data.files.length > 0) {
        for (const folder of res.data.files) {
          if (folder.id) {
            const children = await ctx.drive.files.list({
              q: `'${folder.id}' in parents and trashed = false`,
              fields: 'files(id)',
              pageSize: 1,
              supportsAllDrives: true,
            });
            if (!children.data.files || children.data.files.length === 0) {
              await ctx.drive.files.delete({ fileId: folder.id, supportsAllDrives: true });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to delete student Drive folder for ${submission.driveFolderPath}:`, err);
  }
}
