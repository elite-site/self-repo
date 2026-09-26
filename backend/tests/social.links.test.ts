import { describe, it, expect } from 'vitest';
import { normalizeSocialLink } from '../../web/src/utils/socialLinks';

/**
 * The professional link fields used to be `type="url"`, which rejects every
 * paste format except a full URL — including plain usernames. These tests pin
 * the accepted formats and the rejections so the form can never regress back to
 * accepting only one shape.
 */
describe('professional link normalisation', () => {
  describe('accepted input formats (GitHub)', () => {
    const cases: Array<[string, string, string]> = [
      ['full URL', 'https://github.com/jane', 'https://github.com/jane'],
      ['URL without protocol', 'github.com/jane', 'https://github.com/jane'],
      ['www. prefixed', 'www.github.com/jane', 'https://github.com/jane'],
      ['www. prefixed, no protocol, trailing slash', 'www.github.com/jane/', 'https://github.com/jane'],
      ['http (not https)', 'http://github.com/jane', 'https://github.com/jane'],
      ['@username', '@jane', 'https://github.com/jane'],
      ['plain username', 'jane', 'https://github.com/jane'],
      ['username with dots, dashes and underscores', 'jane.doe-99_x', 'https://github.com/jane.doe-99_x'],
      ['surrounding whitespace', '   jane   ', 'https://github.com/jane'],
      ['mixed-case host', 'GitHub.com/Jane', 'https://github.com/Jane'],
    ];

    for (const [label, input, expected] of cases) {
      it(`accepts ${label}`, () => {
        const result = normalizeSocialLink('github', input);
        expect(result.error).toBeUndefined();
        expect(result.ok).toBe(true);
        expect(result.value).toBe(expected);
      });
    }
  });

  describe('accepted input formats (LinkedIn)', () => {
    it('places a bare username under /in/', () => {
      expect(normalizeSocialLink('linkedin', 'jane').value).toBe('https://www.linkedin.com/in/jane');
    });

    it('keeps an explicit /in/ path', () => {
      expect(normalizeSocialLink('linkedin', 'linkedin.com/in/jane').value).toBe(
        'https://www.linkedin.com/in/jane',
      );
    });

    it('accepts www. prefixed profile URLs', () => {
      expect(normalizeSocialLink('linkedin', 'https://www.linkedin.com/in/jane/').value).toBe(
        'https://www.linkedin.com/in/jane',
      );
    });
  });

  describe('portfolio field', () => {
    it('keeps a full URL host and path', () => {
      expect(normalizeSocialLink('portfolio', 'https://jane.dev/projects').value).toBe(
        'https://jane.dev/projects',
      );
    });

    it('upgrades a bare host to https', () => {
      expect(normalizeSocialLink('portfolio', 'jane.dev').value).toBe('https://jane.dev');
    });

    it('strips a www. prefix and trailing slash', () => {
      expect(normalizeSocialLink('portfolio', 'www.jane.dev/').value).toBe('https://jane.dev');
    });

    it('rejects a bare username because there is no host to attach it to', () => {
      const result = normalizeSocialLink('portfolio', 'jane');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/portfolio address/i);
    });
  });

  describe('clearing a field', () => {
    it('treats an empty value as no link rather than an error', () => {
      expect(normalizeSocialLink('github', '')).toEqual({ ok: true, value: '', handle: undefined });
    });

    it('treats whitespace as no link', () => {
      expect(normalizeSocialLink('linkedin', '   ').ok).toBe(true);
    });
  });

  describe('rejected input', () => {
    it('rejects a link containing spaces', () => {
      const result = normalizeSocialLink('github', 'github.com/jane doe');
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/spaces/i);
    });

    it('rejects a non-http scheme', () => {
      expect(normalizeSocialLink('portfolio', 'ftp://jane.dev').ok).toBe(false);
    });

    it('rejects a javascript: URL so it can never land in an href', () => {
      const result = normalizeSocialLink('portfolio', 'javascript:alert(1)');
      expect(result.ok).toBe(false);
      expect(result.value).toBe('');
    });

    it('rejects a host with no TLD', () => {
      expect(normalizeSocialLink('portfolio', 'jane').ok).toBe(false);
    });

    it('rejects a malformed host', () => {
      expect(normalizeSocialLink('portfolio', 'jane..dev').ok).toBe(false);
    });

    it('rejects a numeric-only TLD', () => {
      expect(normalizeSocialLink('portfolio', 'jane.123').ok).toBe(false);
    });

    it('rejects a platform host with no username', () => {
      expect(normalizeSocialLink('github', 'github.com').ok).toBe(false);
      expect(normalizeSocialLink('linkedin', 'linkedin.com/in/').ok).toBe(false);
    });

    it('rejects a username with characters handles cannot contain', () => {
      expect(normalizeSocialLink('github', '@jane$doe').ok).toBe(false);
    });

    it('never returns a non-https value for an accepted input', () => {
      for (const input of ['http://github.com/jane', 'github.com/jane', '@jane', 'jane']) {
        expect(normalizeSocialLink('github', input).value.startsWith('https://')).toBe(true);
      }
    });
  });
});
