# Frontend architecture

Two React clients share a token system and folder conventions but ship as separate builds.

| | `web/` | `admin-client/` |
|---|---|---|
| Purpose | student portal + public pages | organizer/admin portal |
| Stack | React 18, Vite 6, React Router 7, TanStack Query 5, strict TypeScript, Tailwind 3 | same |
| Entry | `src/main.tsx` → `src/App.tsx` | `src/main.tsx` → `src/App.tsx` |
| Alias | `@/*` → `src/*` | `@/*` → `src/*` |
| Session | student token (Bearer) | httpOnly cookie (`withCredentials`) |
| Base URL | `VITE_API_BASE_URL`, normalized to end in `/api` in `shared/api/client.ts` | relative `/admin/api/...` paths via `shared/api/client.ts` |
| Tests | Vitest + jsdom, plus one local Playwright smoke | Vitest + jsdom |

## Folder conventions

```
web/src/
  features/<name>/    pages, components, hooks, api/, utils/, tests/ for one domain
  shared/             api client, ui primitives, layout, hooks, lib, utils, types
  context/            ThemeContext, SessionContext (web only)
  pages/public/       public home page (outside features)
  router/             routePrefetch.ts
  test/setup.ts
admin-client/src/
  features/<name>/    pages, components, hooks, api/ for one domain
  shared/             api client, ui, layout, lib, types, test/setup.ts
  context/            ThemeContext; AuthProvider lives in App.tsx
```

Pages compose feature components and hooks; hooks own server state and logic; components render markup. A component does not call the HTTP client or fetch in `useEffect`. Anything used by two features belongs in `shared/`; `shared/` never imports from a feature. Feature APIs import the shared client. The Phase 2 cleanup inverted six `shared/`→feature imports and broke a web import cycle; the Phase 4 cleanup removed one-line `api.ts` barrels that only re-exported `api/index`, so import the concrete `api/index` path.

## Routing and guards

### `web/src/App.tsx`

All pages are `React.lazy` with a `SkeletonPage` fallback inside one `ErrorBoundary`. BrowserRouter wraps `ToastProvider` → `ConfirmProvider` → `SessionProvider` → `AuthWrapper`.

- Public, `PublicThemeProvider`: `/`, `/login`, `/students`, `/students/:rollNo`, `/students/:rollNo/resume`.
- Hybrid (public when signed out, student app when signed in): `/events`, `/events/:id`. The enclosing route picks `StudentThemeProvider` + `AppLayout` for a session and `PublicThemeProvider` + `<Outlet />` otherwise. Public pages render immediately when no token exists.
- Protected (`protectedShell()` → `StudentThemeProvider` + `AppLayout`): `/dashboard`, `/resources`, `/profile`, `/profile/edit`, `/portfolio/*`, `/github`, `/intro-video` (with `/video` redirect), `/resume`, `/registrations`, `/teams`, `/voting`, `/voting/:campaignId`, `/notifications`, `/announcements/:id`, `/settings`, and `/learning`, `/learning/courses`, `/learning/courses/:slugOrId`, `/learning/lessons/:id`, `/learning/my-learning`.
- Gate behavior: while `authChecking`, protected routes show the loading fallback; a session error without a session shows a retry screen; no session redirects to `/`. Unknown paths inside the protected group redirect to `/dashboard`.
- Feature gates (default on): `VITE_FEATURE_CODECHEF !== 'false'` registers `/codechef`; `VITE_FEATURE_LEARNINGHUB !== 'false'` registers the `/learning/*` routes. The nav items apply the same flags (`shared/layout/NavItem.tsx`).
- `shared/utils/prefetch.ts` registers hover/intent prefetch loaders for common routes via `router/routePrefetch.ts`.

### `admin-client/src/App.tsx`

`createBrowserRouter` with all pages `React.lazy`, a `RootRouterError` `errorElement`, and a top-level `ErrorBoundary`.

- `/` and any unknown path redirect to `/admin`; `/submissions` and `/moderation` redirect to `/admin/moderation`.
- `/admin` is the single guarded shell: `AuthProvider` + `ProtectedLayout`, with a nested `ErrorBoundary` around `<Outlet />`.
- `AuthProvider` calls `authApi.getMe()` (`/admin/me`) on mount. `authChecking` shows `BrandedLoading`; 401/403 means signed out (login page), other failures show a retry screen; `retryAuthCheck` re-runs the check.
- Routes inside the shell: `dashboard`, `submissions` (redirect), `students`, `students/:studentId`, `github`, `codechef`, `activity` (legacy redirect to `audit-logs`), `moderation`, `learning`, `learning/courses/:id`, `learning/courses/:id/edit`, `learning/courses/:id/enrollments`, `learning/courses/:id/reports`, `learning/reports/:id`, `events`, `event-registrations`, `voting`, `voting-results`, `communications`, `email-automation`, `email-history`, `analytics`, `exports`, `storage`, `resources`, `roles`, `audit-logs`, `settings`, and a catch-all redirect to `/admin/dashboard`. `adminRoutes` is exported so the navigation contract can be tested without mounting the app.
- `VITE_FEATURE_CODECHEF !== 'false'` hides the CodeChef sidebar item; the route itself is registered unconditionally.
- `Sidebar`/`AdminHeader` are in `shared/layout`; the mobile sidebar is an overlay with a scrim.

## Data flow

`page → feature hook → feature API → shared HTTP client → backend`.

Example: `features/resources/pages/...` → `useResources()` (`useQuery`) → `features/resources/api/index.ts` → `shared/api/client.ts` → `GET /student/resources`. Admin equivalents call `/admin/api/...` through `shared/api/client.ts`.

Both shared clients normalize every failure into one `ApiError` with `code`, `status`, `details?`, `requestId?` (field details map to inline errors; other errors use a toast). Retry policy is set once in each `QueryClient`, not per component. Mutations disable the button while pending and report success/failure through the shared toast.

Query keys are contracts shared by fetch, invalidation and logout. Cross-cutting keys (`SESSION_QUERY_KEY`, `PUBLIC_VIDEOS_QUERY_KEY`) live in `shared/lib/queryClient.ts`; feature keys are exported next to their hooks (`CODECHEF_QUERY_KEY`, `STUDENT_INDEX_QUERY_KEY`, `STUDENTS_QUERY_KEY`, `MODERATION_QUEUE_QUERY_KEY`, ...). There is no single generated key factory; when adding a key, export it from the owning hook and reuse that constant everywhere.

### QueryClient defaults

| Setting | `web` | `admin-client` |
|---|---|---|
| `staleTime` | 60 s | 30 s |
| `gcTime` | 15 min | 5 min |
| `refetchOnWindowFocus` | off (session query opts in) | off |
| Query/mutation retries | no retry on 4xx, at most one otherwise; mutations never retry | same |
| 401 handling | clears `student_token` and persisted cache, fires `elite-session-expired` | fires `admin-session-expired`, redirects to `/admin` unless already there |
| Persistence | dehydrate to `localStorage` key `elite_query_cache_v1`, max age 24 h, session entries excluded | none |

Both clients mount once in `main.tsx` under `QueryClientProvider`.

## Session handling

**Web.** `context/SessionContext.tsx` owns the single `/student/me` verification under `SESSION_QUERY_KEY` (`retry: false`, `staleTime: Infinity`, window-focus refetch enabled only for this query). Bootstrap happens synchronously in a state initializer: `sessionBootstrap.ts` reads `?token=`, persists it, strips it from the address bar, then checks storage. With no token the app renders public pages without a request; with a token the protected subtree waits. Only explicit 401/403 means signed out; other failures produce a retry screen. Logout clears the token, `removeQueries()` and the persisted cache. The shared client attaches the token as `Bearer` on every request and handles 401 for non-`/me` student calls.

**Admin.** `AuthProvider` in `App.tsx` holds `user`, `authChecking`, `authError` and the login/logout/retry callbacks; the credential is the httpOnly cookie, not `localStorage`. The shared client dispatches `admin-session-expired` on 401, except for `/admin/me` and `/admin/login`.

## Styling and shared primitives

`shared/tokens.mjs` is the source of colors, type scale, radius, elevation, motion and layers; `shared/tokens.css` exposes them as CSS custom properties; `shared/tailwind-preset.mjs` exports `eliteTheme`. Both `tailwind.config.js` files are thin wrappers around that preset and enable `darkMode: ['class', '[data-theme="dark"]']`. Light and dark both resolve through tokens — do not add a second theme mechanism or raw palette values. Token drift is checked by `npm run tokens:check`, `npm run check:contrast` and `npm run check:utilities` at the repo root.

`web/src/shared/ui` exports Button, Input, Textarea, Select, Card, Badge, Chip, Modal, ConfirmDialog, ToastProvider, Skeleton/SkeletonPage, EmptyState, ErrorState, ProgressBar, FileUploadZone and more. `admin-client/src/shared/ui` has a smaller surface: Dialog, ConfirmDialog, BrandedLoading, LoginPage and PlatformIcons. Reuse these before writing local markup; where the admin app lacks a primitive, its pages currently supply their own equivalent (known debt).

Every data view renders four explicit states: loading (`SkeletonPage`/`Skeleton`), error (`ErrorState` with message + retry), empty (`EmptyState` with a next action), success. `ErrorBoundary` wraps the app and each route outlet so a crash keeps the shell alive. `web/src/shared/ui/Toast.tsx` and `ToastProvider.tsx` provide non-field feedback; field validation errors render inline.

## Accessibility, responsiveness, motion

- Mobile-first layouts; no fixed page widths or horizontal page scroll; wide tables scroll in their own container. Dialogs are bottom sheets on small screens and centered panels on larger ones; touch targets are at least 44 px.
- Every interactive element has an accessible name, a visible focus state and keyboard support; icon-only buttons need labels.
- Motion is short, functional and state-driven, never decorative. Web wraps the app in `MotionConfig reducedMotion="user"` and exposes `useReducedMotion`; token-defined durations/easings come from the preset. No animation library should be added to a view that does not need one.
- Dark and light themes must both work; a component that only looks right in one is a defect.

## Performance

Routes are code-split in both apps, and public pages are kept out of authenticated bundles. Web adds route prefetch registrations for likely next navigations. Images use correct dimensions, lazy loading below the fold and async decoding; lists use thumbnails; video/PDF loads on demand with `preload="none"` and a poster. Independent requests run in parallel. Search inputs are debounced with a minimum length. CI enforces a web bundle budget with `node tools/check-bundle-size.mjs web/dist`.

## Frozen portfolio

`web/src/features/portfolio/` and `backend/src/modules/portfolio/` are frozen: no edits unless the task is exclusively about the portfolio feature. Existing portfolio debt (including deep imports) is documented, not refactored as a side effect.

## Known exceptions left for human review

- **Student token in `localStorage` / `?token=` bootstrap.** `sessionBootstrap.ts` and `shared/api/client.ts` store `student_token` in `localStorage` and attach it as a Bearer header; the Google callback delivers the token in the URL. This conflicts with SEC-8 (httpOnly, secure, sameSite cookies; no tokens in URLs or `localStorage`). It is left in place because replacing it changes the SSO callback contract and cross-domain/iOS Safari behavior — an auth-flow decision, not a safe mechanical cleanup.
- CodeChef mocks are now gated by `import.meta.env.DEV` in both apps; production reads the API. Feature flags default to enabled.
- Some local helpers still use `as any` / `console.error` for non-fatal paths (e.g. `queryClient.ts`, `SessionContext.tsx`, admin `AuthProvider`); these are pre-existing STYLE-3/DEAD-7 debt.
- The Playwright SSO smoke reads a local backend secret and includes identity-shaped fixture values; it is local-only and needs human review before any fixture change (see `docs/testing.md`).
