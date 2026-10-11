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
  stream: NodeJS.ReadableStream;
  mimeType: string;
  size?: number;
  contentRange?: string;
}

export type MediaType = 'video' | 'photo' | 'resume' | 'certificate' | 'achievement';
