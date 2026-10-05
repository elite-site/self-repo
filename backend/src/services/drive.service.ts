import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { parseRange } from '../utils/rangeParser';
import sharp from 'sharp';

export interface UploadedFileData {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StudentFolderMeta {
  eventName?: string;
  eventYear: number;
  year: number;
  section: string;
  branch: string;
  rollNo: string;
  name: string;
}

export interface DriveUploadResult {
  photo1DriveId?: string;
  photo2DriveId?: string;
  photo3DriveId?: string;
  videoDriveId?: string;
  audioDriveId?: string;
  driveFolderPath: string;
}

export interface DriveStreamResult {
  stream: Readable;
  mimeType: string;
  /** Full size of the file in bytes, when the storage backend reports it. */
  size?: number;
  /** Present when the response only carries a byte range (HTTP 206). */
  contentRange?: { start: number; end: number; total: number };
}

/**
 * Parse a `Content-Range` response header (e.g. `bytes 0-1023/4096`) into the
 * same shape as `parseRange`.
 *
 * Used as a fallback when a Drive file's total size is unknown: the original
 * `Range` request is passed through to Drive untouched, and this recovers the
 * range Drive actually served so the client still gets a valid 206.
 */
export function parseContentRangeHeader(
  header: string | undefined,
): { start: number; end: number; total: number } | null {
  if (!header || typeof header !== 'string') return null;

  const match = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i.exec(header.trim());
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  const total = match[3] === '*' ? NaN : parseInt(match[3], 10);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return null;

  return { start, end, total: Number.isFinite(total) ? total : end + 1 };
}

/**
 * How long a confirmed `anyone` grant is trusted before Drive is re-queried.
 *
 * Long enough that a viewer burst does not produce one `permissions.list` per
 * request, short enough that a revoked grant is noticed within a single viewing
 * session rather than persisting until the process restarts.
 */
const ANYONE_READABLE_TTL_MS = 10 * 60_000;

/** Cap on tracked `anyone` grants, to bound memory on a small instance. */
const MAX_TRACKED_ANYONE_FILES = 500;

export class DriveService {
  private drive: drive_v3.Drive | null = null;
  private isMock = false;
  private mockBaseDir = path.resolve(__dirname, '../../storage/mock-drive');

  // Stored so createResumableUploadSession() can get a fresh access token
  private oauthClient: InstanceType<typeof google.auth.OAuth2> | null = null;
  private serviceAccountAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null;
  private viewerPermissionCache = new Set<string>();
  /**
   * Subset of `viewerPermissionCache` that is confirmed readable by *anyone*
   * with the link, as opposed to merely readable by an authenticated member of
   * the Workspace domain.
   *
   * These must stay separate. `setViewerPermission` falls back to `domain`
   * sharing when the org policy blocks link sharing, and a domain-shared file is
   * NOT anonymously readable, so recording that in the same set would make
   * {@link isPubliclyReadable} hand out a redirect Drive answers with 403.
   */
  private anyoneReadableCache = new Map<string, number>();
  /** fileId -> expiry timestamp, for files confirmed NOT to be `anyone`-readable. */
  private negativePermissionCache = new Map<string, number>();
  private folderMemoryCache = new Map<string, string>();
  private fileMetadataCache = new Map<string, { mimeType: string; size?: number; name?: string; cachedAt: number }>();
  /** directLink/fileId -> expiry timestamp (cached for 60s) for verified accessible download links. */
  private directLinkProbeCache = new Map<string, number>();

  constructor() {
    this.init();
  }

  private init() {
    // 1. Try Google OAuth 2.0 (Primary & Recommended for Workspace My Drive)
    if (
      env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_OAUTH_REFRESH_TOKEN &&
      env.GOOGLE_DRIVE_ROOT_FOLDER_ID
    ) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          env.GOOGLE_OAUTH_CLIENT_ID,
          env.GOOGLE_OAUTH_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
          refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
        });
        this.drive = google.drive({ version: 'v3', auth: oauth2Client });
        this.oauthClient = oauth2Client;   // ← store for token refresh
        this.isMock = false;
        console.log('✅ Google Drive API initialized with OAuth 2.0 Refresh Token (Workspace Account)');
      } catch (err) {
        if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
          throw new Error('[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.');
        }
        console.warn('⚠️ Failed to initialize Google Drive OAuth 2.0 auth. Falling back to local storage mock.', err);
        this.isMock = true;
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
        this.drive = google.drive({ version: 'v3', auth });
        this.serviceAccountAuth = auth;    // ← store for token refresh
        this.isMock = false;
        console.log('✅ Google Drive API initialized with Service Account');
      } catch (err) {
        if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
          throw new Error('[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.');
        }
        console.warn('⚠️ Failed to initialize Google Drive auth. Falling back to local storage mock.', err);
        this.isMock = true;
      }
    } else {
      if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
        throw new Error('[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.');
      }
      console.log('ℹ️ Google Drive credentials not set. Using local mock storage for Drive.');
      this.isMock = true;
    }

    if (this.isMock && !fs.existsSync(this.mockBaseDir)) {
      fs.mkdirSync(this.mockBaseDir, { recursive: true });
    }
  }

  /**
   * Whether this service is in mock (local) mode.
   * Used by callers to decide between direct-upload and server-upload flows.
   */
  public get isUsingMock(): boolean {
    return this.isMock;
  }

  /**
   * Helper to get or create a folder idempotently in Google Drive
   */
  private async getOrCreateDriveFolder(name: string, parentId: string, cacheKey?: string): Promise<string> {
    const memoryKey = cacheKey || `${parentId}:${name}`;
    if (this.folderMemoryCache.has(memoryKey)) {
      return this.folderMemoryCache.get(memoryKey)!;
    }

    if (cacheKey) {
      const cached = await prisma.driveFolderCache.findUnique({
        where: { pathKey: cacheKey },
      });
      if (cached) {
        this.folderMemoryCache.set(memoryKey, cached.driveFolderId);
        return cached.driveFolderId;
      }
    }

    if (this.isMock || !this.drive) {
      const folderId = `mock_folder_${cacheKey ? cacheKey.replace(/[\/\s]/g, '_') : name}`;
      this.folderMemoryCache.set(memoryKey, folderId);
      if (cacheKey) {
        await prisma.driveFolderCache.upsert({
          where: { pathKey: cacheKey },
          create: { pathKey: cacheKey, driveFolderId: folderId },
          update: { driveFolderId: folderId },
        });
      }
      return folderId;
    }

    // Live Google Drive query
    const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`;
    const res = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (res.data.files && res.data.files.length > 0) {
      const folderId = res.data.files[0].id!;
      this.folderMemoryCache.set(memoryKey, folderId);
      if (cacheKey) {
        this.folderMemoryCache.set(cacheKey, folderId);
        await prisma.driveFolderCache.upsert({
          where: { pathKey: cacheKey },
          create: { pathKey: cacheKey, driveFolderId: folderId },
          update: { driveFolderId: folderId },
        });
      }
      this.setViewerPermission(folderId).catch(() => {});
      return folderId;
    }

    // Folder does not exist, create it
    const created = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      supportsAllDrives: true,
      fields: 'id',
    });

    const folderId = created.data.id!;
    this.folderMemoryCache.set(memoryKey, folderId);
    if (cacheKey) this.folderMemoryCache.set(cacheKey, folderId);

    // Grant viewer access to the newly created folder
    this.setViewerPermission(folderId).catch(() => {});
    if (cacheKey) {
      await prisma.driveFolderCache.upsert({
        where: { pathKey: cacheKey },
        create: { pathKey: cacheKey, driveFolderId: folderId },
        update: { driveFolderId: folderId },
      });
    }
    return folderId;
  }

  /**
   * Builds the folder tree: Students/{RollNo}
   */
  public async resolveStudentFolder(meta: StudentFolderMeta): Promise<{ folderId: string; relativePath: string }> {
    const cleanRollNo = meta.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    const relativePath = `Students/${cleanRollNo}`;

    if (this.isMock || !this.drive) {
      const fullMockPath = path.join(this.mockBaseDir, relativePath);
      fs.mkdirSync(fullMockPath, { recursive: true });
      return { folderId: `mock_${cleanRollNo}`, relativePath };
    }

    const folderId = await this.resolveFolderPath(relativePath, env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
    return { folderId, relativePath };
  }

  /**
   * Recursively gets or creates a folder hierarchy in Google Drive
   * (e.g. "Students/24K61A1259")
   */
  public async resolveFolderPath(relativePath: string, rootFolderId?: string): Promise<string> {
    const rootId = rootFolderId || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root';
    if (this.isMock || !this.drive) {
      const fullMockPath = path.join(this.mockBaseDir, relativePath);
      fs.mkdirSync(fullMockPath, { recursive: true });
      return `mock_folder_${relativePath.replace(/[\/\s]/g, '_')}`;
    }

    const segments = relativePath.split('/').map((s) => s.trim()).filter(Boolean);
    let currentFolderId = rootId;
    let accumulatedPath = '';

    for (const segment of segments) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment;
      currentFolderId = await this.getOrCreateDriveFolder(segment, currentFolderId, accumulatedPath);
    }

    return currentFolderId;
  }

  /**
   * Returns a direct watch/view URL on Google Drive with sharing parameters
   */
  public getWatchUrl(fileId?: string | null): string | null {
    if (!fileId || fileId.startsWith('mock_') || fileId.startsWith('drive_')) return null;
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }

  /**
   * Returns a direct watch/view URL for a folder on Google Drive
   */
  public getFolderWatchUrl(folderId?: string | null): string | null {
    if (!folderId || folderId.startsWith('mock_') || folderId.startsWith('drive_')) return null;
    return `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
  }

  /**
   * Returns an embeddable preview URL on Google Drive
   */
  public getPreviewUrl(fileId?: string | null): string | null {
    if (!fileId || fileId.startsWith('mock_') || fileId.startsWith('drive_')) return null;
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  /**
   * Sets reader/viewer permissions on a Google Drive file or folder so it can be viewed by anyone with the link.
   * If organization admin policy restricts 'anyone' sharing, falls back to the organization domain.
   */
  public async setViewerPermission(fileOrFolderId?: string | null): Promise<boolean> {
    if (!fileOrFolderId || this.isMock || !this.drive) return false;
    if (fileOrFolderId.startsWith('mock_') || fileOrFolderId.startsWith('drive_')) return false;
    if (this.viewerPermissionCache.has(fileOrFolderId)) return true;

    try {
      await this.drive.permissions.create({
        fileId: fileOrFolderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
          allowFileDiscovery: false,
        },
        supportsAllDrives: true,
        sendNotificationEmail: false,
      });
      this.viewerPermissionCache.add(fileOrFolderId);
      this.rememberAnyoneReadable(fileOrFolderId);
      this.drive.files.update({
        fileId: fileOrFolderId,
        requestBody: { copyRequiresWriterPermission: false },
        supportsAllDrives: true,
      }).catch(() => {});
      console.log(`[Drive] Public viewer access ('anyone') granted to: ${fileOrFolderId}`);
      return true;
    } catch (permErr: any) {
      const msg = permErr?.message || String(permErr);
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        // The 'anyone' grant is what collided, so this is anonymously readable
        // even though we did not create the permission ourselves.
        this.viewerPermissionCache.add(fileOrFolderId);
        this.rememberAnyoneReadable(fileOrFolderId);
        return true;
      }

      console.warn(`[Drive] 'anyone' viewer permission failed for ${fileOrFolderId}: ${msg}`);

      // Fallback: Google Workspace domain sharing
      if (env.GOOGLE_SSO_HD) {
        try {
          await this.drive.permissions.create({
            fileId: fileOrFolderId,
            requestBody: {
              role: 'reader',
              type: 'domain',
              domain: env.GOOGLE_SSO_HD,
              allowFileDiscovery: false,
            },
            supportsAllDrives: true,
            sendNotificationEmail: false,
          });
          // Deliberately NOT added to `anyoneReadableCache`: a domain grant is
          // only readable by an authenticated Workspace member, so redirecting
          // an anonymous browser to this file would 403.
          this.viewerPermissionCache.add(fileOrFolderId);
          console.log(`[Drive] Domain (${env.GOOGLE_SSO_HD}) viewer access granted to: ${fileOrFolderId}`);
          return true;
        } catch (domainErr: any) {
          const dMsg = domainErr?.message || String(domainErr);
          if (dMsg.includes('already exists') || dMsg.includes('duplicate')) {
            this.viewerPermissionCache.add(fileOrFolderId);
            return true;
          }
          console.warn(`[Drive] Domain viewer permission failed for ${fileOrFolderId}: ${dMsg}`);
        }
      }
      return false;
    }
  }

  /**
   * Ensures all stored files and cached folders in the system have viewer access.
   */
  public async ensureAllFilesViewerAccess(): Promise<{ count: number; failed: number }> {
    if (this.isMock || !this.drive) return { count: 0, failed: 0 };

    let count = 0;
    let failed = 0;

    // 1. Root folder
    if (env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      const ok = await this.setViewerPermission(env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
      if (ok) count++; else failed++;
    }

    // 2. Cached folders
    try {
      const cachedFolders = await prisma.driveFolderCache.findMany();
      for (const f of cachedFolders) {
        if (f.driveFolderId) {
          const ok = await this.setViewerPermission(f.driveFolderId);
          if (ok) count++; else failed++;
        }
      }
    } catch (e) {
      console.warn('[Drive] Error ensuring cached folders viewer access:', e);
    }

    // 3. Resumes
    try {
      const resumes = await prisma.resume.findMany({
        where: { driveFileId: { not: null } },
        select: { driveFileId: true },
      });
      for (const r of resumes) {
        if (r.driveFileId) {
          const ok = await this.setViewerPermission(r.driveFileId);
          if (ok) count++; else failed++;
        }
      }
    } catch (e) {
      console.warn('[Drive] Error ensuring resumes viewer access:', e);
    }

    // 4. Certificates
    try {
      const certs = await prisma.certificate.findMany({
        where: { fileDriveId: { not: null } },
        select: { fileDriveId: true },
      });
      for (const c of certs) {
        if (c.fileDriveId) {
          const ok = await this.setViewerPermission(c.fileDriveId);
          if (ok) count++; else failed++;
        }
      }
    } catch (e) {
      console.warn('[Drive] Error ensuring certificates viewer access:', e);
    }

    // 5. Achievements
    try {
      const achievements = await prisma.achievement.findMany({
        where: { proofDriveId: { not: null } },
        select: { proofDriveId: true },
      });
      for (const a of achievements) {
        if (a.proofDriveId) {
          const ok = await this.setViewerPermission(a.proofDriveId);
          if (ok) count++; else failed++;
        }
      }
    } catch (e) {
      console.warn('[Drive] Error ensuring achievements viewer access:', e);
    }

    // 6. Intro Videos
    try {
      const introVideos = await prisma.introVideo.findMany({
        where: { driveFileId: { not: null } },
        select: { driveFileId: true },
      });
      for (const v of introVideos) {
        if (v.driveFileId) {
          const ok = await this.setViewerPermission(v.driveFileId);
          if (ok) count++; else failed++;
        }
      }
    } catch (e) {
      console.warn('[Drive] Error ensuring intro videos viewer access:', e);
    }

    // 7. Submissions (photo1, photo2, photo3, video)
    try {
      const submissions = await prisma.submission.findMany({
        where: { videoDriveId: { not: null } },
        select: { videoDriveId: true, photo1DriveId: true, photo2DriveId: true, photo3DriveId: true },
      });
      for (const s of submissions) {
        const ids = [s.videoDriveId, s.photo1DriveId, s.photo2DriveId, s.photo3DriveId].filter(Boolean) as string[];
        for (const id of ids) {
          const ok = await this.setViewerPermission(id);
          if (ok) count++; else failed++;
        }
      }
    } catch (e) {
      console.warn('[Drive] Error ensuring submissions viewer access:', e);
    }

    // 8. Student Profiles (photoDriveId)
    try {
      const profiles = await prisma.studentProfile.findMany({
        where: { photoDriveId: { not: null } },
        select: { photoDriveId: true },
      });
      for (const p of profiles) {
        if (p.photoDriveId) {
          const ok = await this.setViewerPermission(p.photoDriveId);
          if (ok) count++; else failed++;
        }
      }
    } catch (e) {
      console.warn('[Drive] Error ensuring student profiles viewer access:', e);
    }

    return { count, failed };
  }

  /**
   * Uploads a single file to Google Drive or mock storage
   */
  public async uploadFile(
    file: UploadedFileData,
    fileName: string,
    parentFolderId: string,
    relativePath?: string
  ): Promise<string> {
    let targetFolderId = parentFolderId;
    if (relativePath) {
      targetFolderId = await this.resolveFolderPath(
        relativePath,
        parentFolderId && parentFolderId !== 'root' && parentFolderId !== env.GOOGLE_DRIVE_ROOT_FOLDER_ID
          ? parentFolderId
          : env.GOOGLE_DRIVE_ROOT_FOLDER_ID
      );
    }

    if (this.isMock || !this.drive) {
      const targetRelPath = relativePath || '';
      const dirPath = path.join(this.mockBaseDir, targetRelPath);
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
      // Save metadata mapping in mock directory
      fs.writeFileSync(`${filePath}.meta.json`, JSON.stringify({
        id: mockId,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      }));
      return mockId;
    }

    // Google Drive override: if a file with the same name or older photo exists in target folder, delete old duplicate
    try {
      const isPhoto = fileName.includes('photo');
      const query = isPhoto
        ? `'${targetFolderId}' in parents and (name contains 'photo' or name = '${fileName.replace(/'/g, "\\'")}') and trashed = false`
        : `'${targetFolderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
      const existing = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        pageSize: 25,
      });
      if (existing.data.files && existing.data.files.length > 0) {
        for (const f of existing.data.files) {
          if (f.id) {
            await this.drive.files.delete({ fileId: f.id, supportsAllDrives: true }).catch(() => {});
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

    const res = await this.drive.files.create({
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

    // Grant viewer access to the uploaded file
    await this.setViewerPermission(fileId);

    return fileId;
  }

  /**
   * Uploads all submission assets with rollback on failure
   */
  public async uploadSubmissionFiles(
    meta: StudentFolderMeta,
    files: {
      photo1?: UploadedFileData;
      photo2?: UploadedFileData;
      photo3?: UploadedFileData;
      video?: UploadedFileData;
      audio?: UploadedFileData;
    }
  ): Promise<DriveUploadResult> {
    const cleanRollNo = meta.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    const { folderId, relativePath } = await this.resolveStudentFolder(meta);
    const createdFileIds: string[] = [];

    try {
      let photo1DriveId: string | undefined = undefined;
      let photo2DriveId: string | undefined = undefined;
      let photo3DriveId: string | undefined = undefined;

      if (files.photo1) {
        const ext1 = path.extname(files.photo1.originalname) || '.jpg';
        photo1DriveId = await this.uploadFile(files.photo1, `${cleanRollNo}_photo1${ext1}`, folderId, relativePath);
        createdFileIds.push(photo1DriveId);
      }

      if (files.photo2) {
        const ext2 = path.extname(files.photo2.originalname) || '.jpg';
        photo2DriveId = await this.uploadFile(files.photo2, `${cleanRollNo}_photo2${ext2}`, folderId, relativePath);
        createdFileIds.push(photo2DriveId);
      }

      if (files.photo3) {
        const ext3 = path.extname(files.photo3.originalname) || '.jpg';
        photo3DriveId = await this.uploadFile(files.photo3, `${cleanRollNo}_photo3${ext3}`, folderId, relativePath);
        createdFileIds.push(photo3DriveId);
      }

      let videoDriveId: string | undefined = undefined;
      if (files.video) {
        const videoExt = path.extname(files.video.originalname) || '.mp4';
        const videoFileName = `${cleanRollNo}_video${videoExt}`;
        videoDriveId = await this.uploadFile(files.video, videoFileName, folderId, relativePath);
        createdFileIds.push(videoDriveId);
      }

      let audioDriveId: string | undefined = undefined;
      if (files.audio) {
        const audioExt = path.extname(files.audio.originalname) || '.mp3';
        audioDriveId = await this.uploadFile(files.audio, `${cleanRollNo}_audio${audioExt}`, folderId, relativePath);
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
      await this.cleanupFailedUpload(createdFileIds, folderId, relativePath);
      throw error;
    }
  }

  /**
   * Rollback helper to delete newly created files/folders on error
   */
  public async cleanupFailedUpload(fileIds: string[], folderId?: string, relativePath?: string) {
    if (this.isMock || !this.drive) {
      if (relativePath) {
        const dirPath = path.join(this.mockBaseDir, relativePath);
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      }
      return;
    }

    // Delete uploaded files
    for (const fileId of fileIds) {
      try {
        await this.drive.files.delete({ fileId, supportsAllDrives: true });
      } catch (err) {
        console.warn(`Failed to delete orphaned Drive file ${fileId}`, err);
      }
    }

    // Delete student folder if created and empty
    if (folderId) {
      try {
        await this.drive.files.delete({ fileId: folderId, supportsAllDrives: true });
      } catch (err) {
        console.warn(`Failed to delete orphaned Drive folder ${folderId}`, err);
      }
    }
  }

  /**
   * Creates a Google Drive resumable upload session.
   *
   * The returned URL is a pre-authorized session URI that the **browser** (or any
   * client) can PUT the file body to directly — bypassing Render entirely.
   * The URL is valid for 7 days and requires no Authorization header from the
   * client; the session itself is the credential.
   *
   * Returns `null` when running in mock/local mode — callers must fall back to
   * the regular server-upload endpoint in that case.
   *
   * @param fileName       - desired filename in Drive (e.g. "21A91A0501_RaviKumar.mp4")
   * @param mimeType       - video MIME type (e.g. "video/mp4")
   * @param fileSize       - exact byte size of the file
   * @param parentFolderId - the Drive folder to place the file in
   */
  public async createResumableUploadSession(
    fileName: string,
    mimeType: string,
    fileSize: number,
    parentFolderId: string,
    clientOrigin?: string,
  ): Promise<string | null> {
    if (this.isMock || !this.drive) return null;

    // Obtain a fresh access token from whichever auth method is configured
    let accessToken: string;
    try {
      if (this.oauthClient) {
        const result = await this.oauthClient.getAccessToken();
        if (!result.token) throw new Error('OAuth2 returned empty token');
        accessToken = result.token;
      } else if (this.serviceAccountAuth) {
        const token = await this.serviceAccountAuth.getAccessToken();
        if (!token) throw new Error('Service account returned empty token');
        accessToken = token as string;
      } else {
        return null;
      }
    } catch (err) {
      console.warn('[Drive] Could not obtain access token for resumable upload session:', err);
      return null;
    }

    // Clean up duplicate file if it already exists in parentFolderId to allow clean override
    if (this.drive) {
      try {
        const existing = await this.drive.files.list({
          q: `'${parentFolderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`,
          fields: 'files(id, name)',
          supportsAllDrives: true,
          pageSize: 10,
        });
        if (existing.data.files && existing.data.files.length > 0) {
          for (const f of existing.data.files) {
            if (f.id) {
              await this.drive.files.delete({ fileId: f.id, supportsAllDrives: true }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('[Drive] Error cleaning up old file before resumable upload:', err);
      }
    }

    // Step 1: Initiate a resumable upload session — Drive returns a Location URL.
    // No file bytes are sent here; we only describe the file metadata.
    const initUrl =
      `https://www.googleapis.com/upload/drive/v3/files` +
      `?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(fileSize),
    };
    if (clientOrigin) {
      headers['Origin'] = clientOrigin;
    }

    const resp = await fetch(initUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: fileName,
        parents: [parentFolderId],
        copyRequiresWriterPermission: false,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(
        `[Drive] Resumable session init failed (${resp.status}): ${body.slice(0, 200)}`,
      );
    }

    const sessionUrl = resp.headers.get('location');
    if (!sessionUrl) {
      throw new Error('[Drive] No Location header returned from resumable upload init');
    }

    return sessionUrl;
  }

  /**
   * Pipes a Node.js Readable stream (the browser's upload) directly into a
   * Google Drive resumable upload session — **zero RAM buffering in Render**.
   *
   * How it works:
   *   Browser → [TCP] → Render (req stream) → [TCP] → googleapis.com (drive session PUT)
   *
   * Data flows through Render only at the OS socket-buffer level (~64 KB chunks),
   * so 200 students uploading 25 MB videos simultaneously won't cause an OOM crash.
   *
   * @param sessionUrl    Drive resumable session URL (null = mock/dev mode)
   * @param contentType   MIME type of the file (e.g. "video/mp4")
   * @param contentLength Exact byte count — MUST match the actual stream length
   * @param inputStream   Source stream (Express `req` object)
   * @param mockMeta      Only used in mock mode for local storage naming
   * @returns             Google Drive file ID of the newly uploaded file
   */
  public async streamUploadToDrive(
    sessionUrl: string | null,
    contentType: string,
    contentLength: number,
    inputStream: Readable,
    mockMeta?: { relativePath: string; fileName: string },
  ): Promise<string> {
    // ── Mock / dev mode ───────────────────────────────────────────────────────
    if (!sessionUrl || this.isMock) {
      // Collect into a buffer — only runs locally, memory is not a concern
      const chunks: Buffer[] = [];
      for await (const chunk of inputStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      const relPath = mockMeta?.relativePath ?? 'stream-uploads';
      const fileName = mockMeta?.fileName ?? `video_${Date.now()}.mp4`;
      const dirPath = path.join(this.mockBaseDir, relPath);
      fs.mkdirSync(dirPath, { recursive: true });
      const filePath = path.join(dirPath, fileName);
      fs.writeFileSync(filePath, buffer);

      const mockId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${fileName}`;
      const metaObj = {
        id: mockId,
        name: fileName,
        fileName,
        mimetype: contentType,
        mimeType: contentType,
        size: buffer.length,
      };

      fs.writeFileSync(`${filePath}.meta.json`, JSON.stringify(metaObj));
      fs.writeFileSync(path.join(dirPath, `${mockId}.meta.json`), JSON.stringify(metaObj));
      return mockId;
    }

    // ── Live mode: stream → Drive with no in-memory buffer ───────────────────
    const driveUrl = new URL(sessionUrl);
    return new Promise<string>((resolve, reject) => {
      const driveReq = https.request(
        {
          hostname: driveUrl.hostname,
          port: 443,
          path: driveUrl.pathname + driveUrl.search,
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'Content-Length': contentLength, // Drive requires exact length for single-shot PUT
          },
        },
        (driveRes) => {
          let body = '';
          driveRes.on('data', (chunk) => { body += String(chunk); });
          driveRes.on('end', () => {
            const status = driveRes.statusCode ?? 0;
            if (status < 200 || status >= 300) {
              return reject(
                new Error(`[Drive] Session PUT failed (HTTP ${status}): ${body.slice(0, 300)}`),
              );
            }
            try {
              const parsed = JSON.parse(body) as { id?: string };
              if (!parsed.id) return reject(new Error('[Drive] Response JSON has no id field'));
              const fileId = parsed.id;
              this.setViewerPermission(fileId).catch(() => {});
              resolve(fileId);
            } catch {
              reject(new Error(`[Drive] Could not parse response: ${body.slice(0, 100)}`));
            }
          });
        },
      );

      driveReq.setTimeout(180_000, () => {
        driveReq.destroy(new Error('[Drive] Upload timed out after 180s of inactivity'));
        reject(new Error('Upload timed out: Google Drive connection inactive'));
      });

      driveReq.on('error', (err) =>
        reject(new Error(`[Drive] Pipe error: ${err.message}`)),
      );

      // The magic line — pipe without buffering
      inputStream.pipe(driveReq);
      inputStream.on('error', (err) => {
        driveReq.destroy(err);
        reject(err);
      });
      inputStream.on('close', () => {
        if (!(inputStream as any).complete && !(inputStream as any).readableEnded) {
          driveReq.destroy(new Error('Client aborted upload stream'));
          reject(new Error('Upload interrupted: connection closed'));
        }
      });
    });
  }

  /**
   * Verifies an uploaded video file directly in Google Drive before recording a student submission.
   * Ensures:
   * 1. File exists and is not trashed
   * 2. File resides inside the designated student folder (parent folder match)
   * 3. File size is within configured bounds (> 0 and <= maxSizeBytes)
   * 4. MIME type is an allowed video format
   * 5. File extension is an allowed video extension
   */
  public async verifyUploadedVideoFile(
    driveFileId: string,
    expectedFolderId: string,
    maxSizeBytes: number,
  ): Promise<{
    valid: boolean;
    error?: string;
    fileMeta?: { name: string; size: number; mimeType: string };
  }> {
    if (!driveFileId || typeof driveFileId !== 'string') {
      return { valid: false, error: 'driveFileId is required' };
    }

    if (this.isMock || !this.drive || driveFileId.startsWith('mock_')) {
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
      const res = await this.drive.files.get({
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

      this.setViewerPermission(driveFileId).catch(() => {});

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

  /**
   * Reachability probe used by /ready: verifies the Drive root folder exists and
   * is not trashed (no-op for the local mock storage).
   */
  public async assertRootReachable(): Promise<void> {
    if (this.isMock || !this.drive) {
      if (!fs.existsSync(this.mockBaseDir)) {
        fs.mkdirSync(this.mockBaseDir, { recursive: true });
      }
      return;
    }
    const res = await this.drive.files.get({
      fileId: env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
      fields: 'id,trashed',
      supportsAllDrives: true,
    });
    if (res.data.trashed) throw new Error('Drive root folder is trashed');
    if (env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      this.setViewerPermission(env.GOOGLE_DRIVE_ROOT_FOLDER_ID).catch(() => {});
      // Ensure top-level Students folder exists and is cached
      this.resolveFolderPath('Students', env.GOOGLE_DRIVE_ROOT_FOLDER_ID).catch((err) => {
        console.warn('[Drive] Pre-creating Students folder notice:', err?.message || err);
      });
    }
  }

  /**
   * Checks whether a file exists in Drive or mock storage
   */
  public async checkFileExists(fileId?: string | null, relativePath?: string): Promise<boolean> {
    if (!fileId) return false;
    if (this.isMock || !this.drive || fileId.startsWith('mock_') || fileId.startsWith('drive_')) {
      if (relativePath) {
        const dirPath = path.join(this.mockBaseDir, relativePath);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          for (const f of files) {
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
      const res = await this.drive.files.get({
        fileId,
        fields: 'id, trashed',
        supportsAllDrives: true,
      });
      return Boolean(res.data.id && !res.data.trashed);
    } catch {
      return false;
    }
  }

  /**
   * Whether a file can be handed to the browser as a plain Drive link.
   *
   * False in mock/local mode, where the bytes only exist on this disk and there
   * is no Drive URL to redirect to. Callers use this to decide between a
   * redirect and the streaming proxy.
   */
  public canRedirectToDrive(): boolean {
    return !this.isMock && !!this.drive;
  }

  /**
   * A direct link to a Drive file that is already shared `anyone`/reader, so
   * Drive serves the bytes itself instead of this process proxying them.
   *
   * Returns `null` for mock ids and when Drive is unavailable, which is the
   * caller's signal to fall back to {@link streamDriveFile}.
   *
   * ## Why this matters
   *
   * Streaming a video through this process means the bytes cross this instance
   * twice: once inbound from Drive, once outbound to the viewer. On a single
   * small instance that caps concurrency at whatever the instance's bandwidth
   * allows, no matter how fast the database is. Redirecting hands the transfer
   * to Drive's CDN and reduces this process's share of the work to a 302.
   *
   * ## The `confirm=t` parameter
   *
   * Without it Drive answers large files with an HTML "can't scan for viruses,
   * are you sure you want to download?" interstitial instead of the file. That
   * page is HTML, so a `<video>` element gets a decode error and a PDF viewer
   * gets a broken frame. `confirm=t` asks for the file itself. This is safe
   * here precisely because these files are already `anyone`-readable by design,
   * so the interstitial is protecting a file the recipient could fetch anyway.
   *
   * ## Range requests
   *
   * This endpoint honours `Range`, which is what lets `<video>` seek and what
   * stops a browser downloading an entire file before playing it. Redirecting
   * preserves seeking; the streaming proxy had to implement that by hand.
   */
  public getDirectLink(fileId?: string | null): string | null {
    if (!fileId || !this.canRedirectToDrive()) return null;
    if (fileId.startsWith('mock_') || fileId.startsWith('drive_')) return null;
    return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
  }

  /**
   * Whether Drive would let an anonymous browser read this file directly.
   *
   * Redirecting to a file that is *not* `anyone`-readable produces a 403 from
   * Drive where a proxied response would have worked, because the proxy reads
   * through the service account. That failure is invisible in the server logs
   * and looks to the student like a broken video, so it has to be ruled out
   * before redirecting.
   *
   * The check costs one Drive `permissions.list` call, but only once per file
   * per process:
   *   - confirmed `anyone` by this process -> answered from `anyoneReadableCache`
   *   - confirmed not public              -> answered from a short negative cache
   *   - otherwise                         -> one API call, then cached
   *
   * Note this consults `anyoneReadableCache` and NOT `viewerPermissionCache`.
   * The latter also holds domain-only grants, which an anonymous browser cannot
   * read, so treating it as proof of public access would redirect to a 403 on
   * any Workspace that blocks link sharing.
   *
   * Both caches expire. A permanent positive entry would keep issuing redirects
   * for a file an admin had unshared; a permanent negative could not be
   * corrected by the async `setViewerPermission` that runs after upload.
   */
  public async isPubliclyReadable(fileId?: string | null): Promise<boolean> {
    if (!fileId || this.isMock || !this.drive || fileId.startsWith('mock_')) return false;
    const known = this.anyoneReadableCache.get(fileId);
    if (known !== undefined) {
      if (Date.now() < known) {
        // Refresh recency so a routinely-viewed file is not the next eviction.
        this.rememberAnyoneReadable(fileId);
        return true;
      }
      // The grant may have been revoked since we last confirmed it. Re-check
      // rather than trusting a stale positive, which is what would otherwise
      // keep redirecting to a URL Drive now answers with 403.
      this.anyoneReadableCache.delete(fileId);
    }

    const negative = this.negativePermissionCache.get(fileId);
    if (negative !== undefined) {
      if (Date.now() < negative) return false;
      this.negativePermissionCache.delete(fileId);
    }

    try {
      const res = await this.drive.permissions.list({
        fileId,
        fields: 'permissions(type,role)',
        supportsAllDrives: true,
        pageSize: 100,
      });
      const anyone = (res.data.permissions || []).some(
        (p) => p.type === 'anyone' && (p.role === 'reader' || p.role === 'writer'),
      );
      if (anyone) {
        this.rememberAnyoneReadable(fileId);
      } else {
        this.negativePermissionCache.set(fileId, Date.now() + 60_000);
      }
      return anyone;
    } catch (err: any) {
      // An API failure is not evidence of a private file, so this reports "not
      // safe to redirect" and the caller proxies this time. It IS remembered,
      // briefly: this route is public and the id in the URL is caller-chosen, so
      // an unconfirmed id would otherwise cost one outbound `permissions.list`
      // per request. Caching only delays the retry, and streaming still works.
      this.negativePermissionCache.set(fileId, Date.now() + 60_000);
      console.warn(`[Drive] Permission check failed for ${fileId}: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Records a file as anonymously readable for a bounded window.
   *
   * Bounded rather than permanent on purpose. A grant can be revoked (an admin
   * unshares the file, or Workspace policy tightens after the fact), and a
   * permanent entry would keep handing out redirects to a URL Drive now
   * answers with 403 — the exact failure this cache exists to prevent.
   */
  private rememberAnyoneReadable(fileId: string): void {
    // Re-insert so the key moves to the end of the Map's iteration order. The
    // read path above returns early without touching the map, so without this
    // the eviction below is least-recently-*written* — which made a video being
    // watched constantly the first entry evicted once the cap was reached.
    this.anyoneReadableCache.delete(fileId);
    this.anyoneReadableCache.set(fileId, Date.now() + ANYONE_READABLE_TTL_MS);

    // Unbounded growth on a 500 MB instance is its own outage, so the least
    // recently used entry goes.
    while (this.anyoneReadableCache.size > MAX_TRACKED_ANYONE_FILES) {
      const oldest = this.anyoneReadableCache.keys().next();
      if (oldest.done) break;
      this.anyoneReadableCache.delete(oldest.value);
    }
  }

  /**
   * Probes a direct Google Drive download link using a ranged GET (bytes=0-0)
   * to ensure anonymous readers can stream without 403/404 errors.
   * Caches positive results for 60 seconds.
   */
  public async probeDirectLink(directLink: string, fileId?: string): Promise<boolean> {
    if (!directLink) return false;
    const cacheKey = fileId || directLink;
    const expires = this.directLinkProbeCache.get(cacheKey);
    if (expires && expires > Date.now()) {
      return true;
    }

    try {
      const resp = await fetch(directLink, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal: AbortSignal.timeout(3000),
      });

      if (resp.body) {
        await resp.body.cancel().catch(() => {});
      }

      if (resp.status === 200 || resp.status === 206) {
        this.directLinkProbeCache.set(cacheKey, Date.now() + 60_000);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public clearProbeCache(key?: string): void {
    if (key) {
      this.directLinkProbeCache.delete(key);
    } else {
      this.directLinkProbeCache.clear();
    }
  }

  /**
   * Explicitly clears copyRequiresWriterPermission on a Drive file so that
   * anonymous viewers can download and stream it via direct link.
   */
  public async clearCopyRequiresWriterPermission(fileId: string): Promise<boolean> {
    if (this.isMock || !this.drive) return false;
    try {
      await this.drive.files.update({
        fileId,
        requestBody: { copyRequiresWriterPermission: false },
        supportsAllDrives: true,
      });
      return true;
    } catch (err) {
      console.warn(`[Drive] Failed to clear copyRequiresWriterPermission for ${fileId}:`, err);
      return false;
    }
  }

  /**
   * Iterates through all media files stored in the database and clears copyRequiresWriterPermission.
   */
  public async clearAllFilesCopyProtection(): Promise<{ count: number; failed: number }> {
    if (this.isMock || !this.drive) return { count: 0, failed: 0 };
    let count = 0;
    let failed = 0;

    const fileIds = new Set<string>();

    try {
      const introVideos = await prisma.introVideo.findMany({
        where: { driveFileId: { not: null } },
        select: { driveFileId: true },
      });
      introVideos.forEach((v) => v.driveFileId && fileIds.add(v.driveFileId));

      const submissions = await prisma.submission.findMany({
        select: { videoDriveId: true, photo1DriveId: true, photo2DriveId: true, photo3DriveId: true },
      });
      submissions.forEach((s) => {
        if (s.videoDriveId) fileIds.add(s.videoDriveId);
        if (s.photo1DriveId) fileIds.add(s.photo1DriveId);
        if (s.photo2DriveId) fileIds.add(s.photo2DriveId);
        if (s.photo3DriveId) fileIds.add(s.photo3DriveId);
      });

      const resumes = await prisma.resume.findMany({
        where: { driveFileId: { not: null } },
        select: { driveFileId: true },
      });
      resumes.forEach((r) => r.driveFileId && fileIds.add(r.driveFileId));

      const certs = await prisma.certificate.findMany({
        where: { fileDriveId: { not: null } },
        select: { fileDriveId: true },
      });
      certs.forEach((c) => c.fileDriveId && fileIds.add(c.fileDriveId));

      const achs = await prisma.achievement.findMany({
        where: { proofDriveId: { not: null } },
        select: { proofDriveId: true },
      });
      achs.forEach((a) => a.proofDriveId && fileIds.add(a.proofDriveId));
    } catch (e) {
      console.warn('[Drive] Error fetching files for copy protection clearing:', e);
    }

    for (const fileId of fileIds) {
      const ok = await this.clearCopyRequiresWriterPermission(fileId);
      if (ok) count++; else failed++;
    }

    return { count, failed };
  }

  /**
   * Proxy/Stream a Drive file to the client for admin/public media viewing.
   * @param fileId       - Google Drive file ID
   * @param relativePath - optional path hint used by the mock storage backend
   * @param rangeHeader  - optional HTTP Range header from the client request
   *                       (e.g. "bytes=0-1048576"). A matching byte range is
   *                       requested from the storage backend and reported back
   *                       via `contentRange` so callers can answer with 206.
   */
  public async streamDriveFile(
    fileId: string,
    relativePath?: string,
    rangeHeader?: string,
  ): Promise<DriveStreamResult> {
    if (this.isMock || !this.drive || fileId.startsWith('mock_') || fileId.startsWith('drive_')) {
      const inspectMockFile = (metaFilePath: string): { actualFilePath: string; meta: any; size: number } | null => {
        try {
          const meta = JSON.parse(fs.readFileSync(metaFilePath, 'utf-8'));
          if (meta.id === fileId) {
            const dir = path.dirname(metaFilePath);
            const targetName = meta.fileName || meta.name || path.basename(metaFilePath).replace('.meta.json', '');
            let actualPath = path.join(dir, targetName);
            if (!fs.existsSync(actualPath)) {
              actualPath = metaFilePath.replace('.meta.json', '');
            }
            if (fs.existsSync(actualPath)) {
              const stat = fs.statSync(actualPath);
              return { actualFilePath: actualPath, meta, size: stat.size };
            }
          }
        } catch (_) {}
        return null;
      };

      let match: { actualFilePath: string; meta: any; size: number } | null = null;

      // 1. Find file in relativePath if provided
      if (relativePath) {
        const dirPath = path.join(this.mockBaseDir, relativePath);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            if (file.endsWith('.meta.json')) {
              match = inspectMockFile(path.join(dirPath, file));
              if (match) break;
            }
          }
        }
      }

      // 2. If not found in relativePath, search recursively in mockBaseDir
      if (!match) {
        const findInDir = (dir: string): { actualFilePath: string; meta: any; size: number } | null => {
          if (!fs.existsSync(dir)) return null;
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              const res = findInDir(full);
              if (res) return res;
            } else if (entry.name.endsWith('.meta.json')) {
              const found = inspectMockFile(full);
              if (found) return found;
            }
          }
          return null;
        };
        match = findInDir(this.mockBaseDir);
      }

      if (!match) {
        throw new Error(`Mock file ${fileId} not found`);
      }

      return this.createLocalStream(
        match.actualFilePath,
        match.meta.mimeType || match.meta.mimetype || 'application/octet-stream',
        match.size,
        rangeHeader,
      );
    }

    // Google Drive stream with metadata caching
    let totalSize: number | undefined;
    let mimeType = 'application/octet-stream';
    const cachedMeta = this.fileMetadataCache.get(fileId);

    if (cachedMeta && (Date.now() - cachedMeta.cachedAt < 3600_000)) {
      totalSize = cachedMeta.size;
      mimeType = cachedMeta.mimeType;
    } else {
      if (!this.viewerPermissionCache.has(fileId)) {
        this.setViewerPermission(fileId).catch(() => {});
      }
      const metadata = await this.drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: 'mimeType, size, name',
      });

      totalSize = metadata.data.size ? parseInt(metadata.data.size, 10) : undefined;
      mimeType = metadata.data.mimeType || 'application/octet-stream';
      this.fileMetadataCache.set(fileId, {
        size: totalSize,
        mimeType,
        name: metadata.data.name || undefined,
        cachedAt: Date.now(),
      });
    }

    const requestOptions: any = { responseType: 'stream' };

    // A parsed range lets us both narrow the Drive request and report an exact
    // Content-Range back to the caller. Suffix ranges (`bytes=-500`) matter most
    // here: MP4 `moov` atoms are often at the end of the file.
    const parsed = rangeHeader && totalSize ? parseRange(rangeHeader, totalSize) : null;

    if (rangeHeader) {
      // When the size is unknown we cannot parse the header ourselves, so pass it
      // through untouched and let Drive serve the range.
      requestOptions.headers = {
        Range: parsed ? `bytes=${parsed.start}-${parsed.end}` : rangeHeader,
      };
    }

    const res = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      requestOptions,
    );

    // Fall back to the range Drive actually served, so a pass-through range still
    // produces a correct 206 rather than a full 200 body the player cannot seek in.
    // `totalSize` is always defined when `parsed` is, since parsing needs it.
    const contentRange = parsed
      ? { start: parsed.start, end: parsed.end, total: totalSize! }
      : (parseContentRangeHeader(
          (res.headers?.['content-range'] as string | undefined) ?? undefined,
        ) ?? undefined);

    return {
      stream: res.data as Readable,
      mimeType,
      size: totalSize,
      contentRange,
    };
  }

  /** Build a (optionally ranged) read stream for the local mock storage. */
  private createLocalStream(
    filePath: string,
    mimeType: string,
    size: number,
    rangeHeader?: string,
  ): DriveStreamResult {
    const range = rangeHeader ? parseRange(rangeHeader, size) : null;

    if (!range) {
      return { stream: fs.createReadStream(filePath), mimeType, size };
    }

    return {
      stream: fs.createReadStream(filePath, { start: range.start, end: range.end }),
      mimeType,
      size,
      contentRange: { start: range.start, end: range.end, total: size },
    };
  }

  /**
   * Delete a single stored file by its Drive/mock ID.
   *
   * Used to purge a superseded video after a student uploads a replacement, so
   * the old file never lingers next to the new one. Never throws — a failed
   * cleanup must not fail the request that already stored the new file.
   */
  public async deleteFileById(fileId: string, relativePath?: string): Promise<boolean> {
    if (!fileId) return false;

    if (this.isMock || !this.drive) {
      try {
        const candidates: string[] = [];
        if (relativePath) candidates.push(path.join(this.mockBaseDir, relativePath));
        candidates.push(this.mockBaseDir);

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
              } catch (_) {}
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
      await this.drive.files.delete({ fileId, supportsAllDrives: true });
      return true;
    } catch (err) {
      console.warn(`[drive] failed to delete file ${fileId}:`, err);
      return false;
    }
  }

  /**
   * Deletes all files matching a prefix within a student's relative path or Drive folder.
   * Useful when overriding files (e.g. photos, videos, resumes) to guarantee no previous takes remain.
   */
  public async deleteFilesByPrefix(folderRelativePath: string, filePrefix: string): Promise<number> {
    let deletedCount = 0;
    if (this.isMock || !this.drive) {
      const dirPath = path.join(this.mockBaseDir, folderRelativePath);
      if (fs.existsSync(dirPath)) {
        for (const file of fs.readdirSync(dirPath)) {
          if (file.startsWith(filePrefix)) {
            try {
              fs.rmSync(path.join(dirPath, file), { force: true });
              deletedCount++;
            } catch (_) {}
          }
        }
      }
      return deletedCount;
    }

    try {
      const folderId = await this.resolveFolderPath(folderRelativePath, env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and name contains '${filePrefix.replace(/'/g, "\\'")}' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        pageSize: 50,
      });
      if (res.data.files) {
        for (const f of res.data.files) {
          if (f.id && f.name && f.name.startsWith(filePrefix)) {
            await this.drive.files.delete({ fileId: f.id, supportsAllDrives: true }).catch(() => {});
            deletedCount++;
          }
        }
      }
    } catch (err) {
      console.warn(`[Drive] Error deleting files by prefix ${filePrefix}:`, err);
    }
    return deletedCount;
  }

  /**
   * Deletes only the video file for a submission (mock storage or Google Drive),
   * leaving the rest of the record and folder intact so the student can re-upload.
   */
  public async deleteVideo(submission: {
    videoDriveId?: string | null;
    driveFolderPath: string;
  }): Promise<void> {
    if (!submission.videoDriveId) {
      return;
    }

    if (this.isMock || !this.drive) {
      if (submission.driveFolderPath) {
        const dirPath = path.join(this.mockBaseDir, submission.driveFolderPath);
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
            } catch (_) {}
          }
        }
      }
      return;
    }

    try {
      await this.drive.files.delete({
        fileId: submission.videoDriveId,
        supportsAllDrives: true,
      });
    } catch (err) {
      console.warn(`Failed to delete Drive video file ${submission.videoDriveId}:`, err);
    }
  }

  /**
   * Deletes all files and folder associated with a submission from Google Drive or mock storage
   */
  public async deleteSubmissionFiles(submission: {
    photo1DriveId?: string | null;
    photo2DriveId?: string | null;
    photo3DriveId?: string | null;
    videoDriveId?: string | null;
    audioDriveId?: string | null;
    driveFolderPath: string;
  }): Promise<void> {
    const fileIds = [
      ...(submission.photo1DriveId ? [submission.photo1DriveId] : []),
      ...(submission.photo2DriveId ? [submission.photo2DriveId] : []),
      ...(submission.photo3DriveId ? [submission.photo3DriveId] : []),
      ...(submission.videoDriveId ? [submission.videoDriveId] : []),
      ...(submission.audioDriveId ? [submission.audioDriveId] : []),
    ];

    if (this.isMock || !this.drive) {
      for (const fileId of fileIds) {
        await this.deleteFileById(fileId, submission.driveFolderPath);
      }
      if (submission.driveFolderPath) {
        const dirPath = path.join(this.mockBaseDir, submission.driveFolderPath);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          if (files.length === 0) {
            fs.rmSync(dirPath, { recursive: true, force: true });
          }
        }
      }
      return;
    }

    // Delete individual uploaded files
    for (const fileId of fileIds) {
      if (!fileId) continue;
      try {
        await this.drive.files.delete({ fileId, supportsAllDrives: true });
      } catch (err) {
        console.warn(`Failed to delete Drive file ${fileId}:`, err);
      }
    }

    // Search and delete student folder only if empty
    try {
      const folderName = path.basename(submission.driveFolderPath);
      if (folderName) {
        const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
        const res = await this.drive.files.list({
          q: query,
          fields: 'files(id, name)',
          spaces: 'drive',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        if (res.data.files && res.data.files.length > 0) {
          for (const folder of res.data.files) {
            if (folder.id) {
              const children = await this.drive.files.list({
                q: `'${folder.id}' in parents and trashed = false`,
                fields: 'files(id)',
                pageSize: 1,
                supportsAllDrives: true,
              });
              if (!children.data.files || children.data.files.length === 0) {
                await this.drive.files.delete({ fileId: folder.id, supportsAllDrives: true });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to delete student Drive folder for ${submission.driveFolderPath}:`, err);
    }
  }

  /**
   * Generates a compressed WebP thumbnail (a few KB) from a Drive file's thumbnailLink.
   * Tailored aspect ratios:
   *  - video: 320x180 (16:9)
   *  - resume: 240x320 (3:4 portrait)
   *  - certificate / achievement: 320x240 (4:3)
   */
  public async generateThumbnail(
    fileId: string,
    type: 'video' | 'resume' | 'certificate' | 'achievement' = 'certificate',
  ): Promise<Buffer | null> {
    try {
      const dimensions =
        type === 'video'
          ? { width: 320, height: 180 }
          : type === 'resume'
          ? { width: 240, height: 320 }
          : { width: 320, height: 240 };

      if (this.isMock || !this.drive) {
        // Mock / local dev mode: look for local file in mock storage
        const inspectMock = (id: string): string | null => {
          try {
            const scan = (dir: string): string | null => {
              if (!fs.existsSync(dir)) return null;
              for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  const sub = scan(full);
                  if (sub) return sub;
                } else if (entry.name.endsWith('.meta.json')) {
                  try {
                    const m = JSON.parse(fs.readFileSync(full, 'utf8'));
                    if (m.id === id) {
                      const actual = full.replace('.meta.json', '');
                      if (fs.existsSync(actual)) return actual;
                    }
                  } catch {}
                }
              }
              return null;
            };
            return scan(this.mockBaseDir);
          } catch {
            return null;
          }
        };

        const localPath = inspectMock(fileId);
        if (localPath && fs.existsSync(localPath)) {
          const buf = fs.readFileSync(localPath);
          try {
            return await sharp(buf)
              .resize(dimensions.width, dimensions.height, { fit: 'cover' })
              .webp({ quality: 70 })
              .toBuffer();
          } catch {
            // Not a decodable image (e.g. mock PDF/video) -> create clean placeholder WebP buffer
          }
        }

        // Return a clean mock WebP placeholder buffer using Sharp
        return await sharp({
          create: {
            width: dimensions.width,
            height: dimensions.height,
            channels: 4,
            background: { r: 15, g: 23, b: 42, alpha: 1 },
          },
        })
          .webp({ quality: 70 })
          .toBuffer();
      }

      // Production Google Drive thumbnail retrieval
      const meta = await this.drive.files.get({
        fileId,
        fields: 'thumbnailLink',
        supportsAllDrives: true,
      });

      const thumbnailLink = meta.data.thumbnailLink;
      if (!thumbnailLink) {
        return null;
      }

      const response = await fetch(thumbnailLink);
      if (!response.ok) {
        return null;
      }

      const original = Buffer.from(await response.arrayBuffer());
      return await sharp(original)
        .resize(dimensions.width, dimensions.height, { fit: 'cover' })
        .webp({ quality: 70 })
        .toBuffer();
    } catch (err: any) {
      console.warn(`[Drive] Thumbnail generation failed for ${type}/${fileId}:`, err?.message || err);
      return null;
    }
  }
}

export const driveService = new DriveService();
