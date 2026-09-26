import { describe, it, expect } from 'vitest';
import { parseRange, resolveContentRange } from '../src/utils/rangeParser';

const FILE_SIZE = 10000;

describe('RFC 7233 parseRange utility', () => {
  it('parses standard range (start-end)', () => {
    const res = parseRange('bytes=100-200', FILE_SIZE);
    expect(res).toEqual({ start: 100, end: 200 });
  });

  it('parses prefix range (start- to EOF)', () => {
    const res = parseRange('bytes=500-', FILE_SIZE);
    expect(res).toEqual({ start: 500, end: 9999 });
  });

  it('parses suffix range (-suffix for last N bytes)', () => {
    const res = parseRange('bytes=-500', FILE_SIZE);
    expect(res).toEqual({ start: 9500, end: 9999 });
  });

  it('clamps suffix range when suffix exceeds file size', () => {
    const res = parseRange('bytes=-20000', FILE_SIZE);
    expect(res).toEqual({ start: 0, end: 9999 });
  });

  it('clamps end to file size - 1', () => {
    const res = parseRange('bytes=5000-25000', FILE_SIZE);
    expect(res).toEqual({ start: 5000, end: 9999 });
  });

  it('returns null for unsatisfiable range (start >= size)', () => {
    const res = parseRange('bytes=15000-', FILE_SIZE);
    expect(res).toBeNull();
  });

  it('returns null for inverted range (start > end)', () => {
    const res = parseRange('bytes=500-200', FILE_SIZE);
    expect(res).toBeNull();
  });

  it('returns null for invalid / malformed range strings', () => {
    expect(parseRange('invalid', FILE_SIZE)).toBeNull();
    expect(parseRange('bytes=', FILE_SIZE)).toBeNull();
    expect(parseRange('bytes=-', FILE_SIZE)).toBeNull();
    expect(parseRange('', FILE_SIZE)).toBeNull();
    expect(parseRange('bytes=abc-def', FILE_SIZE)).toBeNull();
  });

  it('returns null for non-positive file size', () => {
    expect(parseRange('bytes=0-100', 0)).toBeNull();
    expect(parseRange('bytes=0-100', -1)).toBeNull();
  });
});

describe('resolveContentRange', () => {
  it('prefers the range the storage layer already resolved', () => {
    const resolved = { start: 10, end: 20, total: 999 };
    expect(resolveContentRange(resolved, 'bytes=0-5', FILE_SIZE)).toBe(resolved);
  });

  it('falls back to parsing the header when nothing was resolved', () => {
    expect(resolveContentRange(undefined, 'bytes=100-200', FILE_SIZE)).toEqual({
      start: 100,
      end: 200,
      total: FILE_SIZE,
    });
  });

  it('resolves a suffix range, the case MP4 players use for the moov atom', () => {
    expect(resolveContentRange(undefined, 'bytes=-500', FILE_SIZE)).toEqual({
      start: 9500,
      end: 9999,
      total: FILE_SIZE,
    });
  });

  it('returns null when no range was requested', () => {
    expect(resolveContentRange(undefined, undefined, FILE_SIZE)).toBeNull();
  });

  it('returns null when the size is unknown and no range was resolved', () => {
    expect(resolveContentRange(undefined, 'bytes=0-100', undefined)).toBeNull();
  });

  it('returns null for an unsatisfiable range so callers can answer 416', () => {
    expect(resolveContentRange(undefined, 'bytes=99999-', FILE_SIZE)).toBeNull();
    expect(resolveContentRange(undefined, 'nonsense', FILE_SIZE)).toBeNull();
  });
});
