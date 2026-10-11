import { drive_v3, google } from 'googleapis';

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

export interface DriveContext {
  drive: drive_v3.Drive | null;
  isMock: boolean;
  mockBaseDir: string;
  oauthClient: InstanceType<typeof google.auth.OAuth2> | null;
  serviceAccountAuth: InstanceType<typeof google.auth.GoogleAuth> | null;
  viewerPermissionCache: Set<string>;
  anyoneReadableCache: Map<string, number>;
  negativePermissionCache: Map<string, number>;
  folderMemoryCache: Map<string, string>;
  fileMetadataCache: Map<string, { mimeType: string; size?: number; name?: string; cachedAt: number }>;
  directLinkProbeCache: Map<string, number>;
}
