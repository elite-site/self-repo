import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { drive_v3 } from 'googleapis';
import { parseRange } from '../utils/rangeParser';

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

/** Build a (optionally ranged) read stream for the local mock storage. */
export function createLocalStream(
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

export interface StreamDriveFileOptions {
  drive: drive_v3.Drive | null;
  isMock: boolean;
  mockBaseDir: string;
  fileMetadataCache: Map<string, { mimeType: string; size?: number; name?: string; cachedAt: number }>;
  viewerPermissionCache: Set<string>;
  setViewerPermission: (fileOrFolderId?: string | null) => Promise<boolean>;
  fileId: string;
  relativePath?: string;
  rangeHeader?: string;
}

export async function streamDriveFile(options: StreamDriveFileOptions): Promise<DriveStreamResult> {
  const {
    drive,
    isMock,
    mockBaseDir,
    fileMetadataCache,
    viewerPermissionCache,
    setViewerPermission,
    fileId,
    relativePath,
    rangeHeader,
  } = options;

  if (isMock || !drive || fileId.startsWith('mock_') || fileId.startsWith('drive_')) {
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
      const dirPath = path.join(mockBaseDir, relativePath);
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
      match = findInDir(mockBaseDir);
    }

    if (!match) {
      throw new Error(`Mock file ${fileId} not found`);
    }

    return createLocalStream(
      match.actualFilePath,
      match.meta.mimeType || match.meta.mimetype || 'application/octet-stream',
      match.size,
      rangeHeader,
    );
  }

  // Google Drive stream with metadata caching
  let totalSize: number | undefined;
  let mimeType = 'application/octet-stream';
  const cachedMeta = fileMetadataCache.get(fileId);

  if (cachedMeta && (Date.now() - cachedMeta.cachedAt < 3600_000)) {
    totalSize = cachedMeta.size;
    mimeType = cachedMeta.mimeType;
  } else {
    if (!viewerPermissionCache.has(fileId)) {
      setViewerPermission(fileId).catch(() => {});
    }
    const metadata = await drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: 'mimeType, size, name',
    });

    totalSize = metadata.data.size ? parseInt(metadata.data.size, 10) : undefined;
    mimeType = metadata.data.mimeType || 'application/octet-stream';
    fileMetadataCache.set(fileId, {
      size: totalSize,
      mimeType,
      name: metadata.data.name || undefined,
      cachedAt: Date.now(),
    });
  }

  const requestOptions: any = { responseType: 'stream' };

  const parsed = rangeHeader && totalSize ? parseRange(rangeHeader, totalSize) : null;

  if (rangeHeader) {
    requestOptions.headers = {
      Range: parsed ? `bytes=${parsed.start}-${parsed.end}` : rangeHeader,
    };
  }

  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    requestOptions,
  );

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
