/**
 * Route preloading registry. The route map is owned by the router, so shared
 * layout components can trigger a prefetch without importing any page.
 */
type RoutePrefetchLoader = () => Promise<unknown>;

const loaders = new Map<string, RoutePrefetchLoader>();
const prefetchedRoutes = new Set<string>();

export function registerRoutePrefetchLoaders(routes: Record<string, RoutePrefetchLoader>): void {
  for (const [path, load] of Object.entries(routes)) {
    loaders.set(path.split('?')[0].split('#')[0], load);
  }
}

export function prefetchRoute(path: string): void {
  const cleanPath = path.split('?')[0].split('#')[0];
  if (!cleanPath || prefetchedRoutes.has(cleanPath)) return;
  prefetchedRoutes.add(cleanPath);

  loaders.get(cleanPath)?.();
}
