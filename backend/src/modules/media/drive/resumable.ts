import fs from 'fs';
import path from 'path';
import https from 'https';
import { Readable } from 'stream';
import { DriveContext } from './types';

export async function createResumableUploadSession(
  ctx: DriveContext,
  fileName: string,
  mimeType: string,
  fileSize: number,
  parentFolderId: string,
  clientOrigin?: string,
): Promise<string | null> {
  if (ctx.isMock || !ctx.drive) return null;

  let accessToken: string;
  try {
    if (ctx.oauthClient) {
      const result = await ctx.oauthClient.getAccessToken();
      if (!result.token) throw new Error('OAuth2 returned empty token');
      accessToken = result.token;
    } else if (ctx.serviceAccountAuth) {
      const token = await ctx.serviceAccountAuth.getAccessToken();
      if (!token) throw new Error('Service account returned empty token');
      accessToken = token as string;
    } else {
      return null;
    }
  } catch (err) {
    console.warn('[Drive] Could not obtain access token for resumable upload session:', err);
    return null;
  }

  if (ctx.drive) {
    try {
      const existing = await ctx.drive.files.list({
        q: `'${parentFolderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        pageSize: 10,
      });
      if (existing.data.files && existing.data.files.length > 0) {
        for (const f of existing.data.files) {
          if (f.id) {
            await ctx.drive.files.delete({ fileId: f.id, supportsAllDrives: true }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('[Drive] Error cleaning up old file before resumable upload:', err);
    }
  }

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

export async function streamUploadToDrive(
  ctx: DriveContext,
  sessionUrl: string | null,
  contentType: string,
  contentLength: number,
  inputStream: Readable,
  setViewerPermission?: (id: string) => Promise<boolean>,
  mockMeta?: { relativePath: string; fileName: string },
): Promise<string> {
  if (!sessionUrl || ctx.isMock) {
    const chunks: Buffer[] = [];
    for await (const chunk of inputStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const relPath = mockMeta?.relativePath ?? 'stream-uploads';
    const fileName = mockMeta?.fileName ?? `video_${Date.now()}.mp4`;
    const dirPath = path.join(ctx.mockBaseDir, relPath);
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
          'Content-Length': contentLength,
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
            if (setViewerPermission) {
              setViewerPermission(fileId).catch(() => {});
            }
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
