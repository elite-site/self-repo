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

export interface ContentRange {
  start: number;
  end: number;
  total: number;
}

/**
 * Decide which byte range a media response should answer with.
 *
 * Prefers the range the storage layer already resolved, which also covers the
 * pass-through case where the total size was not known up front. Falls back to
 * parsing the request header against the known file size.
 *
 * Returns `null` when no range applies, or when the client asked for a range
 * that cannot be satisfied. Callers must then reply `416` rather than a full
 * `200` body, because a `<video>` element would try to seek inside it.
 */
export function resolveContentRange(
  resolved: ContentRange | undefined,
  rangeHeader: string | undefined,
  size: number | undefined,
): ContentRange | null {
  if (resolved) return resolved;
  if (!rangeHeader || size === undefined) return null;

  const parsed = parseRange(rangeHeader, size);
  return parsed ? { start: parsed.start, end: parsed.end, total: size } : null;
}
