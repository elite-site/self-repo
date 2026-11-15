import { Readable } from 'stream';
import { DriveContext, UploadedFileData, StudentFolderMeta, DriveUploadResult } from './types';
import { createDriveContext, assertRootReachable } from './client';
import { resolveStudentFolder, resolveFolderPath } from './folders';
import { uploadFile, uploadSubmissionFiles, verifyUploadedVideoFile } from './upload';
import { createResumableUploadSession, streamUploadToDrive } from './resumable';
import * as mediaFns from './media';
import * as cleanupFns from './cleanup';
import { getStorageQuota, DriveStorageQuota } from './quota';
import { DriveStreamResult, parseContentRangeHeader } from './stream';
import { getFileStream, DriveFileStreamResult } from './fileStream';

export * from './types';
export { DriveStreamResult, parseContentRangeHeader, DriveFileStreamResult, getFileStream };
export type { DriveStorageQuota };

/**
 * Extracts a Google Drive file ID from a URL or raw file ID string.
 * Supports:
 * - https://drive.google.com/file/d/<fileId>/...
 * - https://drive.google.com/open?id=<fileId>
 * - https://drive.google.com/uc?id=<fileId>...
 * - Plain file ID string
 */
export function extractDriveFileId(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);

  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  if (!trimmed.includes('/') && !trimmed.includes('?') && !trimmed.includes(':') && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export class DriveService {
  private ctx: DriveContext;

  constructor() {
    this.ctx = createDriveContext();
  }

  public get isUsingMock(): boolean {
    return this.ctx.isMock;
  }

  // Folders
  public async resolveStudentFolder(meta: StudentFolderMeta): Promise<{ folderId: string; relativePath: string }> {
    return resolveStudentFolder(this.ctx, meta, (id) => this.setViewerPermission(id));
  }

  public async resolveFolderPath(relativePath: string, rootFolderId?: string): Promise<string> {
    return resolveFolderPath(this.ctx, relativePath, rootFolderId, (id) => this.setViewerPermission(id));
  }

  // Storage quota
  public async getStorageQuota(): Promise<DriveStorageQuota | null> {
    return getStorageQuota(this.ctx);
  }

  // URLs & Direct Links
  public getWatchUrl(fileId?: string | null): string | null {
    return mediaFns.getWatchUrl(fileId);
  }

  public getFolderWatchUrl(folderId?: string | null): string | null {
    return mediaFns.getFolderWatchUrl(folderId);
  }

  public getPreviewUrl(fileId?: string | null): string | null {
    return mediaFns.getPreviewUrl(fileId);
  }

  public canRedirectToDrive(): boolean {
    return mediaFns.canRedirectToDrive(this.ctx);
  }

  public getDirectLink(fileId?: string | null): string | null {
    return mediaFns.getDirectLink(this.ctx, fileId);
  }

  public async isPubliclyReadable(fileId?: string | null): Promise<boolean> {
    return mediaFns.isPubliclyReadable(this.ctx, fileId);
  }

  public async probeDirectLink(directLink: string, fileId?: string): Promise<boolean> {
    return mediaFns.probeDirectLink(this.ctx, directLink, fileId);
  }

  public clearProbeCache(key?: string): void {
    mediaFns.clearProbeCache(this.ctx, key);
  }

  public async checkFileExists(fileId?: string | null, relativePath?: string): Promise<boolean> {
    return mediaFns.checkFileExists(this.ctx, fileId, relativePath);
  }

  public async getFileMetadata(fileId: string): Promise<{
    id: string;
    mimeType: string;
    sizeBytes: number;
    name?: string;
  } | null> {
    if (!fileId || typeof fileId !== 'string') return null;
    if (this.ctx.isMock || !this.ctx.drive || fileId.startsWith('mock_')) {
      return {
        id: fileId,
        mimeType: 'video/mp4',
        sizeBytes: 1024 * 1024,
        name: `${fileId}.mp4`,
      };
    }
    try {
      const res = await this.ctx.drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: 'id,mimeType,size,name,trashed',
      });
      const data = res.data;
      if (!data || !data.id || data.trashed) {
        return null;
      }
      return {
        id: data.id,
        mimeType: data.mimeType || 'application/octet-stream',
        sizeBytes: data.size ? parseInt(data.size, 10) : 0,
        name: data.name || undefined,
      };
    } catch {
      return null;
    }
  }

  // Permissions
  public async setViewerPermission(fileOrFolderId?: string | null): Promise<boolean> {
    return mediaFns.setViewerPermission(this.ctx, fileOrFolderId);
  }

  public async ensureAllFilesViewerAccess(): Promise<{ count: number; failed: number }> {
    return mediaFns.ensureAllFilesViewerAccess(this.ctx);
  }

  public async clearCopyRequiresWriterPermission(fileId: string): Promise<boolean> {
    return mediaFns.clearCopyRequiresWriterPermission(this.ctx, fileId);
  }

  public async clearAllFilesCopyProtection(): Promise<{ count: number; failed: number }> {
    return mediaFns.clearAllFilesCopyProtection(this.ctx);
  }

  // Uploads
  public async uploadFile(
    file: UploadedFileData,
    fileName: string,
    parentFolderId: string,
    relativePath?: string,
  ): Promise<string> {
    return uploadFile(
      this.ctx,
      file,
      fileName,
      parentFolderId,
      relativePath,
      (rel, root) => this.resolveFolderPath(rel, root),
      (id) => this.setViewerPermission(id),
    );
  }

  public async uploadSubmissionFiles(
    meta: StudentFolderMeta,
    files: {
      photo1?: UploadedFileData;
      photo2?: UploadedFileData;
      photo3?: UploadedFileData;
      video?: UploadedFileData;
      audio?: UploadedFileData;
    },
  ): Promise<DriveUploadResult> {
    return uploadSubmissionFiles(
      meta,
      files,
      (m) => this.resolveStudentFolder(m),
      (file, fName, fId, rPath) => this.uploadFile(file, fName, fId, rPath),
      (fIds, fId, rPath) => this.cleanupFailedUpload(fIds, fId, rPath),
    );
  }

  public async verifyUploadedVideoFile(
    driveFileId: string,
    expectedFolderId: string,
    maxSizeBytes: number,
  ): Promise<{
    valid: boolean;
    error?: string;
    fileMeta?: { name: string; size: number; mimeType: string };
  }> {
    return verifyUploadedVideoFile(this.ctx, driveFileId, expectedFolderId, maxSizeBytes, (id) =>
      this.setViewerPermission(id),
    );
  }

  // Resumable Upload
  public async createResumableUploadSession(
    fileName: string,
    mimeType: string,
    fileSize: number,
    parentFolderId: string,
    clientOrigin?: string,
  ): Promise<string | null> {
    return createResumableUploadSession(this.ctx, fileName, mimeType, fileSize, parentFolderId, clientOrigin);
  }

  public async streamUploadToDrive(
    sessionUrl: string | null,
    contentType: string,
    contentLength: number,
    inputStream: Readable,
    mockMeta?: { relativePath: string; fileName: string },
  ): Promise<string> {
    return streamUploadToDrive(
      this.ctx,
      sessionUrl,
      contentType,
      contentLength,
      inputStream,
      (id) => this.setViewerPermission(id),
      mockMeta,
    );
  }

  // Streaming & Thumbnail
  public async getFileStream(fileId: string): Promise<{
    stream: Readable;
    mimeType: string;
    sizeBytes: number;
    md5Checksum: string | null;
  }> {
    return getFileStream(this.ctx, fileId);
  }

  public async streamDriveFile(
    fileId: string,
    relativePath?: string,
    rangeHeader?: string,
  ): Promise<DriveStreamResult> {
    return mediaFns.streamDriveFile(this.ctx, fileId, relativePath, rangeHeader);
  }

  public async generateThumbnail(
    fileId: string,
    type: 'video' | 'resume' | 'certificate' | 'achievement' = 'certificate',
  ): Promise<Buffer | null> {
    return mediaFns.generateThumbnail(this.ctx, fileId, type);
  }

  // Root Reachability
  public async assertRootReachable(): Promise<void> {
    return assertRootReachable(
      this.ctx,
      (id) => this.setViewerPermission(id),
      (rel, root) => this.resolveFolderPath(rel, root),
    );
  }

  // Cleanup & Deletions
  public async cleanupFailedUpload(fileIds: string[], folderId?: string, relativePath?: string): Promise<void> {
    return cleanupFns.cleanupFailedUpload(this.ctx, fileIds, folderId, relativePath);
  }

  public async deleteFileById(fileId: string, relativePath?: string): Promise<boolean> {
    return cleanupFns.deleteFileById(this.ctx, fileId, relativePath);
  }

  public async deleteFilesByPrefix(folderRelativePath: string, filePrefix: string): Promise<number> {
    return cleanupFns.deleteFilesByPrefix(this.ctx, folderRelativePath, filePrefix, (rel, root) =>
      this.resolveFolderPath(rel, root),
    );
  }

  public async deleteVideo(submission: { videoDriveId?: string | null; driveFolderPath: string }): Promise<void> {
    return cleanupFns.deleteVideo(this.ctx, submission);
  }

  public async deleteSubmissionFiles(submission: {
    photo1DriveId?: string | null;
    photo2DriveId?: string | null;
    photo3DriveId?: string | null;
    videoDriveId?: string | null;
    audioDriveId?: string | null;
    driveFolderPath: string;
  }): Promise<void> {
    return cleanupFns.deleteSubmissionFiles(this.ctx, submission, (id, rel) => this.deleteFileById(id, rel));
  }
}

export const driveService = new DriveService();
