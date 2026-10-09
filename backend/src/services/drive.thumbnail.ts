import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { drive_v3 } from 'googleapis';

export async function generateThumbnail(
  drive: drive_v3.Drive | null,
  isMock: boolean,
  mockBaseDir: string,
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

    if (isMock || !drive) {
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
          return scan(mockBaseDir);
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
    const meta = await drive.files.get({
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
