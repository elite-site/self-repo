/**
 * Sanitizes URLs to prevent XSS (e.g. javascript:, data:, vbscript: links).
 * Only allows http:, https:, and mailto: protocols, or safe relative paths.
 * Returns undefined for untrusted or invalid URLs so that anchor tags
 * do not execute script or navigate to malicious targets.
 */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Disallow control characters
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return undefined;

  // Disallow protocol-relative URLs (e.g. //attacker.com)
  if (trimmed.startsWith('//')) return undefined;

  // Allow safe root-relative URLs (e.g. /students, /api/public/...)
  if (trimmed.startsWith('/') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:') {
      return trimmed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
