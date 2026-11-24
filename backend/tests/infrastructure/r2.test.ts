/**
 * Unit tests for the R2 adapter (backend/src/infrastructure/r2.ts).
 *
 * All AWS SDK modules are mocked so no real network calls are made.
 * Tests verify:
 *  1. putObjectStream calls Upload with correct params and key prefix enforcement
 *  2. headObject returns correct shape on success, null on NotFound
 *  3. deleteObject succeeds for a valid lesson-cache/ key
 *  4. deleteObject throws ForbiddenError for a bad key
 *  5. listObjects throws ForbiddenError for a bad prefix
 *  6. presignGet returns a string URL
 *  7. SDK errors are wrapped in UpstreamError
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';

// ── Hoisted mock state (available before vi.mock factories execute) ────────────

const { mockSend, mockUploadDone, mockGetSignedUrl, MockUpload } = vi.hoisted(() => {
  const mockSend = vi.fn();
  const mockUploadDone = vi.fn();
  const mockGetSignedUrl = vi.fn();

  // Must use `function` keyword so `new MockUpload(...)` works
  function MockUpload(this: { params: unknown; done: typeof mockUploadDone }, opts: { params: unknown }) {
    this.params = opts.params;
    this.done = mockUploadDone;
  }
  const spyUpload = vi.fn().mockImplementation(function (this: { params: unknown; done: typeof mockUploadDone }, opts: { params: unknown }) {
    MockUpload.call(this, opts);
  });

  return { mockSend, mockUploadDone, mockGetSignedUrl, MockUpload: spyUpload };
});

// ── SDK mocks ─────────────────────────────────────────────────────────────────

vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();

  // S3Client must be a real constructor
  function MockS3Client(this: { send: typeof mockSend }) {
    this.send = mockSend;
  }

  // Command constructors — must be real functions (not arrows) to support `new`
  function HeadObjectCommand(this: object, p: object) { Object.assign(this, { _type: 'HeadObject', ...p }); }
  function DeleteObjectCommand(this: object, p: object) { Object.assign(this, { _type: 'DeleteObject', ...p }); }
  function ListObjectsV2Command(this: object, p: object) { Object.assign(this, { _type: 'ListObjectsV2', ...p }); }
  function GetObjectCommand(this: object, p: object) { Object.assign(this, { _type: 'GetObject', ...p }); }

  return {
    ...actual,
    S3Client: MockS3Client,
    HeadObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    GetObjectCommand,
    // Keep real NotFound for instanceof checks
    NotFound: actual.NotFound,
  };
});

vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: MockUpload,
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// ── env mock — feature enabled, all R2 vars present ──────────────────────────

vi.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    FEATURE_VIDEO_CACHE: true,
    R2_ACCOUNT_ID: 'test-account-id',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET: 'test-bucket',
  },
  getNodeEnv: () => 'test',
  isProductionEnv: () => false,
  isDevelopmentEnv: () => false,
  isTestEnv: () => true,
  isVitestEnv: () => true,
  getDbConnectionLimit: () => '5',
  getMaxVideoSizeHardCapMb: () => 100,
  isAutoMigratePending: () => false,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Import under-test and error types after mocks are declared
// ─────────────────────────────────────────────────────────────────────────────

import { r2Adapter } from '../../src/infrastructure/r2';
import { NotFound } from '@aws-sdk/client-s3';
import { ForbiddenError, UpstreamError } from '../../src/utils/appError';

// ─────────────────────────────────────────────────────────────────────────────

describe('R2 adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadDone.mockResolvedValue({});
    mockSend.mockResolvedValue({});
    mockGetSignedUrl.mockResolvedValue('https://r2.example.com/lesson-cache/test.mp4?sig=abc');
    // Restore MockUpload implementation after clearAllMocks
    MockUpload.mockImplementation(function (this: { params: unknown; done: typeof mockUploadDone }, opts: { params: unknown }) {
      this.params = opts.params;
      this.done = mockUploadDone;
    });
  });

  // ── 1. putObjectStream ────────────────────────────────────────────────────

  it('putObjectStream calls Upload with correct Bucket, Key, Body, and ContentLength', async () => {
    const stream = Readable.from(['hello']);

    await r2Adapter.putObjectStream('lesson-cache/test.mp4', stream, 5);

    expect(MockUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'lesson-cache/test.mp4',
          Body: stream,
          ContentLength: 5,
        }),
      }),
    );
    expect(mockUploadDone).toHaveBeenCalledOnce();
  });

  it('putObjectStream throws ForbiddenError when key does not start with lesson-cache/', async () => {
    const stream = Readable.from(['x']);

    await expect(r2Adapter.putObjectStream('private/secret.mp4', stream, 1)).rejects.toThrow(ForbiddenError);
    expect(MockUpload).not.toHaveBeenCalled();
  });

  // ── 2. headObject ─────────────────────────────────────────────────────────

  it('headObject returns sizeBytes and md5 on success (single-part ETag)', async () => {
    mockSend.mockResolvedValueOnce({ ContentLength: 1024, ETag: '"abc123"' });

    const result = await r2Adapter.headObject('lesson-cache/test.mp4');

    expect(result).toEqual({ sizeBytes: 1024, md5: 'abc123' });
  });

  it('headObject returns null when the object does not exist (NotFound)', async () => {
    const notFound = new NotFound({ message: 'Not Found', $metadata: {} });
    mockSend.mockRejectedValueOnce(notFound);

    const result = await r2Adapter.headObject('lesson-cache/missing.mp4');

    expect(result).toBeNull();
  });

  it('headObject wraps unexpected SDK errors in UpstreamError', async () => {
    mockSend.mockRejectedValueOnce(new Error('network timeout'));

    await expect(r2Adapter.headObject('lesson-cache/test.mp4')).rejects.toThrow(UpstreamError);
  });

  // ── 3. deleteObject ───────────────────────────────────────────────────────

  it('deleteObject resolves for a valid lesson-cache/ key', async () => {
    mockSend.mockResolvedValueOnce({});

    await expect(r2Adapter.deleteObject('lesson-cache/test.mp4')).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledOnce();
  });

  // ── 4. deleteObject key prefix enforcement ────────────────────────────────

  it('deleteObject throws ForbiddenError with code R2_KEY_PREFIX_VIOLATION for a bad key', async () => {
    let thrown: unknown;
    try {
      await r2Adapter.deleteObject('uploads/malicious.mp4');
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(ForbiddenError);
    expect((thrown as ForbiddenError).code).toBe('R2_KEY_PREFIX_VIOLATION');
    expect(mockSend).not.toHaveBeenCalled();
  });

  // ── 5. listObjects prefix enforcement ────────────────────────────────────

  it('listObjects throws ForbiddenError with code R2_KEY_PREFIX_VIOLATION for a bad prefix', async () => {
    let thrown: unknown;
    try {
      await r2Adapter.listObjects('other-namespace/');
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(ForbiddenError);
    expect((thrown as ForbiddenError).code).toBe('R2_KEY_PREFIX_VIOLATION');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('listObjects returns items with the correct shape', async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [
        { Key: 'lesson-cache/a.mp4', Size: 100 },
        { Key: 'lesson-cache/b.mp4', Size: 200 },
      ],
      NextContinuationToken: undefined,
    });

    const result = await r2Adapter.listObjects('lesson-cache/');

    expect(result).toEqual([
      { key: 'lesson-cache/a.mp4', sizeBytes: 100 },
      { key: 'lesson-cache/b.mp4', sizeBytes: 200 },
    ]);
  });

  // ── 6. presignGet ─────────────────────────────────────────────────────────

  it('presignGet returns a string URL', async () => {
    const url = await r2Adapter.presignGet('lesson-cache/test.mp4', 600);

    expect(typeof url).toBe('string');
    expect(url).toMatch(/^https?:\/\//);
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
  });

  it('presignGet throws ForbiddenError for an invalid key prefix', async () => {
    await expect(r2Adapter.presignGet('raw/test.mp4', 600)).rejects.toThrow(ForbiddenError);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  // ── 7. SDK errors wrapped in UpstreamError ────────────────────────────────

  it('deleteObject wraps SDK errors in UpstreamError with source "r2"', async () => {
    mockSend.mockRejectedValueOnce(new Error('S3 service unavailable'));

    const err = await r2Adapter.deleteObject('lesson-cache/test.mp4').catch((e) => e);

    expect(err).toBeInstanceOf(UpstreamError);
    expect((err as UpstreamError).source).toBe('r2');
  });

  it('listObjects wraps SDK errors in UpstreamError', async () => {
    mockSend.mockRejectedValueOnce(new Error('connection refused'));

    await expect(r2Adapter.listObjects('lesson-cache/')).rejects.toThrow(UpstreamError);
  });
});
