import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { env } from '../../../config/env';
import { DriveContext, UploadedFileData, StudentFolderMeta, DriveUploadResult } from './types';

export async function uploadFile(
  ctx: DriveContext,
  file: UploadedFileData,
  fileName: string,
  parentFolderId: string,
  relativePath?: string,
  resolveFolderPath?: (rel: string, rootId?: string) => Promise<string>,
  setViewerPermission?: (id: string) => Promise<boolean>,
): Promise<string> {
  let targetFolderId = parentFolderId;
  if (relativePath && resolveFolderPath) {
    targetFolderId = await resolveFolderPath(
      relativePath,
      parentFolderId && parentFolderId !== 'root' && parentFolderId !== env.GOOGLE_DRIVE_ROOT_FOLDER_ID
        ? parentFolderId
        : env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
    );
  }

  if (ctx.isMock || !ctx.drive) {
    const targetRelPath = relativePath || '';
    const dirPath = path.join(ctx.mockBaseDir, targetRelPath);
    fs.mkdirSync(dirPath, { recursive: true });
    if (fileName.includes('photo')) {
      try {
        for (const entry of fs.readdirSync(dirPath)) {
          if (entry.includes('photo') && entry !== fileName) {
            fs.rmSync(path.join(dirPath, entry), { force: true });
          }
        }
      } catch (_) {}
    }
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, file.buffer);
    const mockId = `mock_file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${fileName}`;
    fs.writeFileSync(`${filePath}.meta.json`, JSON.stringify({
      id: mockId,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }));
    return mockId;
  }

  try {
    const isPhoto = fileName.includes('photo');
    const query = isPhoto
      ? `'${targetFolderId}' in parents and (name contains 'photo' or name = '${fileName.replace(/'/g, "\\'")}') and trashed = false`
      : `'${targetFolderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
    const existing = await ctx.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      pageSize: 25,
    });
    if (existing.data.files && existing.data.files.length > 0) {
      for (const f of existing.data.files) {
        if (f.id) {
          await ctx.drive.files.delete({ fileId: f.id, supportsAllDrives: true }).catch(() => {});
        }
      }
    }
  } catch (cleanErr) {
    console.warn('[Drive] Error cleaning up old file during override:', cleanErr);
  }

  const media = {
    mimeType: file.mimetype,
    body: Readable.from(file.buffer),
  };

  const res = await ctx.drive.files.create({
    requestBody: {
      name: fileName,
      parents: [targetFolderId],
      copyRequiresWriterPermission: false,
    },
    media,
    supportsAllDrives: true,
    fields: 'id, name, webViewLink, webContentLink',
  });

  const fileId = res.data.id!;
  if (setViewerPermission) {
    await setViewerPermission(fileId);
  }

  return fileId;
}

export async function uploadSubmissionFiles(
  meta: StudentFolderMeta,
  files: {
    photo1?: UploadedFileData;
    photo2?: UploadedFileData;
    photo3?: UploadedFileData;
    video?: UploadedFileData;
    audio?: UploadedFileData;
  },
  resolveStudentFolder: (meta: StudentFolderMeta) => Promise<{ folderId: string; relativePath: string }>,
  uploadFileFn: (file: UploadedFileData, fileName: string, folderId: string, relPath?: string) => Promise<string>,
  cleanupFailedUpload: (fileIds: string[], folderId?: string, relPath?: string) => Promise<void>,
): Promise<DriveUploadResult> {
  const cleanRollNo = meta.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const { folderId, relativePath } = await resolveStudentFolder(meta);
  const createdFileIds: string[] = [];

  try {
    let photo1DriveId: string | undefined;
    let photo2DriveId: string | undefined;
    let photo3DriveId: string | undefined;

    if (files.photo1) {
      const ext1 = path.extname(files.photo1.originalname) || '.jpg';
      photo1DriveId = await uploadFileFn(files.photo1, `${cleanRollNo}_photo1${ext1}`, folderId, relativePath);
      createdFileIds.push(photo1DriveId);
    }

    if (files.photo2) {
      const ext2 = path.extname(files.photo2.originalname) || '.jpg';
      photo2DriveId = await uploadFileFn(files.photo2, `${cleanRollNo}_photo2${ext2}`, folderId, relativePath);
      createdFileIds.push(photo2DriveId);
    }

    if (files.photo3) {
      const ext3 = path.extname(files.photo3.originalname) || '.jpg';
      photo3DriveId = await uploadFileFn(files.photo3, `${cleanRollNo}_photo3${ext3}`, folderId, relativePath);
      createdFileIds.push(photo3DriveId);
    }

    let videoDriveId: string | undefined;
    if (files.video) {
      const videoExt = path.extname(files.video.originalname) || '.mp4';
      const videoFileName = `${cleanRollNo}_video${videoExt}`;
      videoDriveId = await uploadFileFn(files.video, videoFileName, folderId, relativePath);
      createdFileIds.push(videoDriveId);
    }

    let audioDriveId: string | undefined;
    if (files.audio) {
      const audioExt = path.extname(files.audio.originalname) || '.mp3';
      audioDriveId = await uploadFileFn(files.audio, `${cleanRollNo}_audio${audioExt}`, folderId, relativePath);
      createdFileIds.push(audioDriveId);
    }

    return {
      photo1DriveId,
      photo2DriveId,
      photo3DriveId,
      videoDriveId,
      audioDriveId,
      driveFolderPath: relativePath,
    };
  } catch (error) {
    console.error('Error during file upload to Drive. Rolling back created files...', error);
    await cleanupFailedUpload(createdFileIds, folderId, relativePath);
    throw error;
  }
}

export async function verifyUploadedVideoFile(
  ctx: DriveContext,
  driveFileId: string,
  expectedFolderId: string,
  maxSizeBytes: number,
  setViewerPermission?: (id: string) => Promise<boolean>,
): Promise<{
  valid: boolean;
  error?: string;
  fileMeta?: { name: string; size: number; mimeType: string };
}> {
  if (!driveFileId || typeof driveFileId !== 'string') {
    return { valid: false, error: 'driveFileId is required' };
  }

  if (ctx.isMock || !ctx.drive || driveFileId.startsWith('mock_')) {
    return {
      valid: true,
      fileMeta: {
        name: `${driveFileId}.mp4`,
        size: 1024 * 1024,
        mimeType: 'video/mp4',
      },
    };
  }

  try {
    const res = await ctx.drive.files.get({
      fileId: driveFileId,
      fields: 'id, name, size, mimeType, parents, trashed, owners',
      supportsAllDrives: true,
    });

    const file = res.data;
    if (!file || !file.id || file.trashed) {
      return { valid: false, error: 'Uploaded video file was not found or is trashed in Drive.' };
    }

    if (!file.parents || !file.parents.includes(expectedFolderId)) {
      return { valid: false, error: 'File parent directory does not match expected student folder.' };
    }

    const size = parseInt(file.size ?? '0', 10);
    if (!size || size <= 0) {
      return { valid: false, error: 'Uploaded file is empty.' };
    }
    if (size > maxSizeBytes) {
      return {
        valid: false,
        error: `Video file exceeds maximum allowed size of ${(maxSizeBytes / 1024 / 1024).toFixed(0)} MB.`,
      };
    }

    const mime = (file.mimeType || '').toLowerCase();
    const ALLOWED_MIMES = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-matroska',
      'video/matroska',
    ];
    if (!ALLOWED_MIMES.includes(mime)) {
      return { valid: false, error: 'Uploaded file is not a supported video MIME type.' };
    }

    const ext = path.extname(file.name || '').toLowerCase().replace(/^\./, '');
    const ALLOWED_EXTS = ['mp4', 'mov', 'webm', 'mkv'];
    if (ext && !ALLOWED_EXTS.includes(ext)) {
      return { valid: false, error: 'Unsupported file extension.' };
    }

    if (setViewerPermission) {
      setViewerPermission(driveFileId).catch(() => {});
    }

    return {
      valid: true,
      fileMeta: {
        name: file.name || `${driveFileId}.mp4`,
        size,
        mimeType: mime,
      },
    };
  } catch (err: any) {
    console.error('[Drive] Error verifying uploaded video file:', err);
    return { valid: false, error: `Failed to verify file in Drive: ${err?.message || err}` };
  }
}
