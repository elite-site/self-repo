/**
 * R2 adapter — Cloudflare R2 (S3-compatible) backed by @aws-sdk/client-s3.
 *
 * All object keys MUST start with "lesson-cache/". This prefix is enforced by
 * every method so a misconfigured caller cannot touch other R2 namespaces.
 *
 * The adapter is instantiated lazily when FEATURE_VIDEO_CACHE=true.
 * Calling r2Adapter when the feature is off throws immediately so callers
 * get a clear error rather than cryptic SDK failures.
 *
 * SEC-4: Never expose R2 keys or bucket names to clients. Presigned URLs are
 * temporary and do not contain internal identifiers.
 *
 * ARCH-7: All SDK errors are caught at this boundary and re-thrown as
 * UpstreamError so services never see raw AWS SDK errors.
 */

import { Readable } from 'stream';
import {
  S3Client,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  NotFound,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { ForbiddenError, UpstreamError } from '../utils/appError';

const KEY_PREFIX = 'lesson-cache/';

function assertKeyPrefix(key: string): void {
  if (!key.startsWith(KEY_PREFIX)) {
    throw new ForbiddenError(
      `R2 key "${key}" must start with "${KEY_PREFIX}"`,
      'R2_KEY_PREFIX_VIOLATION',
    );
  }
}

export interface R2HeadResult {
  sizeBytes: number;
  md5: string | null;
}

export interface R2ListItem {
  key: string;
  sizeBytes: number;
}

export interface R2Adapter {
  /** Stream a file to R2 using multipart upload — never buffers the entire body. */
  putObjectStream(key: string, stream: Readable, size: number): Promise<void>;
  /** Returns object metadata or null when the object does not exist. */
  headObject(key: string): Promise<R2HeadResult | null>;
  /** Deletes an object. Key must start with "lesson-cache/". */
  deleteObject(key: string): Promise<void>;
  /** Lists objects under a prefix. Prefix must start with "lesson-cache/". */
  listObjects(prefix: string): Promise<R2ListItem[]>;
  /** Returns a presigned GET URL valid for ttlSec seconds. */
  presignGet(key: string, ttlSec: number): Promise<string>;
}

class R2AdapterImpl implements R2Adapter {
  private readonly bucket: string;
  private _client: S3Client | null = null;

  constructor() {
    this.bucket = env.R2_BUCKET;
  }

  /** Lazily creates the S3Client so tests can swap the constructor mock. */
  private get client(): S3Client {
    if (!this._client) {
      const endpoint = env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      this._client = new S3Client({
        endpoint,
        region: env.R2_REGION || 'auto',
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });
    }
    return this._client;
  }

  async putObjectStream(key: string, stream: Readable, size: number): Promise<void> {
    assertKeyPrefix(key);
    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: stream,
          ContentLength: size,
        },
      });
      await upload.done();
    } catch (err: unknown) {
      throw new UpstreamError(
        `R2 upload failed for key "${key}": ${(err as Error).message}`,
        502,
        'r2',
      );
    }
  }

  async headObject(key: string): Promise<R2HeadResult | null> {
    assertKeyPrefix(key);
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        sizeBytes: res.ContentLength ?? 0,
        // R2 returns the MD5 in ETag (without quotes) when the object was
        // uploaded as a single part. For multipart uploads it is a composite
        // hash and we store null to signal "unknown".
        md5: res.ETag && !res.ETag.includes('-') ? res.ETag.replace(/"/g, '') : null,
      };
    } catch (err: unknown) {
      if (err instanceof NotFound || (err as { name?: string }).name === 'NotFound') {
        return null;
      }
      throw new UpstreamError(
        `R2 HeadObject failed for key "${key}": ${(err as Error).message}`,
        502,
        'r2',
      );
    }
  }

  async deleteObject(key: string): Promise<void> {
    assertKeyPrefix(key);
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err: unknown) {
      throw new UpstreamError(
        `R2 DeleteObject failed for key "${key}": ${(err as Error).message}`,
        502,
        'r2',
      );
    }
  }

  async listObjects(prefix: string): Promise<R2ListItem[]> {
    assertKeyPrefix(prefix);
    const items: R2ListItem[] = [];
    let continuationToken: string | undefined;

    try {
      do {
        const res = await this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        for (const obj of res.Contents ?? []) {
          if (obj.Key) {
            items.push({ key: obj.Key, sizeBytes: obj.Size ?? 0 });
          }
        }
        continuationToken = res.NextContinuationToken;
      } while (continuationToken);
    } catch (err: unknown) {
      throw new UpstreamError(
        `R2 ListObjects failed for prefix "${prefix}": ${(err as Error).message}`,
        502,
        'r2',
      );
    }

    return items;
  }

  async presignGet(key: string, ttlSec: number): Promise<string> {
    assertKeyPrefix(key);
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: ttlSec },
      );
    } catch (err: unknown) {
      throw new UpstreamError(
        `R2 presign failed for key "${key}": ${(err as Error).message}`,
        502,
        'r2',
      );
    }
  }
}

/**
 * Singleton R2 adapter.
 *
 * Throws a clear error when FEATURE_VIDEO_CACHE is false so callers never
 * reach the AWS SDK with an empty configuration.
 */
function createR2Adapter(): R2Adapter {
  if (!env.FEATURE_VIDEO_CACHE) {
    const msg = 'r2Adapter accessed but FEATURE_VIDEO_CACHE is disabled. Enable it and supply R2_* credentials.';
    return new Proxy({} as R2Adapter, {
      get(_target, prop) {
        if (prop === 'then') return undefined; // not a Promise
        throw new Error(msg);
      },
    });
  }
  return new R2AdapterImpl();
}

export const r2Adapter: R2Adapter = createR2Adapter();
