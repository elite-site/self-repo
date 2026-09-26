import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { parseRange } from '../utils/rangeParser';

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

class DriveService {
  private drive: drive_v3.Drive | null = null;
  private isMock = false;
  private mockBaseDir = path.resolve(__dirname, '../../storage/mock-drive');

  // Stored so createResumableUploadSession() can get a fresh access token
  private oauthClient: InstanceType<typeof google.auth.OAuth2> | null = null;
  private serviceAccountAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null;
  private viewerPermissionCache = new Set<string>();
  private folderMemoryCache = new Map<string, string>();

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
        console.warn('⚠️ Failed to initialize Google Drive auth. Falling back to local storage mock.', err);
        this.isMock = true;
      }
    } else {
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
   * Builds the folder tree: {eventName}/{eventYear}/{year}-{section}/{BRANCH}_{RollNo}_{Name}
   */
  public async resolveStudentFolder(meta: StudentFolderMeta): Promise<{ folderId: string; relativePath: string }> {
    const cleanName = meta.name.replace(/[^a-zA-Z0-9]/g, '');
    const cleanRollNo = meta.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    const cleanBranch = meta.branch.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');

    const eventFolderName = meta.eventName || 'Photography';
    const yearFolderName = `${meta.eventYear}`;
    const sectionFolderName = `${meta.year}-${meta.section.toUpperCase()}`;
    const studentFolderName = `${cleanBranch}_${cleanRollNo}_${cleanName}`;
    const relativePath = `${eventFolderName}/${yearFolderName}/${sectionFolderName}/${studentFolderName}`;

    if (this.isMock || !this.drive) {
      const fullMockPath = path.join(this.mockBaseDir, relativePath);
      fs.mkdirSync(fullMockPath, { recursive: true });
      return { folderId: `mock_${studentFolderName}`, relativePath };
    }

    // 1. Root -> Event folder (e.g. "Photography", "Dancing", "Singing")
    const eventKey = `${eventFolderName}`;
    const eventFolderId = await this.getOrCreateDriveFolder(eventFolderName, env.GOOGLE_DRIVE_ROOT_FOLDER_ID, eventKey);

    // 2. Event folder -> Year folder (e.g. "2026")
    const yearKey = `${eventFolderName}/${yearFolderName}`;
    const yearFolderId = await this.getOrCreateDriveFolder(yearFolderName, eventFolderId, yearKey);

    // 3. Year folder -> Section folder (e.g. "2-A")
    const sectionKey = `${eventFolderName}/${yearFolderName}/${sectionFolderName}`;
    const sectionFolderId = await this.getOrCreateDriveFolder(sectionFolderName, yearFolderId, sectionKey);

    // 4. Section folder -> Student folder
    const studentFolderId = await this.getOrCreateDriveFolder(studentFolderName, sectionFolderId);

    return { folderId: studentFolderId, relativePath };
  }

  /**
   * Recursively gets or creates a folder hierarchy in Google Drive
   * (e.g. "Resumes/2-A/24K61A1259_KoppisettiHemanth" or "Certificates/2-A/24K61A1259_KoppisettiHemanth")
   */
  public async resolveFolderPath(relativePath: string, rootFolderId?: string): Promise<string> {
    const rootId = rootFolderId || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root';
    if (this.isMock || !this.drive) {
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
      console.log(`[Drive] Public viewer access ('anyone') granted to: ${fileOrFolderId}`);
      return true;
    } catch (permErr: any) {
      const msg = permErr?.message || String(permErr);
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        this.viewerPermissionCache.add(fileOrFolderId);
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

    return { count, failed };
  }

  /**
   * Uploads a single file to Google Drive or mock storage
   */
  public async uploadFile(
    file: UploadedFileData,
    fileName: string,
    parentFolderId: string,
    relativePath: string
  ): Promise<string> {
    if (this.isMock || !this.drive) {
      const dirPath = path.join(this.mockBaseDir, relativePath);
      fs.mkdirSync(dirPath, { recursive: true });
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

    // Dynamically resolve and create the folder hierarchy in Google Drive
    let targetFolderId = parentFolderId;
    if (relativePath) {
      try {
        targetFolderId = await this.resolveFolderPath(relativePath, parentFolderId);
      } catch (folderErr) {
        console.warn(`Retry resolving folder path "${relativePath}":`, folderErr);
        try {
          targetFolderId = await this.resolveFolderPath(relativePath, parentFolderId);
        } catch (retryErr) {
          console.error(`Failed to resolve folder path "${relativePath}" after retry:`, retryErr);
          throw new Error(`Failed to create or access Google Drive folder for "${relativePath}"`);
        }
      }
    }

    const media = {
      mimeType: file.mimetype,
      body: Readable.from(file.buffer),
    };

    const res = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
      },
      media,
      supportsAllDrives: true,
      fields: 'id, name, webViewLink, webContentLink',
    });

    const fileId = res.data.id!;

    // Grant viewer access to the uploaded file and its parent folder
    await this.setViewerPermission(fileId);
    if (targetFolderId && targetFolderId !== parentFolderId) {
      this.setViewerPermission(targetFolderId).catch(() => {});
    }

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
    const { folderId, relativePath } = await this.resolveStudentFolder(meta);
    const createdFileIds: string[] = [];

    try {
      let photo1DriveId: string | undefined = undefined;
      let photo2DriveId: string | undefined = undefined;
      let photo3DriveId: string | undefined = undefined;

      if (files.photo1) {
        const ext1 = path.extname(files.photo1.originalname) || '.jpg';
        photo1DriveId = await this.uploadFile(files.photo1, `photo1${ext1}`, folderId, relativePath);
        createdFileIds.push(photo1DriveId);
      }

      if (files.photo2) {
        const ext2 = path.extname(files.photo2.originalname) || '.jpg';
        photo2DriveId = await this.uploadFile(files.photo2, `photo2${ext2}`, folderId, relativePath);
        createdFileIds.push(photo2DriveId);
      }

      if (files.photo3) {
        const ext3 = path.extname(files.photo3.originalname) || '.jpg';
        photo3DriveId = await this.uploadFile(files.photo3, `photo3${ext3}`, folderId, relativePath);
        createdFileIds.push(photo3DriveId);
      }

      let videoDriveId: string | undefined = undefined;
      if (files.video) {
        const videoExt = path.extname(files.video.originalname) || '.mp4';
        const cleanName = meta.name.replace(/[^a-zA-Z0-9]/g, '');
        const cleanRollNo = meta.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
        const videoFileName = `${cleanRollNo}_${cleanName}${videoExt}`;
        videoDriveId = await this.uploadFile(files.video, videoFileName, folderId, relativePath);
        createdFileIds.push(videoDriveId);
      }

      let audioDriveId: string | undefined = undefined;
      if (files.audio) {
        const audioExt = path.extname(files.audio.originalname) || '.mp3';
        audioDriveId = await this.uploadFile(files.audio, `audio${audioExt}`, folderId, relativePath);
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

    // Step 1: Initiate a resumable upload session — Drive returns a Location URL.
    // No file bytes are sent here; we only describe the file metadata.
    const initUrl =
      `https://www.googleapis.com/upload/drive/v3/files` +
      `?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType`;

    const resp = await fetch(initUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(fileSize),
      },
      body: JSON.stringify({
        name: fileName,
        parents: [parentFolderId],
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
   * Reachability probe used by /ready: verifies the Drive root folder exists and
   * is not trashed (no-op for the local mock storage).
   */

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
      // Ensure top-level category folders exist and are cached
      Promise.all([
        this.resolveFolderPath('Resumes', env.GOOGLE_DRIVE_ROOT_FOLDER_ID),
        this.resolveFolderPath('Certificates', env.GOOGLE_DRIVE_ROOT_FOLDER_ID),
        this.resolveFolderPath('Achievements', env.GOOGLE_DRIVE_ROOT_FOLDER_ID),
        this.resolveFolderPath('Profiles', env.GOOGLE_DRIVE_ROOT_FOLDER_ID),
      ]).catch((err) => {
        console.warn('[Drive] Pre-creating category folders notice:', err?.message || err);
      });
    }
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
    if (this.isMock || !this.drive) {
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

    // Google Drive stream
    this.setViewerPermission(fileId).catch(() => {});
    const metadata = await this.drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: 'mimeType, size, name',
    });

    const totalSize = metadata.data.size ? parseInt(metadata.data.size, 10) : undefined;
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
      mimeType: metadata.data.mimeType || 'application/octet-stream',
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
      if (submission.driveFolderPath) {
        const dirPath = path.join(this.mockBaseDir, submission.driveFolderPath);
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
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

    // Search and delete student folder
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
              await this.drive.files.delete({ fileId: folder.id, supportsAllDrives: true });
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to delete student Drive folder for ${submission.driveFolderPath}:`, err);
    }
  }
}

export const driveService = new DriveService();
