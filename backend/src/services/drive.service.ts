import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

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

class DriveService {
  private drive: drive_v3.Drive | null = null;
  private isMock = false;
  private mockBaseDir = path.resolve(__dirname, '../../storage/mock-drive');

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
   * Helper to get or create a folder idempotently in Google Drive
   */
  private async getOrCreateDriveFolder(name: string, parentId: string, cacheKey?: string): Promise<string> {
    if (cacheKey) {
      const cached = await prisma.driveFolderCache.findUnique({
        where: { pathKey: cacheKey },
      });
      if (cached) {
        return cached.driveFolderId;
      }
    }

    if (this.isMock || !this.drive) {
      const folderId = `mock_folder_${cacheKey ? cacheKey.replace(/[\/\s]/g, '_') : name}`;
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
      if (cacheKey) {
        await prisma.driveFolderCache.upsert({
          where: { pathKey: cacheKey },
          create: { pathKey: cacheKey, driveFolderId: folderId },
          update: { driveFolderId: folderId },
        });
      }
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

    const media = {
      mimeType: file.mimetype,
      body: Readable.from(file.buffer),
    };

    const res = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId],
      },
      media,
      supportsAllDrives: true,
      fields: 'id',
    });

    return res.data.id!;
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
        videoDriveId = await this.uploadFile(files.video, `video${videoExt}`, folderId, relativePath);
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
   * Proxy/Stream a Drive file to the client for admin media viewing
   */
  public async streamDriveFile(
    fileId: string,
    relativePath?: string
  ): Promise<{ stream: Readable; mimeType: string; size?: number }> {
    if (this.isMock || !this.drive) {
      // Find file in mock directory
      if (relativePath) {
        const dirPath = path.join(this.mockBaseDir, relativePath);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            if (file.endsWith('.meta.json')) {
              const meta = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
              if (meta.id === fileId) {
                const actualFileName = file.replace('.meta.json', '');
                const actualFilePath = path.join(dirPath, actualFileName);
                const stat = fs.statSync(actualFilePath);
                return {
                  stream: fs.createReadStream(actualFilePath),
                  mimeType: meta.mimetype || 'image/jpeg',
                  size: stat.size,
                };
              }
            }
          }
        }
      }
      // If not found in relativePath, search recursively in mockBaseDir
      const findInDir = (dir: string): { filePath: string; meta: any } | null => {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const res = findInDir(full);
            if (res) return res;
          } else if (entry.name.endsWith('.meta.json')) {
            try {
              const meta = JSON.parse(fs.readFileSync(full, 'utf-8'));
              if (meta.id === fileId) {
                return {
                  filePath: full.replace('.meta.json', ''),
                  meta,
                };
              }
            } catch (_) {}
          }
        }
        return null;
      };

      const match = findInDir(this.mockBaseDir);
      if (match && fs.existsSync(match.filePath)) {
        const stat = fs.statSync(match.filePath);
        return {
          stream: fs.createReadStream(match.filePath),
          mimeType: match.meta.mimetype || 'image/jpeg',
          size: stat.size,
        };
      }

      throw new Error(`Mock file ${fileId} not found`);
    }

    // Google Drive stream
    const metadata = await this.drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: 'mimeType, size, name',
    });

    const res = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    return {
      stream: res.data as Readable,
      mimeType: metadata.data.mimeType || 'application/octet-stream',
      size: metadata.data.size ? parseInt(metadata.data.size, 10) : undefined,
    };
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
