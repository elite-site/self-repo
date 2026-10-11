import { describe, expect, it } from 'vitest';
import { safeUrl } from '../safeUrl';

describe('safeUrl', () => {
  it('allows valid https URLs', () => {
    expect(safeUrl('https://github.com/my-profile')).toBe('https://github.com/my-profile');
    expect(safeUrl('https://linkedin.com/in/user')).toBe('https://linkedin.com/in/user');
    expect(safeUrl('https://leetcode.com/user/')).toBe('https://leetcode.com/user/');
  });

  it('allows valid http URLs', () => {
    expect(safeUrl('http://example.com/demo')).toBe('http://example.com/demo');
  });

  it('allows mailto links', () => {
    expect(safeUrl('mailto:student@sasi.ac.in')).toBe('mailto:student@sasi.ac.in');
    expect(safeUrl('mailto:user@domain.com?subject=Hello')).toBe('mailto:user@domain.com?subject=Hello');
  });

  it('allows root-relative internal paths', () => {
    expect(safeUrl('/students/21k61a0501')).toBe('/students/21k61a0501');
    expect(safeUrl('/api/public/media/photo/123')).toBe('/api/public/media/photo/123');
  });

  it('blocks javascript: URLs including javascript:alert(1)', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('javascript:alert(document.domain)')).toBeUndefined();
    expect(safeUrl('JAVASCRIPT:alert(1)')).toBeUndefined();
    expect(safeUrl('javascript:/*--></title></style></textarea>*/<script>alert(1)</script>')).toBeUndefined();
  });

  it('blocks data: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeUrl('DATA:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBeUndefined();
  });

  it('blocks vbscript: URLs', () => {
    expect(safeUrl('vbscript:msgbox(1)')).toBeUndefined();
  });

  it('blocks protocol-relative URLs', () => {
    expect(safeUrl('//evil.example.com')).toBeUndefined();
    expect(safeUrl('//evil.example.com/login')).toBeUndefined();
  });

  it('blocks control characters and invalid inputs', () => {
    expect(safeUrl('javascript\u0000:alert(1)')).toBeUndefined();
    expect(safeUrl('https://example.com/\u0000bad')).toBeUndefined();
    expect(safeUrl('')).toBeUndefined();
    expect(safeUrl('   ')).toBeUndefined();
    expect(safeUrl(null)).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
  });
});
