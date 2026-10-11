export interface UploadProgressInfo {
  loaded: number;
  total: number;
  pct: number;
  speedBytesPerSec: number;
  estimatedRemainingSec: number | null;
}

export interface DirectUploadParams {
  sessionUrl: string;
  file: File;
  chunkSize?: number; // 8 MB default (multiple of 256 KB)
  onProgress?: (progress: UploadProgressInfo) => void;
  signal?: AbortSignal;
}

/**
 * Queries Google Drive for the current state of a resumable upload session.
 * Used when a chunk fails, to find the exact byte offset Google has received so far.
 */
export async function queryResumableSessionStatus(
  sessionUrl: string,
  totalSize: number,
  signal?: AbortSignal,
): Promise<{ completed: boolean; driveFileId?: string; nextByte?: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionUrl);
    xhr.setRequestHeader('Content-Range', `bytes */${totalSize}`);

    if (signal) {
      const onAbort = () => {
        xhr.abort();
        void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
        reject(new Error('Upload was cancelled.'));
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ completed: true, driveFileId: data.id });
        } catch {
          resolve({ completed: false });
        }
      } else if (xhr.status === 308) {
        const range = xhr.getResponseHeader('Range');
        if (range) {
          const match = range.match(/bytes=0-(\d+)/);
          if (match) {
            resolve({ completed: false, nextByte: parseInt(match[1], 10) + 1 });
            return;
          }
        }
        resolve({ completed: false, nextByte: 0 });
      } else {
        resolve({ completed: false });
      }
    };

    xhr.onerror = () => resolve({ completed: false });
    xhr.ontimeout = () => resolve({ completed: false });
    xhr.timeout = 30_000;

    xhr.send();
  });
}

/**
 * Uploads a video file directly to Google Drive via its resumable upload session
 * in 8 MB chunks (multiple of 256 KB). Retries failed chunks up to 3 times with
 * exponential backoff and session status querying.
 *
 * Cancellation aborts the active XHR and sends a DELETE to the Google session URL.
 */
export async function uploadDirectToDrive(
  params: DirectUploadParams,
): Promise<{ driveFileId: string }> {
  const { sessionUrl, file, onProgress, signal } = params;
  const chunkSize =
    params.chunkSize && params.chunkSize % 262144 === 0
      ? params.chunkSize
      : 8 * 1024 * 1024;
  const total = file.size;

  let lastTime = Date.now();
  let lastLoaded = 0;
  let currentSpeed = 0;

  const emitProgress = (loaded: number) => {
    if (!onProgress) return;
    const now = Date.now();
    const timeDiff = (now - lastTime) / 1000;
    if (timeDiff >= 0.25 || loaded === total) {
      const bytesDiff = loaded - lastLoaded;
      if (timeDiff > 0) {
        currentSpeed = bytesDiff / timeDiff;
      }
      lastTime = now;
      lastLoaded = loaded;
    }

    const remainingBytes = Math.max(0, total - loaded);
    const estimatedRemainingSec =
      currentSpeed > 50000 ? Math.ceil(remainingBytes / currentSpeed) : null;

    onProgress({
      loaded,
      total,
      pct: Math.min(100, Math.round((loaded * 100) / total)),
      speedBytesPerSec: currentSpeed,
      estimatedRemainingSec,
    });
  };

  if (signal?.aborted) {
    void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
    throw new Error('Upload was cancelled.');
  }

  let currentByte = 0;

  while (currentByte < total) {
    if (signal?.aborted) {
      void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
      throw new Error('Upload was cancelled.');
    }

    const chunkEnd = Math.min(currentByte + chunkSize, total);
    const chunk = file.slice(currentByte, chunkEnd);
    let chunkUploaded = false;
    let driveFileId: string | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (signal?.aborted) {
        void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
        throw new Error('Upload was cancelled.');
      }

      try {
        const result = await new Promise<{
          status: number;
          driveFileId?: string;
          rangeHeader?: string | null;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', sessionUrl);
          xhr.setRequestHeader('Content-Range', `bytes ${currentByte}-${chunkEnd - 1}/${total}`);
          xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

          if (signal) {
            const onAbort = () => {
              xhr.abort();
              void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
              reject(new Error('Upload was cancelled.'));
            };
            if (signal.aborted) {
              onAbort();
              return;
            }
            signal.addEventListener('abort', onAbort, { once: true });
          }

          if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                emitProgress(currentByte + e.loaded);
              }
            });
          }

          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 201) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve({ status: xhr.status, driveFileId: data.id });
              } catch {
                resolve({ status: xhr.status });
              }
            } else if (xhr.status === 308) {
              const rangeHeader = xhr.getResponseHeader('Range');
              resolve({ status: 308, rangeHeader });
            } else {
              reject(new Error(`Chunk upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error uploading video chunk'));
          xhr.ontimeout = () => reject(new Error('Upload chunk timed out'));
          xhr.timeout = 120_000;

          xhr.send(chunk);
        });

        if (result.status === 200 || result.status === 201) {
          if (result.driveFileId) {
            driveFileId = result.driveFileId;
          }
          chunkUploaded = true;
          currentByte = total;
          emitProgress(total);
          break;
        }

        if (result.status === 308) {
          chunkUploaded = true;
          if (result.rangeHeader) {
            const match = result.rangeHeader.match(/bytes=0-(\d+)/);
            if (match) {
              currentByte = parseInt(match[1], 10) + 1;
            } else {
              currentByte = chunkEnd;
            }
          } else {
            currentByte = chunkEnd;
          }
          emitProgress(currentByte);
          break;
        }
      } catch (err: any) {
        if (signal?.aborted || err.message?.includes('cancelled')) {
          void fetch(sessionUrl, { method: 'DELETE' }).catch(() => {});
          throw new Error('Upload was cancelled.', { cause: err });
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          try {
            const status = await queryResumableSessionStatus(sessionUrl, total, signal);
            if (status.completed && status.driveFileId) {
              driveFileId = status.driveFileId;
              chunkUploaded = true;
              currentByte = total;
              emitProgress(total);
              break;
            }
            if (status.nextByte !== undefined) {
              currentByte = status.nextByte;
              emitProgress(currentByte);
            }
          } catch (retryErr) {
            // Non-fatal: retry next attempt
            console.warn('Resumable session status query failed non-fatally:', retryErr);
          }
        } else {
          throw new Error(`Failed to upload video chunk after 3 attempts: ${err?.message || err}`, { cause: err });
        }
      }
    }

    if (!chunkUploaded) {
      throw new Error(`Upload failed at byte ${currentByte}`);
    }

    if (driveFileId) {
      return { driveFileId };
    }
  }

  const finalStatus = await queryResumableSessionStatus(sessionUrl, total, signal);
  if (finalStatus.driveFileId) {
    return { driveFileId: finalStatus.driveFileId };
  }

  throw new Error('Google Drive upload did not return a valid file ID.');
}
