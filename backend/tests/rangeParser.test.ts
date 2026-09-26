import { describe, it, expect } from 'vitest';
import { parseRange } from '../src/utils/rangeParser';

describe('RFC 7233 parseRange utility', () => {
  const FILE_SIZE = 10000;

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
