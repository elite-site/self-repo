export interface ParsedRange {
  start: number;
  end: number;
}

/**
 * Parses standard HTTP Range headers conforming to RFC 7233:
 * - bytes=100-200 (standard range)
 * - bytes=100-    (from byte 100 to EOF)
 * - bytes=-500    (suffix range: last 500 bytes of the file, critical for MP4 moov atoms)
 *
 * Returns null if the range is malformed or unsatisfiable (outside [0, size - 1]).
 */
export function parseRange(rangeHeader: string, size: number): ParsedRange | null {
  if (!rangeHeader || typeof rangeHeader !== 'string' || size <= 0) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  let start: number;
  let end: number;

  if (match[1] === '' && match[2] !== '') {
    // Suffix range: bytes=-500 (last 500 bytes)
    const suffix = parseInt(match[2], 10);
    if (isNaN(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else if (match[1] !== '' && match[2] === '') {
    // Prefix range: bytes=500- (from byte 500 to end of file)
    start = parseInt(match[1], 10);
    end = size - 1;
  } else if (match[1] !== '' && match[2] !== '') {
    // Sliced range: bytes=500-1000
    start = parseInt(match[1], 10);
    end = parseInt(match[2], 10);
  } else {
    return null;
  }

  if (isNaN(start) || isNaN(end) || start > end || start >= size) {
    return null;
  }

  end = Math.min(end, size - 1);
  return { start, end };
}
