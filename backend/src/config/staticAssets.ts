import path from 'path';
import express from 'express';

/**
 * Cache policy for the two built frontends this server also hosts.
 *
 * Vite content-hashes everything it emits into `assets/` — the JS chunks, the
 * stylesheet, and the self-hosted woff2 files — so a new build always produces
 * new filenames. A browser holding a year-old cached copy therefore cannot be
 * served anything wrong: if the hash is still being requested, that exact file
 * is still the current one. Serving `assets/` with `max-age=1y, immutable` means
 * repeat visits skip the revalidation round trip entirely, which is where most
 * of the "the site feels slow to load again" cost was coming from.
 *
 * Everything outside `assets/` keeps an unhashed filename (`index.html`,
 * `index.html`'s favicons, anything copied verbatim from `public/`), so it is
 * served with a zero max-age and revalidated. That is what allows a redeploy to
 * take effect at all.
 *
 * ## Why these are `maxAge`/`immutable` options and not a `setHeaders` hook
 *
 * The obvious implementation is a `setHeaders` callback that sets
 * `Cache-Control` by hand. It silently does nothing. The `send` module (which
 * backs `express.static`) emits its own `headers` event *first* and then
 * overwrites `Cache-Control` with a value derived from its own `maxAge` option.
 * Whatever the hook set is discarded. The options are the only thing that
 * survives, which is why the policy below is expressed as two mount points
 * rather than one mount with a path-sniffing hook.
 */
export const hashedAssetOptions = { maxAge: '1y', immutable: true } as const;

/**
 * `index: false` is deliberate: it stops `express.static` from serving
 * `index.html` for `/` so the shell is only ever emitted by the explicit route
 * that sets `no-cache` on it. That keeps the policy in one readable place
 * instead of depending on which of the two handlers happens to win for `/`.
 */
export const revalidateOptions = { maxAge: 0, index: false } as const;

/** Mounts a built frontend on `mountPath` with the cache policy above. */
export function mountFrontend(app: express.Express, mountPath: string, buildDir: string): void {
  const assetsDir = path.join(buildDir, 'assets');

  // Hashed, immutable. Registered first so it wins for /assets/*.
  app.use(
    mountPath === '/' ? '/assets' : `${mountPath === '/' ? '' : mountPath}/assets`,
    express.static(assetsDir, hashedAssetOptions),
  );
  // Unhashed, revalidated.
  app.use(mountPath, express.static(buildDir, revalidateOptions));
}
