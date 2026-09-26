/**
 * Normalisation and validation for the profile's professional link fields.
 *
 * Students paste these in every shape imaginable: a full URL, the same URL
 * without the protocol, a `www.`-prefixed host, an `@handle`, or just the bare
 * username. The inputs used to be `type="url"`, whose native constraint accepts
 * *only* the first shape and silently blocks form submission for the rest.
 *
 * Everything is funnelled through `normalizeSocialLink` so a value is stored as
 * one canonical `https://` URL no matter how it was typed, and anything that is
 * genuinely not a link is rejected with a message instead of being saved broken.
 */

export type SocialLinkKind = 'github' | 'linkedin' | 'portfolio';

const PLATFORM_HOST: Record<'github' | 'linkedin', string> = {
  github: 'github.com',
  linkedin: 'www.linkedin.com',
};

const PLATFORM_PATH_PREFIX: Record<'github' | 'linkedin', string> = {
  github: '',
  linkedin: '/in',
};

/** Hosts that identify a value as a link to the platform rather than a username. */
const PLATFORM_HOSTS: Record<'github' | 'linkedin', string[]> = {
  github: ['github.com'],
  linkedin: ['linkedin.com'],
};

/** A bare username: alphanumerics plus `.`, `_`, `-`, not starting/ending on a dot. */
const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

/** A dotted host name with an alphabetic TLD of at least two characters. */
const HOST_RE = /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

const SCHEME_RE = /^([A-Za-z][A-Za-z0-9+.-]*):(?:\/\/)?/;

export interface NormalizedSocialLink {
  /** False only when the input is present but cannot be read as a link. */
  ok: boolean;
  /** Canonical URL, or '' when the field was cleared. */
  value: string;
  /** Human-readable reason the input was rejected. */
  error?: string;
  /** The username/handle, when one could be extracted. */
  handle?: string;
}

const ok = (value: string, handle?: string): NormalizedSocialLink => ({ ok: true, value, handle });
const bad = (error: string): NormalizedSocialLink => ({ ok: false, value: '', error });

/**
 * Accepts any common paste format and returns a canonical https URL.
 *
 *   'https://github.com/jane'  -> 'https://github.com/jane'
 *   'github.com/jane'          -> 'https://github.com/jane'
 *   'www.github.com/jane/'     -> 'https://github.com/jane'
 *   '@jane'                    -> 'https://github.com/jane'
 *   'jane'                     -> 'https://github.com/jane'
 *   ''                         -> ''            (field cleared)
 */
export function normalizeSocialLink(kind: SocialLinkKind, input: string | null | undefined): NormalizedSocialLink {
  const raw = (input ?? '').trim();

  // An empty field means "no link" and is always allowed.
  if (!raw) return ok('');

  if (/\s/.test(raw)) {
    return bad('A link cannot contain spaces.');
  }

  // Reject non-web schemes outright (`ftp:`, `javascript:`, `mailto:`) rather
  // than letting them be pasted straight into an href.
  const scheme = raw.match(SCHEME_RE);
  if (scheme && !/^https?$/i.test(scheme[1])) {
    return bad('Only http:// and https:// links are supported.');
  }

  // Strip the scheme, a leading '@' and a leading 'www.' so the host is
  // canonical no matter which of the accepted shapes was used.
  let rest = raw.replace(SCHEME_RE, '').replace(/^@+/, '').replace(/^www\./i, '');
  rest = rest.replace(/^\/+/, '');

  if (!rest) return bad('Enter a link.');

  // A colon before the first slash can only be a scheme we do not support.
  const colon = rest.indexOf(':');
  const slash = rest.indexOf('/');
  if (colon !== -1 && (slash === -1 || colon < slash)) {
    return bad('Only http:// and https:// links are supported.');
  }

  const first = slash === -1 ? rest : rest.slice(0, slash);
  const host = first.toLowerCase();
  const rawPath = slash === -1 ? '' : rest.slice(slash + 1);
  const isPlatformField = kind !== 'portfolio';
  const platformLabel = kind === 'github' ? 'GitHub' : 'LinkedIn';

  // On the platform fields a value with no path separator is a username, even
  // when it contains dots or dashes — `jane.doe` is a far more likely GitHub
  // handle than a hostname. The one exception is a bare platform host such as
  // `github.com`, which is a link that is missing its username.
  if (isPlatformField && slash === -1) {
    if (PLATFORM_HOSTS[kind].includes(host)) {
      return bad(`Enter your ${platformLabel} profile address.`);
    }
    if (!HANDLE_RE.test(first)) {
      return bad('Enter a valid username.');
    }
    return ok(`https://${PLATFORM_HOST[kind]}${PLATFORM_PATH_PREFIX[kind]}/${first}`, first);
  }

  // The portfolio field has no platform to fall back on, so a value with no dot
  // in its first segment cannot be turned into a URL at all.
  if (!isPlatformField && !host.includes('.')) {
    return bad('Enter a portfolio address such as yourname.dev');
  }

  if (!HOST_RE.test(host)) {
    return bad('Enter a valid web address.');
  }

  // Collapse duplicate slashes and drop a trailing one.
  const path = rawPath.replace(/\/{2,}/g, '/').replace(/\/+$/, '');

  // On the platform's own domain the username is the meaningful part, so it is
  // validated as one. `linkedin.com/in/jane` and `github.com/jane` both reduce
  // to a bare handle and are rebuilt in canonical form.
  if (isPlatformField && PLATFORM_HOSTS[kind].includes(host)) {
    const segments = path.split('/').filter(Boolean);
    const prefix = PLATFORM_PATH_PREFIX[kind];
    const handle = prefix ? segments[1] : segments[0];
    // `linkedin.com/in/` with no username, or `github.com/` with no username.
    if (!handle) {
      return bad(`Enter your ${platformLabel} username.`);
    }
    if (!HANDLE_RE.test(handle)) {
      return bad('Enter a valid username.');
    }
    return ok(`https://${PLATFORM_HOST[kind]}${prefix}/${handle}`, handle);
  }

  return ok(`https://${host}${path ? `/${path}` : ''}`);
}

/** Convenience wrapper for callers that only need the stored value or `null`. */
export function normalizeSocialLinkOrNull(
  kind: SocialLinkKind,
  input: string | null | undefined,
): string | null {
  const result = normalizeSocialLink(kind, input);
  return result.ok ? result.value || null : null;
}
