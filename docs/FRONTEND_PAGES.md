# ELITE Self Introduction Portal — Frontend Page Reference

> Complete documentation of every page in both frontends: what each page is, how many
> functions it defines, what those functions do, which API endpoints it calls, and
> exactly how it links to other pages.
>
> **Scope:** `web/` (student + public portal) and `admin-client/` (organizer console).
> **Stack:** React 18 · TypeScript · Vite 6 · Tailwind CSS 3 · react-router-dom 6 (`web` only).
> **Generated:** 2026-09-30 · against commit `cc75577`.

---

## Table of Contents

1. [How to read this document](#1-how-to-read-this-document)
2. [Architecture at a glance](#2-architecture-at-a-glance)
3. [The two navigation models](#3-the-two-navigation-models)
4. [Shared infrastructure](#4-shared-infrastructure)
5. [Part A — `web`: Public pages (4)](#5-part-a--web-public-pages)
6. [Part B — `web`: Public page components (4 live)](#6-part-b--web-public-page-components)
7. [Part C — `web`: Student portal layout (4)](#7-part-c--web-student-portal-layout)
8. [Part D — `web`: Student portal pages (16)](#8-part-d--web-student-portal-pages)
9. [Part E — `web`: Utility modules (5)](#9-part-e--web-utility-modules)
10. [Part F — `admin-client`: Shell components (6)](#10-part-f--admin-client-shell-components)
11. [Part G — `admin-client`: Tab screens (18)](#11-part-g--admin-client-tab-screens)
12. [Part H — Orphaned / dead components](#12-part-h--orphaned--dead-components)
13. [Complete navigation graph](#13-complete-navigation-graph)
14. [API surface reference](#14-api-surface-reference)
15. [Function count master table](#15-function-count-master-table)
16. [Defects, gaps and risks](#16-defects-gaps-and-risks)
17. [Load performance](#17-load-performance)
18. [Public landing page design pass](#18-public-landing-page-design-pass)

---

## 1. How to read this document

Every page entry uses a consistent block:

| Field | Meaning |
|---|---|
| **Route / Tab** | The URL (`web`) or `AdminTab` key (`admin-client`) that activates the page |
| **Component** | Exported React component name |
| **Functions** | Count of named functions defined in the file, with a sub-count of sub-components |
| **Inline handlers** | Anonymous arrow functions written directly in JSX props (`onClick={() => …}`) |
| **API calls** | Every `api.*` / `adminApi.*` method invoked, with its HTTP endpoint |
| **Navigation** | Every outbound link, in-content tab jump, or callback-fired transition |
| **State** | Number of `useState` hooks and what each holds |
| **How it works** | Prose walkthrough of the page's behaviour and render order |

**A note on counting.** "Functions" counts *named* declarations — `function foo()`,
`const foo = () =>`, `const foo = async () =>`, `const foo = useCallback(...)`,
and named sub-components. Anonymous arrows inside JSX are reported separately as
"inline handlers" because they are real logic but not addressable by name. Numbers
were produced by static analysis of the source and cross-checked against manual reads.

---

## 2. Architecture at a glance

| | `web` (Student Portal) | `admin-client` (Organizer Console) |
|---|---|---|
| Purpose | Public showcase + authenticated student workspace | Internal coordinator/moderator console |
| Routing | **react-router-dom v6** — 21 routes | **None** — 18 state-driven `AdminTab` values |
| Navigation unit | URL path | React state (`activeTab`) |
| Deep-linking | Yes — every page has a URL | **No** — refresh always returns to `dashboard` |
| Browser back/forward | Works | Does nothing |
| Auth | Google Workspace SSO → httpOnly cookie **+** `localStorage.student_token` Bearer | Username/password → httpOnly cookie only |
| Dev URL | `http://localhost:5173` | `http://localhost:5175/admin/` |
| Build output | `web/dist` (deployed to Netlify/Vercel) | `backend/public/admin` (served by Express at `/admin`) |
| API prefix | `/api/*` | `/admin/api/*`, `/admin/login`, `/admin/logout`, `/admin/me` |
| API methods available | 55 | 65 |
| Code-splitting | `React.lazy` on every page + `Suspense` | `React.lazy` on 15 pages + `Suspense` |
| Theming | Two providers: `PublicThemeProvider`, `StudentThemeProvider` | One provider: `AdminThemeProvider` |
| Dark mode | Per-provider scope | Toggles `dark` on `<html>` **and** `<body>` globally |

### 2.1 Build & serve topology

```
Development
  web    :5173 ──proxy /api──────────► backend :5001
  admin  :5175/admin ──proxy /admin/*──► backend :5001

Production
  web/dist ──────────► Netlify / Vercel  (outputDirectory: web/dist)
  admin build ───────► backend/public/admin ──► Express serves at /admin
  backend :5001 ─────► Render
```

`admin-client/vite.config.ts` sets `base: '/admin/'` and
`build.outDir: path.resolve(__dirname, '../backend/public/admin')`. The admin bundle is
therefore **not** deployed independently — the backend compiles and serves it.

---

## 3. The two navigation models

This is the single most important architectural difference, and it explains most of the
linkage behaviour documented later.

### 3.1 `web` — declarative URL routing

`web/src/App.tsx` wraps everything in `<BrowserRouter>` and declares routes with
`<Routes>` / `<Route>`. Navigation happens by rendering a `<Link to="…">` or calling
`navigate('/path')` from `useNavigate()`. The browser URL is the source of truth for
what page is displayed.

Route table (21 declarations):

| Path | Page | Guard |
|---|---|---|
| `/` | `HomePage` | public |
| `/login` | → redirect `/` | — |
| `/students` | `StudentDirectoryPage` | public |
| `/students/:rollNo` | `PublicStudentProfilePage` | public |
| `/students/:rollNo/resume` | `PublicResumeViewerPage` | public |
| `/dashboard` | `DashboardPage` | session |
| `/profile` | `ProfilePage` | session |
| `/profile/edit` | `EditProfilePage` | session |
| `/portfolio/*` | `PortfolioPage` | session |
| `/intro-video` | `VideoPage` | session |
| `/video` | → redirect `/intro-video` | — |
| `/resume` | `ResumePage` | session |
| `/events` | `EventsPage` | session |
| `/events/:id` | `EventDetailPage` | session |
| `/registrations` | `RegistrationsPage` | session |
| `/teams` | `TeamsPage` | session |
| `/voting` | `VotingPage` | session |
| `/voting/:campaignId` | `VotingPage` | session |
| `/notifications` | `NotificationsPage` | session |
| `/announcements/:id` | `AnnouncementDetailPage` | session |
| `*` | → redirect `/` | — |

**The auth guard** is a pathless parent `<Route element={…}>` wrapping all 14 protected
children. If `session` is null it renders `<Navigate to="/" replace />`. The public four
routes are declared *outside* that guard and are individually wrapped in
`<PublicThemeProvider>`.

### 3.2 `admin-client` — imperative state switching

`admin-client/src/App.tsx` imports **no routing library at all**. It holds
`const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')` and renders
screens with a chain of conditional expressions:

```tsx
{activeTab === 'dashboard'    && <StatsDashboard … />}
{activeTab === 'submissions'  && <SubmissionsTable … />}
{activeTab === 'students'     && (selectedStudentId
                                    ? <StudentDetail studentId={selectedStudentId} onBack={…} />
                                    : <StudentsTable … />)}
…
```

Navigation is therefore **callback-based**. Child components never know a route; they
call a prop such as `onNavigateTab('moderation')` and the root `App` mutates state.
The `AdminTab` union type (18 members) is declared in `components/Sidebar.tsx` and is the
single source of truth for what screens exist.

**Consequences worth knowing:**
- No URL ever changes, so there is nothing to bookmark or share.
- Reloading the page always lands on `dashboard`.
- Browser Back does not close modals or return to a previous tab.
- Every `setActiveTab` call also clears `selectedStudentId`, which collapses the
  `students` tab's `StudentDetail` sub-screen back to the roster.
- 13 of the 18 tabs are reachable **only** from the `Sidebar`; only `moderation` and
  `settings` additionally have in-content shortcuts (see §13).

---

## 4. Shared infrastructure

### 4.1 `web/src/services/api.ts` — 55 methods

Creates one axios instance:

```ts
const client = axios.create({ baseURL: getApiBaseUrl(), withCredentials: true });
```

`getApiBaseUrl()` resolves the API origin at runtime: if the page is served from
`localhost:5001` it returns the relative `/api`; otherwise it reads
`import.meta.env.VITE_API_BASE_URL`, normalises it, and appends `/api`.

A request interceptor attaches `Authorization: Bearer <token>` from
`localStorage.student_token` when present — required because the SPA runs on a different
origin than the API in production (Netlify vs Render), where cookies are cross-site.

Method groups: **Auth/OAuth (3)**, **Video (6)**, **Profile (5)**, **Projects (5)**,
**Achievements (4)**, **Certificates (4)**, **Resume (3)**, **Events/Registrations (5)**,
**Teams (7)**, **Voting (2)**, **Notifications (3)**, **Announcements (1)**,
**Public (7)**.

Two module-level exports sit outside the `api` object:
- `getApiBaseUrl()` — origin resolution
- `resolveMediaUrl(pathOrUrl)` — turns a server-relative media path into an absolute URL
  usable in `<video src>` / `<img src>`

**Notable:** `submitVideoStream()` deliberately bypasses axios for raw `XMLHttpRequest`,
sending the `File` as a `video/mp4` binary body with an `X-Filename` header. This lets
the backend pipe straight to Google Drive with no buffering, reports byte-level progress
with a computed speed and ETA, and honours an `AbortSignal` for cancellation. The
comment explains this exists because Render has a tight memory limit against 25 MB files.

### 4.2 `admin-client/src/services/api.ts` — 65 methods

```ts
const client = axios.create({ withCredentials: true });
export const api = adminApi;   // alias used by ActivityLogView
```

No `baseURL` — every call uses a same-origin absolute path, which is what makes the
`/admin/` Vite base plus proxy configuration work. Auth is an httpOnly JWT cookie
invisible to JavaScript.

Groups: Auth (3) · Stats (1) · Events (2) · Submissions (9) · Video visibility (1) ·
Students (3) · Student items (2) · Moderation (5) · Voting (6) · Announcements (3) ·
Registrations (5) · Teams (3) · Analytics (1) · Storage (3) · Email (6) · Roles (4) ·
Settings (2) · Export URLs (2) · Change requests (3).

**Notable:** `getMe()` swallows every error and returns `{ authenticated: false }`.
`getAnnouncementAudiencePreview()` falls back to a hard-coded `{ count: 120 }` when the
endpoint fails, so the "will reach N students" hint can silently display a wrong number.

### 4.3 Theme contexts

`web` splits theming in two so a public visitor's theme choice cannot bleed into the
authenticated workspace:

- `PublicThemeProvider` / `usePublicTheme` — wraps the 4 public routes
- `StudentThemeProvider` / `useStudentTheme` — wraps `StudentLayout` and its 14 children

⚠️ **Both are stubs.** Each context is typed `{ theme: 'light' }` with no setter, and
each provider hard-codes `value={{ theme: 'light' }}`. The student provider's source
comment says the portal "stays on its fixed clean academic theme, strictly independent
of admin." The hooks are therefore indirection with no runtime effect — **unlike the
admin app, the student portal has no working light/dark switch.** Both providers do
strip any stray `dark` class from `<html>` and `<body>` on mount, and each renders a
scoped root div (`#public-root` / `#student-root`).

`admin-client` has a single `AdminThemeProvider` (aliased `ThemeProvider`) exporting
`useTheme()`. Its context is dual-purpose: `{ theme, setTheme, isDark, setAdminUser }`.
`setAdminUser` is not about theming — `App.tsx` calls it purely so the provider can load
the signed-in admin's saved preference. Storage keys are per-user
(`elite_admin_theme_<userId>`, falling back to username, then `_default`). Note that
despite a source comment claiming the `dark` class is scoped to the provider's container,
the effect also mutates `document.documentElement` and `document.body` globally.

### 4.4 Entry points

Both apps mount with `React.StrictMode`.

- `web/src/main.tsx` → `<StrictMode><App/></StrictMode>`. The `BrowserRouter` and theme
  providers live inside `App.tsx`, not here.
- `admin-client/src/main.tsx` → `<StrictMode><ThemeProvider><App/></ThemeProvider></StrictMode>`.
  No router, no query client, no error boundary.

---

## 5. Part A — `web`: Public pages

These four routes require **no session**. They are wrapped in `PublicThemeProvider` and
render their own `Navbar` / `Footer`.

---

### 5.1 HomePage

| | |
|---|---|
| **Route** | `/` |
| **File** | `web/src/pages/public/HomePage.tsx` |
| **Component** | `HomePage` (named + default) |
| **Size** | 244 LOC |
| **Functions** | **3** (1 component + 2 handlers) |
| **Inline handlers** | 4 |
| **Props** | `{ session: StudentSession \| null; onLogout: () => void }` — **required**, unlike the other three public pages |
| **API** | `api.getPublicVideos()` via `usePublicVideos`; `api.getOAuthAuthorizeUrl()` (a synchronous URL builder, not a request) |
| **Navigation out** | `/students`, `/students?search=…`, `/events`, `/students/:id` (video caption), `/dashboard` (redirect), Google OAuth (hard redirect) |

**Functions**

| Function | Purpose |
|---|---|
| `HomePage` | The exported component itself |
| `handleSearch` | Reads the search box; pushes `/students?search=<urlencoded>`, or bare `/students` when the query is empty — handing the term off to the directory page rather than filtering locally |
| `handleSignIn` | Assigns `api.getOAuthAuthorizeUrl()` to `window.location.href`, starting the Google Workspace OAuth redirect |

**How it works.** `/` is now a real landing page rather than a bare sign-in gate, and it
is the **only** page in the app that composes section components. See §18 for the full
redesign rationale. Structurally:

| Region | Contents |
|---|---|
| Hero | Split layout. Left: `h1`, an 18-word value proposition, `Student Sign In` (primary) + `Browse directory` (secondary), and the `@sasi.ac.in` account note. Right: the **first** published video, or a working fallback |
| Search band | Its own labelled `<form>`; pushes to `/students` |
| Video showcase | `<PublicVideoShowcase>`, handed the hero's fetch result via the `videos` / `loading` / `failed` props so `/public/videos` is requested **once** |
| Guidelines | `<GuidelinesSection>`, revived in this pass |
| Events band | Links to the public `/events` |
| `Footer` | — |

It has **one** piece of state (`searchQuery`). Data fetching moved out to
`usePublicVideos` (see §9.4), which is what makes the single-request handoff possible.

⚠️ **The video fetch runs before the `session` redirect.** `usePublicVideos()` is called
above `if (session) return <Navigate to="/dashboard" replace />`, because hooks cannot be
conditional. A signed-in student therefore issues one `/public/videos` request that the
redirect discards. This is the cheaper of the two options — the alternative is moving the
redirect above the hook, which reintroduces the Rules-of-Hooks violation that defect #1
documents.

⚠️ **The one thing it does that nothing else does:** if `session` is truthy, `HomePage`
early-returns `<Navigate to="/dashboard" replace />`. A signed-in student never sees
this page — `/` is a pure anonymous-entry screen.

**How it connects.** The single most important behaviour is that **the home page owns
the login button**, and login is a full browser navigation away to Google — not a client
side route change. `getOAuthAuthorizeUrl()` returns
`{base}/api/student/google/authorize?return_to={origin}/login`; the browser leaves the
SPA entirely.

⚠️ **The return leg is handled in `App.tsx`, not by a page.** Because `/login` is not a
real page — it is `<Navigate to="/" replace />` (`App.tsx:164`) — the token has to be
captured before the redirect renders. `App.tsx:75-99` does this: it reads `?token=` via
`searchParams`, writes it to `localStorage.student_token`, **strips it from the address
bar with `window.history.replaceState`** (so the bearer token is not left in history or
in a shared screenshot), then validates it with `api.getMe()`. On failure it removes the
stored token and comments explicitly that keeping a bad token would trap the student in
a login loop. So the full round trip is: Google → `/login?token=…` → `App` extracts and
strips it → `AuthWrapper` resolves a session → `<Navigate to="/">` → `HomePage` sees the
session → `<Navigate to="/dashboard">`. Three redirects, none of which is a page.

Note the search handoff uses **`?search=`**, which `StudentDirectoryPage` reads via
`useSearchParams`.

---

### 5.2 StudentDirectoryPage

| | |
|---|---|
| **Route** | `/students` |
| **File** | `web/src/pages/public/StudentDirectoryPage.tsx` |
| **Component** | `StudentDirectoryPage` |
| **Size** | 440 LOC |
| **Functions** | **29** total — 1 component, 1 named handler, 27 inline arrows |
| **`useEffect`** | **4** (debounce timer, `?search` sync, skills load, paginated fetch) |
| **Props** | `{ session?, onLogout? }` — both **optional** |
| **API** | `api.getPublicStudents(params)`, `api.getPublicSkills()` |
| **Navigation out** | `/students/:rollNo` (the entire card is the link) |

**Functions**

| Function | Purpose |
|---|---|
| `StudentDirectoryPage` | The exported component |
| `resetFilters` | Clears all five filters (search, year, section, skill, status), returns to page 1, **and** strips `?search=` from the URL so the view is no longer shareable in its cleared state |

The other 27 are inline arrows, grouped by role: 4 `useEffect` bodies plus 3 cleanups,
the `.then`/`.catch`/`.finally` chains of the two fetches, the three `<select>`
`onChange`s, the search input's `onChange`, the card `.map` and its nested
initials/skills `.map`s, and the Previous/Next buttons (each contributing both an outer
handler and an inner `setState` updater arrow).

**How it works.** Renders a searchable, filterable, paginated card grid of every public
student — **the largest page in the public app by function count**, and the only one
with real client-side search machinery. Two effects do the interesting work:

1. A **300 ms debounce** effect separates the controlled `search` state from
   `debouncedSearch`, so typing does not fire a request per keystroke; it also resets
   `page` to 1, so a narrower result set never lands the user on an empty page 7.
2. A **`?search=` sync** effect keeps the input honest when the URL changes underneath
   it — this is the receiving end of `HomePage.handleSearch`, and also what the "clear
   search" button resets.

Four filters are server-side (`year`, `section`, `skillName`, `status`) while the search
box is debounced client-side, so `getPublicStudents` is called with a 7-key parameter
object. `'ALL'` sentinels are translated to `undefined` before the request, and
`limit` is pinned to **24** per page. Note that filters are **not** reflected in the
URL — only the search term is — so a filtered directory view is *not* shareable, with
`resetFilters` as the only escape.

**How it connects.** This is the **hub of all public navigation**: every student card is
itself a `<Link to={/students/${s.rollNo}}>`, which is the primary inbound edge to
`PublicStudentProfilePage`. Inbound from `HomePage` (both `navigate('/students')` and
`navigate('/students?search=…')`) and from the `Navbar` desktop and mobile "Student
Directory" links. It also receives `session`/`onLogout` so the navbar can show a
signed-in student's avatar and dashboard shortcut.

---

### 5.3 PublicStudentProfilePage

| | |
|---|---|
| **Route** | `/students/:rollNo` |
| **File** | `web/src/pages/public/PublicStudentProfilePage.tsx` |
| **Component** | `PublicStudentProfilePage` |
| **Size** | 457 LOC |
| **Functions** | **11** total — 1 component, 0 named handlers, 10 inline arrows |
| **`useEffect`** | 1 |
| **Props** | `{ session?, onLogout? }` |
| **API** | `api.getPublicStudent(rollNo)` — **one** call feeds the entire page |
| **Navigation out** | `/students`, `/students/:rollNo/resume`, plus external media |

**Functions**

| Function | Purpose |
|---|---|
| `PublicStudentProfilePage` | The exported component |

The other 10 are inline arrows: the `useEffect` body and its `.then`/`.catch`/`.finally`
chain, the initials builder, and the `.map` callbacks for skills, certificates,
projects, project tech-stack chips, and achievements. **This page has no named event
handlers at all** — it is entirely read-only, which is why it can be published to
anyone with the link.

**How it works.** Reads `:rollNo` from `useParams()` and makes a **single**
`getPublicStudent(rollNo)` call. That one response is the whole page: masked profile,
projects, `APPROVED` achievements, `APPROVED` + `isPublic` certificates, the latest
`APPROVED` resume, and the intro video when it is approved, public, and actually
uploaded. **The server does all the redaction** — the client never receives a Drive file
ID, only `/api/public/media/...` view URLs, which is what makes this page safe to expose
without authentication. Three mutually exclusive branches: loading, not-found, and
success.

**How it connects.** Reached from every `StudentDirectoryPage` card, from the "Profile"
links in `HomePage`'s `PublicVideoShowcase` (whose `profileUrl` is server-generated as
`/students/{rollNo}`), and from the admin `StudentDetail` page. Outbound: back to the
directory, to the resume viewer, and to the media proxy for certificate/achievement
proofs. The roll number — not a database ID — is the public URL key, which keeps the
identifier human-readable and matches the roll printed on a student's ID card.

---

### 5.4 PublicResumeViewerPage

| | |
|---|---|
| **Route** | `/students/:rollNo/resume` |
| **File** | `web/src/pages/public/PublicResumeViewerPage.tsx` |
| **Component** | `PublicResumeViewerPage` |
| **Size** | 119 LOC |
| **Functions** | **5** total — 1 component, 0 named handlers, 4 inline arrows |
| **`useEffect`** | 1 |
| **Props** | `{ session?, onLogout? }` |
| **API** | `api.getPublicStudent(rollNo)` |
| **Navigation out** | `/students/:rollNo` (twice) |

**Functions**

| Function | Purpose |
|---|---|
| `PublicResumeViewerPage` | The exported component |

The other 4 are the `useEffect` body and its `.then`/`.catch`/`.finally` chain. No event
handlers, no render callbacks.

**How it works.** The simplest page in the codebase, and the only one that **embeds a
document**. It reads `:rollNo`, calls `getPublicStudent`, and picks `resumes[0]` —
applying a three-step URL priority (`viewUrl` → client-constructed
`/api/public/media/resume/{id}` → `fileUrl`) before handing the result to
`resolveMediaUrl`. The resolved URL is then used twice: as an `<iframe src>` for the
inline preview, and as an `<a href>` with `?download=1` appended (correctly switching to
`&` when the URL already has a query string).

⚠️ **A dedicated endpoint exists for this page and the frontend never calls it.** The
backend exposes `GET /public/students/:rollNo/resume`, which 302-redirects to the media
route. Instead the page fetches the *entire* student payload — projects, achievements,
certificates and all — to read two fields. On a profile-heavy student that is a
substantially larger response for no benefit.

**How it connects.** One inbound link from `PublicStudentProfilePage` (conditional on the
student having an approved resume), and two outbound links back to that profile — one in
the toolbar, one in the empty state. It deliberately has no other navigation: a reader
who opened a resume from a shared link should not be pushed into a browsing flow.

Note this is the only public page that does **not** use `BrandedLoading` — it shows a raw
`Loader2` spinner, which is a small inconsistency in the otherwise uniform loading
treatment.

---

## 6. Part B — `web`: Public page components

### 6.1 The live set — 5 components, all reachable

`HomePage` composes exactly **three** of these (`PublicVideoShowcase`,
`GuidelinesSection`, plus `Navbar`/`Footer` around them). This is the whole public
component surface that actually ships.

| Component | File | LOC | Functions | Reached from |
|---|---|---|---|---|
| `Navbar` | `components/Navbar.tsx` | 252 | **15** (1 + 2 named + 12 inline) | **All 4 public pages** |
| `Footer` | `components/Footer.tsx` | 25 | **1** | **All 4 public pages** |
| `PublicVideoShowcase` | `components/PublicVideoShowcase.tsx` | 158 | **6** (1 + 1 named + 4 inline) | `HomePage` only |
| `GuidelinesSection` | `components/GuidelinesSection.tsx` | 71 | **1** | `HomePage` only |
| `BrandedLoading` | `components/BrandedLoading.tsx` | 65 | **2** | `App.tsx` + 2 public + 12 portal pages |

**Functions worth detailing**

- **`Navbar`** (15) — the only shared component with real behaviour. `handleSignIn`
  redirects to Google via `api.getOAuthAuthorizeUrl()`; `handleLogout` closes both
  dropdowns then delegates to the `onLogout` prop (which is `AuthWrapper.handleLogout` →
  `api.logout()` + clear token + redirect home); `handleClickOutside` (defined inside
  the `useEffect` at line 19) closes the mobile menu and profile dropdown when a click
  lands outside their refs. State: `mobileMenuOpen`, `profileOpen`, plus a `chipRef` for
  outside-click detection. It links `/`, `/students`, and — when signed in —
  `/dashboard` and `/profile`, and it is the only public component that reads
  `useLocation` (to mark `/students*` active). ⚠️ Its `onNavigate` prop is declared in
  the interface and **never destructured** — dead, a leftover from the retired landing
  page.

- **`Footer`** (1) — zero state, zero effects, zero navigation, zero API calls. Pure
  static markup with a `new Date().getFullYear()` copyright.

- **`PublicVideoShowcase`** (11) — `handlePlay` plus a ref map enforces a
  **one-video-at-a-time** rule: playing any card pauses every other `<video>`, so a grid
  of ten videos cannot play ten audio streams at once. The component's own JSDoc
  documents the visibility invariant: the API only ever returns videos that are
  **approved AND published**, which is why the grid is frequently empty during review
  periods. Fetches `getPublicVideos()` with no `limit` (server default 24, capped at
  60) and has four render branches: loading, failed, empty, and the grid.

- **`BrandedLoading`** (2) — the branded splash: ELITE logo with two pulsing rings, an
  indeterminate bar, and an uppercase message. `fullScreen` toggles between a
  `fixed inset-0` overlay and an in-flow block. No state, no API. The second "function"
  is just an `onError` handler that hides the logo if the image fails.

### 6.2 The dead set — resolved

⚠️ **This was the single largest piece of rot in the `web` app.** Ten components, 1,719
LOC, compiled and shipped in the production bundle with **zero importers** — the remains
of a retired marketing landing page, orphaned when `HomePage` was reduced to a bare login
gate. All ten have now been resolved (§18). None is dead any more.

| Component | LOC | Verdict | Where it went |
|---|---|---|---|
| `StudentDashboard` | 665 | **Deleted** | Superseded by the routed `VideoPage`. Also the source of the duplicate `MAX_VIDEO_MB = 25` (defect #21) |
| `PortfolioArchitectureSection` | 150 | **Deleted** | Div-built "UI illustrations" of a product that does not exist; addressed signed-in students |
| `StudentShowcaseSection` | 182 | **Deleted** | Duplicated `StudentDirectoryPage`, which is a real route at `/students` |
| `EliteEventsSection` | 160 | **Deleted** | Linked to `/events/:id`, a protected route. Its `scrollToLogin` also targeted `#login-section`, an anchor that exists nowhere in the repo |
| `PortalFeaturesSection` | 113 | **Deleted** | Four links to `/students`, one to protected `/events` |
| `IntroVideoFeatureSection` | 114 | **Deleted** | A second sign-in CTA competing with the hero's |
| `HeroSection` | 156 | **Deleted** | Its job is now the hero block in `HomePage` itself |
| `AboutSidebar` | 70 | **Deleted** | "About" as a sidebar is portal furniture, wrong shape for a landing page |
| `StudentLogin` | 44 | **Deleted** | A login card duplicating the hero and navbar sign-in buttons |
| `GuidelinesSection` | 65 | **Revived** | Real, useful public content. Restructured and rendered on the landing page |

**The classification rule applied.** Per the project's dead-code policy ("if it is a
feature, add it; if it is waste, remove it"), each file was judged on whether it carried
information the live app lacked, not on whether it happened to be unused. Nine carried
none. `GuidelinesSection` carried a genuine gap — the rules a profile must meet were
invisible to anyone who had not already signed in — so it was rewritten rather than
deleted. Its four-card layout was rebuilt as three cards plus a full-width conduct band,
because four equal feature cards in a row is a template tell, not a design.

**Two things worth keeping from the old analysis:**

1. **It poisoned API audits.** Grepping `api.` across `web/src/components` used to
   over-report the live surface with `getPublicStudents`, `getPublicEvents`, and
   `getOAuthAuthorizeUrl` call sites that could never execute. Every count in §14 drawing
   on component call sites needed that filter. It no longer does.
2. **`StudentDashboard` declared a second `MAX_VIDEO_MB = 25`**, so the repo held two
   different answers to "how large may an intro video be" and enforced only one. Deleting
   it left the `VideoPage` value authoritative. The 25 MB cap is now served from
   `limits.service.ts` with an env fallback and a 100 MB hard ceiling for multer.

---

## 7. Part C — `web`: Student portal layout

| Component | File | LOC | Functions | Role |
|---|---|---|---|---|
| `StudentLayout` | `components/layout/StudentLayout.tsx` | 44 | **1** | Auth-gated shell |
| `StudentSidebar` | `components/layout/StudentSidebar.tsx` | 83 | **1** | Desktop nav |
| `StudentHeader` | `components/layout/StudentHeader.tsx` | 359 | **6** + 10 inline | Top bar + notifications |
| `MobileBottomNav` | `components/layout/MobileBottomNav.tsx` | 163 | **1** + 6 inline | Mobile tab bar |

### 7.1 StudentLayout

**Functions: 1** (the component). It receives `session`, `onLogout`, and `onPhotoChange`,
renders `StudentSidebar` + `StudentHeader` + `MobileBottomNav` around react-router's
`<Outlet />`, and passes `onPhotoChange` down so a freshly uploaded avatar can update
the header immediately.

This closes a real bug the source comments call out: the header avatar renders from the
**session**, not from the profile the edit page fetches. Without the callback, a new
photo would only appear on `/profile/edit` and the header would keep the old image
until logout. The chain is `EditProfilePage` → `StudentLayout.onPhotoChange` →
`App.handlePhotoChange` → `setSession`, which patches
`prev.student.photoUrl`.

### 7.2 StudentHeader

**Functions: 6** — `loadNotifications`, `handleMarkAllRead`, `handleSelectNotif`,
`handleClickOutside`, `handleKeyDown`, plus the component itself.
**API:** `api.getNotifications()`, `api.markAllNotificationsRead()`,
`api.markNotificationRead()`.
**Navigation out:** `/dashboard`, `/notifications`, `/profile`, `/profile/edit`.

`loadNotifications` fetches the unread count and badge on mount. `handleSelectNotif`
marks one notification read, then resolves its destination through
`utils/notificationRouting.ts` and navigates — the single place notification → page
routing is defined. `handleClickOutside` and `handleKeyDown` (Escape) dismiss the
notification and profile dropdowns.

⚠️ **The page-title lookup is buggy.** `pageTitles` is a 15-key map, but the lookup is
`Object.keys(pageTitles).find(p => pathname === p || pathname.startsWith(p + '/'))` —
**first match wins in insertion order**, and `startsWith` is prefix-based. Three
consequences:

| Current path | Renders | Should render |
|---|---|---|
| `/profile/edit` | "My Profile" | "Edit Profile" |
| `/portfolio/projects`, `/portfolio/achievements`, `/portfolio/certificates` | "Portfolio Showcase" | the per-tab titles that are defined but unreachable |
| `/intro-video` | "Student Dashboard" | "Introduction Video" |

The third case is a plain key typo: the map declares `'/video'`, but the live route is
`'/intro-video'`, so nothing matches and the `|| '/dashboard'` fallback fires. All three
titles are already written in the map — they are simply unreachable.

### 7.3 StudentSidebar / MobileBottomNav

Both are pure presentational nav lists with **1 function each** (the component). They
render `<NavLink>`/`<Link>` elements to the same route set, differing only in layout —
a fixed left rail on desktop, a bottom tab bar on mobile. These lists are the primary
navigation graph for the authenticated student and are enumerated in §13.

`StudentSidebar` has **10** items (Dashboard, My Profile, Portfolio, Intro Video, Resume,
Events, My Registrations, Teams, Voting, Notifications), hidden below `md`, with active
styling via the `NavLink` render-prop.

`MobileBottomNav` has **5** primary tabs (Home, Profile, Portfolio, Events, Inbox) plus a
"More" sheet holding **6** secondary links — including **`/students`**, the only *public*
route reachable from the mobile nav, which exits the authenticated shell entirely. The
sheet also hosts a "Sign Out of Portal" button. ⚠️ `useNavigate()` is declared at line 44
and **never referenced** — dead code.

---

## 8. Part D — `web`: Student portal pages

All 16 pages below sit behind the `session` guard and render inside `StudentLayout`.

---

### 8.1 DashboardPage

| | |
|---|---|
| **Route** | `/dashboard` |
| **Size** | 642 LOC |
| **Functions** | **3** (1 component + 2 handlers) |
| **Inline handlers** | 6 |
| **API (10 calls)** | `getProfile`, `getResume`, `getProjects`, `getAchievements`, `getCertificates`, `getEvents`, `getRegistrations`, `getVotingCampaigns`, `getNotifications`, `markNotificationRead` |
| **Navigation out** | `/profile`, `/profile/edit`, `/intro-video`, `/resume`, `/portfolio`, `/registrations`, `/teams`, `/events`, `/voting`, `/notifications` |

**Functions**

| Function | Purpose |
|---|---|
| `DashboardPage` | The exported component |
| `loadData` | Fans out **9 parallel API calls** (10 call sites) on mount via `Promise.allSettled`, so one failing endpoint never blanks the page. Four independent error strings surface inline with Retry buttons |
| `handleNotificationClick` | Marks a notification read and routes it via `navigateToNotification` |

**How it works.** The single most API-dense page in either app. Rather than letting
each card fetch itself, `loadData` issues every request concurrently inside a
**single `Promise.allSettled`**, so the page paints once with complete data instead of
reflowing ten times — and a failure in any one call degrades to an inline banner rather
than an empty screen. It then computes a per-section "profile completeness" figure and
renders a set of quick-action cards.

**How it connects.** It is the **hub of the authenticated student app** — ten distinct
outbound routes. Every other student page is reachable from here, which is why the
sidebar and bottom-nav also exist: the dashboard is the destination, the sidebar is the
persistent map.

---

### 8.2 ProfilePage

| | |
|---|---|
| **Route** | `/profile` |
| **Size** | 741 LOC |
| **Functions** | **4** (1 component + 3 handlers) |
| **Inline handlers** | 9 |
| **API** | `getProfile`, `getResume`, `getProjects`, `getAchievements`, `getCertificates`, `submitChangeRequest` |
| **Navigation out** | `/profile/edit`, `/portfolio`, `/intro-video`, `/resume` |

**Functions**

| Function | Purpose |
|---|---|
| `ProfilePage` | The exported component |
| `fetchProfileData` | Loads the profile plus the four portfolio collections in parallel to render the read-only overview |
| `handleOpenModal` | Opens the "request a change" modal, used for fields a student cannot edit directly |
| `handleSubmitChangeRequest` | Sends `api.submitChangeRequest()` — the escape hatch for correcting locked fields such as roll number or year |

**How it works.** A read-only view of everything the student has submitted, assembled
from five endpoints. Fields that must be corrected are not directly editable; instead
`handleSubmitChangeRequest` opens a modal that files a change request for coordinator
approval.

**How it connects.** The only page that can escalate a data correction to staff. Links
to the four sub-workspaces (`/profile/edit`, `/portfolio`, `/intro-video`, `/resume`).

---

### 8.3 EditProfilePage

| | |
|---|---|
| **Route** | `/profile/edit` |
| **Size** | 602 LOC |
| **Functions** | **9** (1 component + 8 handlers) |
| **Inline handlers** | 20 |
| **API** | `getProfile`, `uploadProfilePhoto`, `updateProfile`, `updateSkills` |
| **Navigation out** | `/profile` |

**Functions**

| Function | Purpose |
|---|---|
| `EditProfilePage` | The exported component |
| `handlePhotoSelect` | Takes the file input, runs it through `getCroppedImg()`, and uploads via `api.uploadProfilePhoto()` |
| `handleRepositionPhoto` | Opens `PhotoCropModal` for an existing photo, enabling reposition/zoom without re-uploading |
| `handleCloseCropModal` | Dismisses the crop modal |
| `handleSavePosition` | Persists the crop result from the modal |
| `addSkill` | Appends a skill to the pending list, de-duplicating case-insensitively |
| `removeSkill` | Removes a skill from the pending list |
| `applyLink` | Normalises a social URL through `utils/socialLinks.ts` and commits it, rejecting malformed values |
| `handleSave` | Persists the whole form: `api.updateProfile()` then `api.updateSkills()` |

**How it works.** The most handler-dense student page. Profile photo handling is a
three-function chain: select → crop → upload, with a separate reposition path for an
already-uploaded image. `applyLink` delegates to `socialLinks.ts` rather than
validating inline, which is why that utility exists.

**How it connects.** Also the origin of the `onPhotoChange` chain documented in §7.1 —
a successful upload patches the session so the header updates without a re-login. It
returns to `/profile` on save.

---

### 8.4 PortfolioPage

| | |
|---|---|
| **Route** | `/portfolio/*` (wildcard) |
| **Size** | 70 LOC |
| **Functions** | **1** (component only) |
| **API** | none |

**How it works.** A pure tab shell. It renders an in-page tab strip for
**Projects / Achievements / Certificates** and delegates the content to
`ProjectsTab`, `AchievementsTab`, or `CertificatesTab` based on the nested route.

**How it connects.** This is the only wildcard route in the app. The three tabs
(*8.5–8.7*) are sibling components, not routes — so `PortfolioPage` itself is the only
page that carries a `/portfolio/*` segment.

---

### 8.5 ProjectsTab

| | |
|---|---|
| **Parent** | `/portfolio` → Projects |
| **Size** | 352 LOC |
| **Functions** | **6** (1 component + 5 handlers) |
| **Inline handlers** | 12 |
| **API** | `getProjects`, `createProject`, `updateProject`, `deleteProject` |

**Functions**

| Function | Purpose |
|---|---|
| `loadProjects` | Fetches the ordered project list |
| `handleOpenCreateModal` | Opens an empty project form |
| `handleOpenEditModal` | Opens the form pre-filled with an existing project |
| `handleSaveProject` | Branches on create vs update and calls the matching API |
| `handleDelete` | Confirms, then deletes the project |

Supports drag-to-reorder via `api.reorderProjects()`. Projects are **auto-approved** on
creation, so unlike videos they never enter the moderation queue.

---

### 8.6 AchievementsTab

| | |
|---|---|
| **Parent** | `/portfolio` → Achievements |
| **Size** | 328 LOC |
| **Functions** | **6** (1 component + 5 handlers) |
| **Inline handlers** | 11 |
| **API** | `getAchievements`, `createAchievement`, `updateAchievement`, `deleteAchievement` |

**Functions:** `loadAchievements`, `handleOpenCreateModal`, `handleOpenEditModal`,
`handleSaveAchievement`, `handleDelete`. Structurally identical to `ProjectsTab` but
with a proof-document upload and a category field. Achievements **do** enter moderation.

---

### 8.7 CertificatesTab

| | |
|---|---|
| **Parent** | `/portfolio` → Certificates |
| **Size** | 357 LOC |
| **Functions** | **6** (1 component + 5 handlers) |
| **Inline handlers** | 11 |
| **API** | `getCertificates`, `uploadCertificate`, `deleteCertificate`, `setCertificatePublic` |

**Functions**

| Function | Purpose |
|---|---|
| `loadCertificates` | Fetches the certificate list |
| `handleOpenModal` | Opens the upload dialog |
| `handleUploadCertificate` | Uploads the file via `FormData` |
| `handleDelete` | Confirms, then removes the certificate |
| `handleTogglePublic` | Flips per-certificate public visibility — the one portfolio item with its own independent visibility switch |

---

### 8.8 VideoPage

| | |
|---|---|
| **Route** | `/intro-video` (alias `/video` redirects here) |
| **Size** | **970 LOC — the largest page in `web`** |
| **Functions** | **16** (1 component + 15 helpers) |
| **Inline handlers** | 16 |
| **API** | `getMe`, `setVideoPublic`, `deleteVideo`, `submitVideoStream` |

**Functions**

| Function | Purpose |
|---|---|
| `VideoPage` | The exported component |
| `loadSubmission` | Fetches the student's current submission and review state |
| `setLocalPreview` | Installs an object URL for immediate local playback before upload completes |
| `handlePlayPause` | Toggles play/pause on the player |
| `handleReplay` | Seeks to zero and plays |
| `handleSeek` | Scrub handler bound to the range input |
| `handleTogglePublish` | Calls `api.setVideoPublic()` — the backend rejects publishing a video that is not yet approved |
| `handleDelete` | Withdraws the submission via `api.deleteVideo()` |
| `inspectVideoFile` | Validates type and size against the configured limits **before** upload |
| `handleFileSelect` | Opens the file picker and validates the selection |
| `handleCancelUpload` | Aborts an in-flight upload via the `AbortSignal` |
| `formatSubmittedAt` | Formats the submission timestamp |
| `getStatusBadge` | Maps moderation status → badge styling |
| `storedVideoUrl` | Resolves the stored video URL, with cache-busting version param |
| `handlePlaybackError` | Recovery path when direct playback fails |
| `withBlobFallback` | Falls back to `api.getVideoBlobUrl()` when the stream URL will not play |

**How it works.** The most functionally dense page in either app. It implements a
complete video lifecycle: pick → validate → stream-upload with live progress → preview
→ review-status display → publish toggle → withdraw. `submitVideoStream` is the one
upload path that bypasses axios so the backend can pipe to Drive unbuffered, which is
why `handleCancelUpload` can abort it cleanly. The route alias `/video` → `/intro-video`
is a redirect for older bookmarks.

**How it connects.** No outbound links to other pages — it is a self-contained
workspace. Navigation is via the sidebar. The publish toggle is what makes a video
appear on the public `PublicVideoShowcase`, linking this page to the marketing surface.

---

### 8.9 ResumePage

| | |
|---|---|
| **Route** | `/resume` |
| **Size** | 320 LOC |
| **Functions** | **4** (1 component + 3 handlers) |
| **Inline handlers** | 7 |
| **API** | `getResume`, `uploadResume`, `deleteResume` |

**Functions**

| Function | Purpose |
|---|---|
| `ResumePage` | The exported component |
| `loadResume` | Fetches the current resume record |
| `handleFileSelect` | Validates the chosen file, then uploads with `FormData` and a progress callback |
| `handleDelete` | Confirms, then removes the resume |

Upload progress is tracked via axios `onUploadProgress`, unlike the video page's
hand-rolled XHR progress. Resumes enter moderation; the public resume is served at
`/students/:rollNo/resume` once approved.

---

### 8.10 EventsPage

| | |
|---|---|
| **Route** | `/events` |
| **Size** | 203 LOC |
| **Functions** | **2** (1 component + 1 loader) |
| **Inline handlers** | 3 |
| **API** | `getEvents`, `getPublicEvents`, `getRegistrations` |
| **Navigation out** | `/events/:id` |

**Functions:** `EventsPage`, `loadEventsData`. Loads the event list and the student's
registrations together, so each card can display an inline **Registered** / **Register**
state without a second round trip. Each call has a graceful degradation path —
`getEvents().catch(() => getPublicEvents())` and `getRegistrations().catch(() => [])` —
so the grid still renders if the session lapses.

**How it connects.** Every card links to `/events/:id` → `EventDetailPage`.

---

### 8.11 EventDetailPage

| | |
|---|---|
| **Route** | `/events/:id` |
| **Size** | 515 LOC |
| **Functions** | **6** (1 component + 5 handlers) |
| **Inline handlers** | 12 |
| **API** | `getEvent`, `getPublicEvent`, `getRegistrations`, `getMe`, `getOAuthAuthorizeUrl`, `registerForEvent`, `cancelRegistration`, `createTeam` (7 distinct) |
| **Navigation out** | `/teams`, `/events` |

**Functions**

| Function | Purpose |
|---|---|
| `EventDetailPage` | The exported component |
| `loadEventAndReg` | Loads the event plus the student's registration state in one pass |
| `requireSession` | If no session exists, starts the Google OAuth redirect instead of failing silently |
| `handleRegister` | Submits the registration, optionally creating a team via `api.createTeam()` |
| `handleCancelRegistration` | Cancels an existing registration |
| `handleCreateTeam` | Creates a team as part of registering for a team-enabled event |

**How it works.** `requireSession` is worth noting: rather than rendering a dead
"please log in" state, the page launches the OAuth flow, so an unauthenticated visitor
lands back on the event they were viewing. Team-enabled events branch the registration
form to collect team details.

**How it connects.** Inbound from `EventsPage`; outbound to `/teams` (team management)
and back to `/events`. This is the only page that can trigger both a registration and a
team creation in a single user action.

---

### 8.12 RegistrationsPage

| | |
|---|---|
| **Route** | `/registrations` |
| **Size** | 166 LOC |
| **Functions** | **3** (1 component + 2 handlers) |
| **Inline handlers** | 2 |
| **API** | `getRegistrations`, `cancelRegistration` |
| **Navigation out** | `/events` |

**Functions:** `RegistrationsPage`, `loadRegistrations`, `handleCancel`.
A compact list of the student's registrations with per-row cancel actions, each linking
back to the originating event.

---

### 8.13 TeamsPage

| | |
|---|---|
| **Route** | `/teams` |
| **Size** | 512 LOC |
| **Functions** | **7** (1 component + 6 handlers) |
| **Inline handlers** | 16 |
| **API (8 calls)** | `getMyTeams`, `getTeamInvitations`, `getEvents`, `removeTeam`, `createTeam`, `inviteToTeam`, `acceptInvitation`, `declineInvitation` |
| **Navigation out** | `/events` |

**Functions**

| Function | Purpose |
|---|---|
| `TeamsPage` | The exported component |
| `loadTeamsData` | Loads owned teams and pending invitations together |
| `handleCreateTeam` | Creates a team for a chosen event |
| `handleInvite` | Invites a student by roll number via `api.inviteToTeam()` |
| `handleAcceptInvite` | Accepts a pending invitation |
| `handleDeclineInvite` | Declines a pending invitation |
| `handleRemoveTeam` | Deletes a team the student owns |

Covers the complete team lifecycle across the two pages: create and invite here,
register-with-a-team in `EventDetailPage`. The event list is fetched so a new team can
be bound to an eligible event.

---

### 8.14 VotingPage

| | |
|---|---|
| **Route** | `/voting` and `/voting/:campaignId` |
| **Size** | 255 LOC |
| **Functions** | **4** (1 component + 3 handlers) |
| **Inline handlers** | 6 |
| **API** | `getVotingCampaigns`, `castVote` |

**Functions**

| Function | Purpose |
|---|---|
| `VotingPage` | The exported component |
| `loadCampaigns` | Fetches campaigns and pre-selects `:campaignId` when the deep link is used |
| `handleOpenVote` | Expands a campaign into its ballot |
| `handleCastVote` | Submits a choice via `api.castVote()` |

Serves both the campaign list and a single deep-linked campaign.

⚠️ **`/voting/:campaignId` is routed but the param is never read.** The file imports
nothing from `react-router-dom` — no `useParams`, no `useNavigate`. A deep link from
the dashboard's "Cast Vote" button, or from `getNotificationDestination`, lands on
exactly the same campaign list and **does not open the ballot**. The route exists, the
destination resolver emits it, and the page ignores it.

---

### 8.15 NotificationsPage

| | |
|---|---|
| **Route** | `/notifications` |
| **Size** | 288 LOC |
| **Functions** | **7** (1 component + 6 handlers) |
| **Inline handlers** | 6 |
| **API** | `getNotifications`, `markNotificationRead`, `markAllNotificationsRead` |
| **Navigation out** | resolves dynamically via `notificationRouting.ts` |

**Functions**

| Function | Purpose |
|---|---|
| `NotificationsPage` | The exported component |
| `loadNotifications` | Loads the first page |
| `handleLoadMore` | Appends the next page (paginated list, not infinite scroll) |
| `handleMarkAllRead` | Marks every notification read |
| `handleMarkSingleRead` | Marks one read and navigates to its destination |
| `handleNotificationClick` | Combines marking-read with destination resolution |
| `getTypeIcon` | Maps a notification type → its icon component |

`handleNotificationClick` is the reason `utils/notificationRouting.ts` exists: it is the
one place that turns a notification into a destination, shared by this page and by
`StudentHeader`.

---

### 8.16 AnnouncementDetailPage

| | |
|---|---|
| **Route** | `/announcements/:id` |
| **Size** | 108 LOC |
| **Functions** | **2** (1 component + 1 loader) |
| **Inline handlers** | 0 |
| **API** | `api.getAnnouncement(id)` |
| **Navigation out** | `/notifications` |

**Functions:** `AnnouncementDetailPage`, `loadAnnouncement`. Fetches one announcement by
`:id` and renders its body with a back link to the notification centre. A pure detail
view — it is always entered from a notification, never linked directly.

---

## 9. Part E — `web`: Utility modules

| Module | File | LOC | Functions | Role |
|---|---|---|---|---|
| `notificationRouting` | `utils/notificationRouting.ts` | 263 | **12** | Notification → route resolution |
| `socialLinks` | `utils/socialLinks.ts` | 156 | **4** | Social URL normalisation |
| `cropImage` | `utils/cropImage.ts` | 94 | **2** | Canvas cropping for `react-easy-crop` |
| `photoStyle` | `utils/photoStyle.ts` | 38 | **1** | Photo container styling |

### 9.1 notificationRouting — the notification→page map

**12 functions**; three are exported.

Exports:
- `getNotificationDestination(notification)` → the target path for a notification
- `isExternalNotificationDestination(destination)` → whether the target is off-site
- `navigateToNotification(notification, navigate)` → resolve-and-go, the single call site
  shared by `NotificationsPage` and `StudentHeader`

Internal helpers: `textValue`, `normalizeExplicitDestination`,
`explicitDestination`, `token`, `idValue`, `encodedId`, `hasKind`, `hasWord`,
`destinationForId`.

The design point: the backend may supply an explicit `destination` field, but the
client also derives one by inspecting the notification's kind and body text
(`hasKind`, `hasWord`) and extracting an identifier (`idValue`, `encodedId`). If the
result points off-site it is flagged external, and callers treat it as an `<a>` rather
than a router push. That is how an email-style announcement with a Drive link behaves
correctly instead of being forced through the SPA router.

### 9.2 socialLinks

**4 functions**: `ok`, `bad`, `normalizeSocialLink`, `normalizeSocialLinkOrNull`. The
first two are the per-field allow/deny predicates that decide whether a given link (say a
`linkedinUrl`) may be set at all; the latter two do the actual parsing and are the only
exports. Powers
`EditProfilePage.applyLink` so a student can paste a GitHub/LinkedIn/website URL in any
of the forms people actually use and still get a clean, validated link. The
`…OrNull` variant returns `null` for unparseable input, letting the caller reject the
save rather than persisting junk.

### 9.3 cropImage & photoStyle

`cropImage` exports `createImage` (load a `File` into an `HTMLImageElement`) and
`getCroppedImg` (render the crop to a canvas and emit a Blob) — the two halves of the
`PhotoCropModal` flow. `photoStyle` exports `getPhotoStyle`, returning the container
styling that keeps avatars correctly cropped at every size.

### 9.4 usePublicVideos — the shared public-video request

`web/src/hooks/usePublicVideos.ts`, 50 LOC, added in the §18 design pass. It wraps
`api.getPublicVideos()` and returns `{ videos, loading, failed }`.

Its reason for existing is **request de-duplication**. `HomePage` features the first
published video in the hero *and* renders `PublicVideoShowcase` below it. When the showcase
owned the fetch, that was two identical `GET /public/videos` calls on every landing-page
load, which is precisely the class of regression §17 set out to remove.

```ts
usePublicVideos(preloaded?: PublicVideosState): PublicVideosState
```

Call it with nothing to own the request, or with a `PublicVideosState` to borrow one a
parent already holds. **Hook order is unconditional either way** — `preloaded` only decides
whether the effect early-returns, so a component that owns the request today and borrows it
tomorrow never reorders hooks. That was the design constraint, not a stylistic choice: the
alternative (conditionally skipping the `useState` triple) would have been the same
Rules-of-Hooks violation as defect #1.

The `cancelled` flag guards the three `setState` calls, so a request that resolves after
unmount does not update a dead component. Guarded by 5 tests in
`web/src/hooks/usePublicVideos.test.ts`, including one asserting the API is **not** called
when a preloaded result is supplied.

---

## 10. Part F — `admin-client`: Shell components

| Component | File | LOC | Functions | Role |
|---|---|---|---|---|
| `App` | `App.tsx` | 308 | **6** + 15 lazy loaders | Navigation hub |
| `Sidebar` | `components/Sidebar.tsx` | 202 | **2** | Primary nav, defines `AdminTab` |
| `AdminHeader` | `components/AdminHeader.tsx` | 374 | **5** + 13 inline | Top bar, bell, theme, account |
| `LoginPage` | `components/LoginPage.tsx` | 130 | **2** | Auth gate |
| `BrandedLoading` | `components/BrandedLoading.tsx` | 72 | **2** | Splash loader |
| `ThemeContext` | `context/ThemeContext.tsx` | 105 | **5** | Theming + user bridge |

### 10.1 App — the admin router

**6 functions:** `App`, `checkAuth`, `retryAuthCheck`, `loadStats`, `handleLogout`,
`PageLoadingFallback` — plus **15 `React.lazy` loaders** for the code-split pages.

`App` holds **10 pieces of state**: `user`, `authChecking`, `authError`, `activeTab`,
`stats`, `statsLoading`, `selectedSubmission`, `selectedStudentId`,
`mobileSidebarOpen`, and the theme-bridge setter.

Its auth logic is deliberately careful. `checkAuth` treats **only 401/403 as
"logged out"**; any other failure (a 500, a network blip) sets `authError` and renders a
**retry screen** instead of silently dropping the admin back to the login page. The
source comment records the bug this fixed: a transient server error used to log
organizers out mid-session.

**Tab dispatch** is 18 conditional blocks inside one `<Suspense>`. Two special cases:
- `students` is a two-level sub-route — `selectedStudentId ? <StudentDetail/> : <StudentsTable/>`
- `SubmissionDetailModal` is rendered at the **root**, outside the tab switch, so it
  floats above whichever tab is active

### 10.2 Sidebar — defines the tab universe

**2 functions:** `Sidebar`, `toggle`. `toggle` collapses/expands a nav group by label.

Exports `ACTIVE_EVENT_ID = 'self-introduction-2026'` (hard-coded) and the 18-member
`AdminTab` union. The seven nav groups and their members:

| Group | Tabs |
|---|---|
| **Overview** | `dashboard` |
| **Students** | `students`, `submissions`, `moderation` |
| **Events** | `events`, `event-registrations` |
| **Voting** | `voting`, `voting-results` |
| **Communications** | `communications`, `email-automation`, `email-history` |
| **Data** | `analytics`, `exports` |
| **System** | `storage`, `roles`, `audit-logs`, `activity`, `settings` |

Every tab is reachable from every other tab through this component. The `user` prop is
declared in `SidebarProps` and passed by `App`, but is **never destructured or
rendered** — dead prop.

### 10.3 AdminHeader

**5 functions:** `AdminHeader`, `updateTime` (1 s interval for the live clock),
`handleClickOutside`, `handleKeyDown` (Escape closes all three dropdowns), and
`getThemeIcon` (returns `Moon` / `Sun` / `Monitor` for the current mode).
**API:** `adminApi.getStats()` — called with **no `eventId`**, reading only
`portal.pendingModeration` to drive the notification badge.
**Navigation out:** `moderation` (×3), `settings` (×1).

Three dropdowns: theme (Light/Dark/System), notifications bell, and the account menu.
`onNavigateTab` and `onLogout` are both optional props, and the dropdown items that use
them are gated on those props existing.

### 10.4 LoginPage

**2 functions:** `LoginPage`, `handleSubmit`. Calls `adminApi.login(username, password)`,
and on `res.success` invokes the `onLoginSuccess(user)` prop. State: `username`,
`password`, `error`, `loading`. This is the **only** username/password form in the
whole monorepo — the student app has none.

### 10.5 ThemeContext

**5 functions:** `AdminThemeProvider` (aliased `ThemeProvider`), `useTheme`,
`getStorageKey`, plus the inner `listener` and the `setTheme` wrapper.
See §4.3 for the dual-purpose `setAdminUser` and the global `dark`-class behaviour.

---

## 11. Part G — `admin-client`: Tab screens

All 18 live tabs. Screens marked **lazy** are code-split behind `React.lazy`.

### 11.1 `dashboard` → StatsDashboard

| | |
|---|---|
| **File** | `components/StatsDashboard.tsx` |
| **LOC** | 379 |
| **Functions** | **1** — the component itself |
| **Inline handlers** | 10 (all navigation) |
| **API** | none — data arrives via the `stats` prop |

**Zero named functions**, yet **10 in-content navigation call sites** — the most
navigable screen in the app. This is deliberate: it is pure presentational, and all
navigation is inline `onClick={() => onNavigateTab('…')}`.

| Target | Call sites |
|---|---|
| `moderation` | 3 (banner CTA, KPI card 2, module button) |
| `students` | 2 (KPI card 1, module button) |
| `events` | 2 (KPI card 3, module button) |
| `voting` | 2 (KPI card 4, module button) |
| `submissions` | 1 (module button) |

**Renders:** welcome banner → "Video Evaluation & Moderation Progress" determinate bar
→ four KPI cards → two-column region with an "Introduction Video Campaign" card
(per-section progress bars) and a "Portal Management Modules" card of five shortcut
buttons, plus a conditional rating-distribution card.

---

### 11.2 `submissions` → SubmissionsTable

| | |
|---|---|
| **File** | `components/SubmissionsTable.tsx` |
| **LOC** | 391 |
| **Functions** | **4** — `SubmissionsTable`, `loadSubmissions`, `handleSearchSubmit`, `handleRowDelete` |
| **Inline handlers** | 12 |
| **API** | `getSubmissions`, `deleteSubmission` |
| **Navigation** | `onSelectSubmission` → opens `SubmissionDetailModal` (tab unchanged) |

`loadSubmissions` is a `useCallback` keyed on all seven filter values
(`activeEventId, page, search, tagFilter, yearFilter, sectionFilter, ratingFilter`).
Paginated at 15 rows. `handleRowDelete` confirms, deletes, then calls
`onRefreshStats()` so the dashboard KPIs stay accurate.

The whole row is clickable, **and** the "Review" button fires the same callback with
`stopPropagation` so the click does not double-fire. 9 state values; 7-column table.

---

### 11.3 `students` → StudentsTable (roster view)

| | |
|---|---|
| **File** | `components/StudentsTable.tsx` |
| **LOC** | 349 |
| **Functions** | **8** — the component plus `toSubmission`, `formatTime`, `studentYearLabel`, `loadStudents`, `handleSearchSubmit`, `handleOpen`, `handleView` |
| **Inline handlers** | 11 |
| **API** | `getStudents`, `getStudentsExportUrl` |
| **Navigation** | `onSelectStudent` → `StudentDetail`; `onSelectSubmission` → modal |

`toSubmission` adapts a roster row into a `Submission` so a student without a video can
still be opened in the shared modal, synthesising a placeholder email and an empty
Drive path. `handleView` prefers `onSelectStudent` and falls back to `handleOpen` — but
since `App` always supplies the callback, the fallback path is dormant.

"Download All Students (Excel)" calls `window.open(url, '_blank')` — a browser tab, not
app navigation. Paginated at 25 rows.

---

### 11.4 `students` → StudentDetail (sub-view) · lazy

| | |
|---|---|
| **File** | `pages/StudentDetail.tsx` |
| **LOC** | **1110 — largest file in either app** |
| **Functions** | **6** — `StudentDetail`, internal sub-component `ItemStatusBadge`, `showToast`, `loadStudent`, `handleRequestChangeSubmit`, `handleDeleteSubmit` |
| **Inline handlers** | 22 |
| **API** | `getStudent`, `requestItemChange`, `deleteStudentItem` |
| **Navigation** | `onBack()` → roster; external link to `/students/:rollNo` |

`loadStudent` is a `useCallback` keyed on `studentId` and returns the **entire
portfolio aggregate in one request** — profile, videos, resumes, achievements,
certificates, and projects. `handleRequestChangeSubmit` requires a non-empty note
before filing; `handleDeleteSubmit` accepts an optional reason and passes it as a
**DELETE request body**.

`pendingChanges` is a derived value, not state: a five-source collector scanning every
collection for `status === 'CHANGES_REQUESTED'`, driving the orange "Pending Revisions"
banner. Ten per-item "Request Revision" / "Delete" button pairs; the revision modal
offers four hard-coded quick-suggestion preset chips. Opens the public profile in a new
tab at `/students/:rollNo` — the one place the admin app links back to the student app.

---

### 11.5 `moderation` → Moderation · lazy

| | |
|---|---|
| **File** | `pages/Moderation.tsx` |
| **LOC** | 381 |
| **Functions** | **5** — `Moderation`, `StatusBadge`, `fetchItems`, `showToast`, `handleDecision` |
| **Inline handlers** | 11 |
| **API** | `getModerationVideos`, `moderationDecision` |
| **Navigation** | **none** — terminal tab |

The most-referenced tab in the app (3 dashboard shortcuts + 3 header shortcuts).
Implements a **cursor-based review queue**: `idx` walks `items`, with Prev / "N of M" /
Next. `handleDecision` supports four actions — approve, reject, request changes, hide —
and requires a reason for the latter three, then removes the item from the queue and
clamps the cursor. A `publishOnApprove` checkbox publishes to the public showcase on
approval.

An IIFE derives the Drive watch URL, treating IDs prefixed `mock_`/`drive_` as
non-Drive. **The queue is intro videos only** — a blue callout directs staff to
`students` for portfolio inspection, since those items are auto-approved.

---

### 11.6 `events` → AdminEvents · lazy

| | |
|---|---|
| **File** | `pages/AdminEvents.tsx` |
| **LOC** | 317 |
| **Functions** | **7** — `AdminEvents`, `StatusBadge`, `CreateEventWizard`, `update`, `handleSubmit`, `fetchEvents` |
| **Inline handlers** | 20 |
| **API** | `getEvents`, `createEvent` |
| **Navigation** | none — terminal tab |

`CreateEventWizard` is a **7-step modal**:
`Basics → Dates → Eligibility → Form → Teams → Notifications → Review`.

`update(k, v)` is the generic form setter shared by every step; `handleSubmit` posts the
whole form then invokes `onCreated()` (→ `fetchEvents`) and `onClose()`.
`fetchEvents` **normalises** the response, mapping `e.name || e.title || 'Untitled Event'`
and defaulting status/type, because the two admin route files return slightly different
shapes.

⚠️ **Step 3 ("Form") is placeholder text** — the registration form builder is not built.
The row-action buttons (Edit / Duplicate / View / Archive) have **no `onClick`
handlers at all** — they are inert.

---

### 11.7 `event-registrations` → EventRegistrations · lazy

| | |
|---|---|
| **File** | `pages/EventRegistrations.tsx` |
| **LOC** | **1312 — largest page file in the monorepo** |
| **Functions** | **12** |
| **Inline handlers** | 35 |
| **API** | `getEvents`, `getRegistrations`, `getTeams`, `updateRegistrationStatus`, `deleteRegistration`, `updateTeamStatus`, `removeTeamMember`, `getRegistrationsExportUrl` |
| **Navigation** | none — terminal tab (Sidebar-only; no shortcut from anywhere) |

**All 12 functions:** `EventRegistrations`, `fetchRegistrations`, `fetchTeams`,
`handleSearchSubmit`, `handleUpdateStatus`, `handleDeleteRegistration`,
`handleUpdateTeamStatus`, `handleConfirmRemoveMember`, `handleExport`,
`handleResetFilters`, `renderStatusBadge`, `renderTeamStatusBadge`.

The only admin page with a **dual view**: `activeView: 'table' | 'teams'` switches
between a registrations table and a team-administration grid. Holds **24 state values**,
including a `stats` object with 8 counters. Three overlays: the detail drawer, the
remove-member dialog, and the view switcher.

`handleUpdateStatus(id, newStatus)` passes `statusNote.trim() || undefined`, so an empty
note is omitted rather than sent as `""`. `handleExport` opens a new browser tab. Page
size 20.

---

### 11.8 `voting` → VotingManagement · lazy

| | |
|---|---|
| **File** | `pages/VotingManagement.tsx` |
| **LOC** | 220 |
| **Functions** | **8** — `VotingManagement`, `StatusBadge`, `CreateCampaignWizard`, `update`, `handleCreate`, `fetchCampaigns`, `handleActivate`, `handleClose` |
| **Inline handlers** | 15 |
| **API** | `getVotingCampaigns`, `createVotingCampaign`, `activateVotingCampaign`, `closeVotingCampaign` |
| **Navigation** | none — terminal tab |

`CreateCampaignWizard` is a **6-step modal**:
`Name & Event → Voting Period → Eligibility → Candidates → Rules → Review`.

⚠️ **Steps 2 and 3 are placeholders** — eligibility rules and candidate selection are
not implemented. Campaign lifecycle is DRAFT → ACTIVE → CLOSED, driven by
`handleActivate` / `handleClose`, each behind a native `confirm()`.

---

### 11.9 `voting-results` → VotingResults · lazy

| | |
|---|---|
| **File** | `pages/VotingResults.tsx` |
| **LOC** | 211 |
| **Functions** | **2** — `VotingResults`, `handleFinalize` |
| **Inline handlers** | 4 |
| **API** | `getVotingCampaigns`, `getVotingResults`, `finalizeVotingResults` |
| **Navigation** | none — terminal tab |

The simplest tab: 2 functions. Auto-selects the first campaign on load. `maxVotes` is
derived to scale the bar widths, and a status banner reads "ready to finalize?" when
`CLOSED` or "Results have been finalized" when `FINALIZED`. `handleFinalize` re-enters
the loading state manually and re-fetches to repaint.

⚠️ It sorts `result.candidates` **in place** during render — a render-phase mutation.

---

### 11.10 `communications` → Communications · lazy

| | |
|---|---|
| **File** | `pages/Communications.tsx` |
| **LOC** | 177 |
| **Functions** | **6** — `Communications`, `ComposeDialog`, `update`, `fetchPreview`, `handlePublish`, `fetchAnnouncements` |
| **Inline handlers** | 12 |
| **API** | `getAnnouncements`, `createAnnouncement`, `getAnnouncementAudiencePreview` |
| **Navigation** | none — terminal tab |

`fetchPreview` fires automatically on every audience change (a `useEffect` on
`form.audience`) to show a live "will reach N students" count.
`handlePublish` runs a client-side required-field guard on title and body before
posting. Note the audience preview **can display a hard-coded 120** if the endpoint
fails, because of the fallback inside `services/api.ts`.

Published announcements surface to students as notifications, which is how they reach
`/announcements/:id`.

---

### 11.11 `email-automation` → EmailAutomation · lazy

| | |
|---|---|
| **File** | `pages/EmailAutomation.tsx` |
| **LOC** | 413 |
| **Functions** | **5** — `EmailAutomation`, `loadData`, `handleToggle`, `handleRunNow`, `handleCreate` |
| **Inline handlers** | 13 |
| **API** | `getEmailAutomations`, `getEmailTemplates`, `toggleEmailAutomation`, `runEmailAutomation`, `createEmailAutomation` |

`loadData(isManual = false)` branches on `refreshing` vs `loading` and issues both
requests in a `Promise.all`, auto-selecting the first template. `handleRunNow` is behind
a `window.confirm` and reports the dispatch count back. Four trigger types are
selectable: `STUDENT_REGISTERED`, `EVENT_REGISTERED`, `CONTENT_APPROVED`,
`DEADLINE_REMINDER`. 14 state values.

---

### 11.12 `email-history` → EmailHistory · lazy

| | |
|---|---|
| **File** | `pages/EmailHistory.tsx` |
| **LOC** | 300 |
| **Functions** | **2** — `EmailHistory`, `loadHistory` |
| **Inline handlers** | 4 |
| **API** | `getEmailHistory` |

Another 2-function tab. Dual view via `activeView: 'runs' | 'logs'` — automation dispatch
batches vs direct email logs — with **client-side** search over both. Three KPI cards;
`totalDispatched` sums every run's `sentCount` plus the log length.

---

### 11.13 `analytics` → Analytics · lazy

| | |
|---|---|
| **File** | `pages/Analytics.tsx` |
| **LOC** | 400 |
| **Functions** | **2** — `Analytics`, `loadAnalytics` |
| **Inline handlers** | 2 |
| **API** | `getAnalytics` |

Purely presentational, deriving six percentage figures from the single response
(`ratingTotal`, `goodPct`, `avgPct`, `poorPct`, `profileRate`, `submissionRate`).
Renders four KPI cards, an evaluation-quality breakdown, submission yield by academic
year, and a six-tile cross-module asset index. No navigation — a terminal tab.

---

### 11.14 `exports` → Exports · lazy

| | |
|---|---|
| **File** | `pages/Exports.tsx` |
| **LOC** | 214 |
| **Functions** | **2** — `Exports`, `handleDownload` (+4 inline `getUrl` arrows) |
| **Inline handlers** | 1 |
| **API** | `getStudentsExportUrl`, `getSubmissionsExportUrl`, `getRegistrationsExportUrl`, `getActivityLogsExportUrl` |

**All four are URL builders, not fetch calls.** `handleDownload` synthesises a detached
`<a download=…>` element, clicks it, and removes it. One state value
(`downloading`) drives the per-card spinner.

The four datasets: Student Master Roster, Video Submissions & Faculty Reviews, Event
Registrations & Team Rosters, Security & Activity Audit Logs. An amber confidentiality
notice precedes the cards because every workbook contains PII.

---

### 11.15 `storage` → Storage · lazy

| | |
|---|---|
| **File** | `pages/Storage.tsx` |
| **LOC** | 395 |
| **Functions** | **5** — `Storage`, `loadStorage`, `handleClearCache`, `handleSyncPermissions`, `formatUptime` |
| **Inline handlers** | 5 |
| **API** | `getStorageStats`, `clearStorageCache`, `ensureDriveViewerPermissions` |
| **Navigation** | none — terminal tab |

`handleSyncPermissions` calls `ensureDriveViewerPermissions()` — the manual trigger for
the same "anyone with the link" grant the backend performs automatically on boot.
`formatUptime` is a pure formatter rendering `2d 4h 12m` / `4h 12m` / `12m 30s`.
7 state values; a six-tile media inventory and a recent-cache directory table.

---

### 11.16 `roles` → RolesPermissions · lazy

| | |
|---|---|
| **File** | `pages/RolesPermissions.tsx` |
| **LOC** | 411 |
| **Functions** | **4** — `RolesPermissions`, `loadRoles`, `handleAssign`, `handleCreateRole` |
| **Inline handlers** | 10 |
| **API** | `getRoles`, `assignRole`, `createRole` |
| **Navigation** | none — terminal tab |

`handleCreateRole` normalises the identifier before sending:
`.trim().toUpperCase().replace(/\s+/g, '_')`. `handleAssign` triggers on `onChange`
only when a non-empty role is chosen, so selecting the "Default" option does nothing.

⚠️ The **Module Authorization Matrix is hard-coded** — an 8-row local array, not read
from the backend. The `RolePermissionItem` type exists in `types/index.ts` but is never
rendered. `adminApi.updateRole()` is declared and never called.

---

### 11.17 `audit-logs` → AuditLogs · lazy

| | |
|---|---|
| **File** | `pages/AuditLogs.tsx` |
| **LOC** | 296 |
| **Functions** | **4** — `AuditLogs`, `fetchLogs`, `handleSearch`, `handleExport` |
| **Inline handlers** | 8 |
| **API** | `getActivityLogs`, `getActivityLogsExportUrl` |
| **Navigation** | none — terminal tab |

⚠️ **Critically: this and `ActivityLogView` (§11.18) are two independent
implementations of the same `GET /admin/api/activity-logs` endpoint**, differing in
props, filter vocabulary, table columns, and search behaviour:

| | `AuditLogs` | `ActivityLogView` |
|---|---|---|
| Scope | **whole portal** — `eventId` deliberately not sent | scoped to `activeEventId` |
| Search | **submit-gated** (excluded from the effect deps) | **live**, fires per keystroke |
| Category filter | 5 options | 7 options (missing `DATABASE`, which the badge map supports) |
| Status filter | 3 options | 4 options (adds `INFO`) |
| Columns | Timestamp, Category, Action, Operator, Outcome, Context | Status, Category, Timestamp, Action, Details, User |
| `applicationsToday` KPI | **stored but never rendered** | rendered |
| Dark mode | full support | light-mode classes only |

### 11.18 `activity` → ActivityLogView (eager, not lazy)

| | |
|---|---|
| **File** | `components/ActivityLogView.tsx` |
| **LOC** | 433 |
| **Functions** | **5** — `ActivityLogView`, `fetchLogs`, `handleResetFilters`, `getStatusBadge`, `getCategoryBadge` |
| **Inline handlers** | 7 |
| **API** | `api.getActivityLogs` (via the `api` alias) |

Renders all five KPI cards including `applicationsToday`, which `AuditLogs` drops.
`fetchLogs` is a `useCallback` whose deps include `searchQuery`, which is why search
fires live. The only admin component importing the `api` alias rather than `adminApi` —
same object.

### 11.19 `settings` → Settings · lazy

| | |
|---|---|
| **File** | `pages/Settings.tsx` |
| **LOC** | 306 |
| **Functions** | **4** — `Settings`, `loadSettings`, `handleChange`, `handleSave` |
| **Inline handlers** | 13 |
| **API** | `getSettings`, `updateSettings` |
| **Navigation** | none, but it is a **shortcut target** from `AdminHeader` |

`handleChange(key, value)` is a generic immutable setter called at **8 sites**.
`handleSave` is bound **twice** — as the header button's `onClick` *and* as the form's
`onSubmit`. Dirty-tracking compares `JSON.stringify(settings)` against
`originalSettings`.

Settings seeded with 8 hard-coded defaults before load. Three sections: Institutional
Identity, Media Upload Thresholds, Security & Auth Domain (including
`allowed_email_domain`, which governs Google SSO rejection, and `auto_approve_projects`).

⚠️ `loadSettings` assigns the **same object reference** to both `settings` and
`originalSettings`, so the dirty check cannot detect a change until the next load.

---

## 12. Part H — Orphaned / dead components

The `web` side is resolved — see §6.2, where all ten orphaned components were either
deleted or revived onto the landing page. On the admin side, **three of the four** orphans
were confirmed waste and deleted; **one survives as the spec for the routing work.**

| File | LOC | Status |
|---|---|---|
| `pages/Students.tsx` | 12 | **Deleted** |
| `pages/EventConfiguration.tsx` | 66 | **Deleted** |
| `components/layout/AdminLayout.tsx` | 99 | **Deleted** |
| `pages/EmailTemplateEditor.tsx` | 101 | **Live, read-only** — kept, see below |

**Why they went.** `Students.tsx` was an 11-line wrapper rendering `<StudentsTable>` with
`onSelectSubmission={() => {}}`, a no-op stub that omitted `onSelectStudent` — so wiring it
would have opened the submission modal instead of `StudentDetail`, a latent behavioural
difference from the live wiring. `EventConfiguration.tsx` was a read-only event list
shadowed by `AdminEvents`, typed `any[]` instead of `EventItem[]`. `AdminLayout.tsx` is
the decisive evidence that the admin app is not routed: it was the **only file in the
entire admin tree that imported `react-router-dom`** (`Outlet`, `Link`, `useLocation`) and
the only one with 14 real `<Link to=…>` anchors — a pre-`activeTab` layout superseded by
`Sidebar` + `AdminHeader`. `main.tsx` has no `<BrowserRouter>`, so mounting it would have
**thrown** `useLocation() may be used only in the context of a <Router>`, and its
`MENU_ITEMS` listed 14 routes that do not exist in the live app.

**`EmailTemplateEditor.tsx` is not dead** and is no longer counted here. It is reachable
from the admin shell and, despite its name, entirely read-only: a template list plus a
detail pane showing subject, merge variables, and body. No save path exists in the API
layer, which remains a real gap (defect #31).

**Note on `react-router-dom` in `admin-client`.** Deleting `AdminLayout` removed the last
import, which is why the dependency briefly looked unused. It is now on the critical path
for planned Phase H work: `Sidebar.tsx`'s 7 `navGroups` and its 18-key `AdminTab` union are
the spec for replacing the 18-branch conditional-render state machine in `App.tsx` with
real routes. Until then it stays declared.

---

## 13. Complete navigation graph

### 13.1 `web` — student navigation

**Primary nav** (identical lists in `StudentSidebar` and `MobileBottomNav`):

```
Dashboard   → /dashboard
Profile     → /profile
Edit Profile→ /profile/edit
Portfolio   → /portfolio (tabs: projects | achievements | certificates)
Intro Video → /intro-video
Resume      → /resume
Events      → /events
Teams       → /teams
Voting      → /voting
Notifications → /notifications
```

**Cross-page edge map** (who links to whom, beyond the sidebar):

| From | → | Mechanism |
|---|---|---|
| `HomePage` | `/students` | `handleSearch` — hands off the query string |
| `HomePage` | Google OAuth | `handleSignIn` — full browser redirect |
| `Navbar` / `HeroSection` | `/students`, `/dashboard`, `/profile` | `<Link>` |
| `StudentDirectoryPage` | `/students/:rollNo` | card link |
| `PublicStudentProfilePage` | `/students/:rollNo/resume` | resume link |
| `DashboardPage` | **10 routes** | `loadData` + cards — the authenticated hub |
| `ProfilePage` | `/profile/edit`, `/portfolio`, `/intro-video`, `/resume` | action cards |
| `EditProfilePage` | `/profile` | post-save |
| `EventDetailPage` | `/teams`, `/events` | team panel, back |
| `RegistrationsPage` | `/events` | per-row |
| `TeamsPage` | `/events` | team creation target |
| `VotingPage` | `/voting/:campaignId` | route param, same component |
| `NotificationsPage` | dynamic | `notificationRouting` |
| `StudentHeader` | `/dashboard`, `/notifications`, `/profile`, `/profile/edit` | dropdown |
| `AnnouncementDetailPage` | `/notifications` | back |
| `VideoPage` | public showcase | `handleTogglePublish` → appears on `/` |

### 13.2 `admin-client` — tab transitions

**Universal:** every tab reaches every other tab through the `Sidebar`. `AdminHeader`
adds shortcuts to `moderation` (×3) and `settings` (×1).

**In-content edges:**

| From | Callback | → Target |
|---|---|---|
| `StatsDashboard` | `onNavigateTab` ×10 | `moderation` ×3, `students` ×2, `events` ×2, `voting` ×2, `submissions` ×1 |
| `AdminHeader` | `onNavigateTab` ×4 | `moderation` ×3, `settings` ×1 |
| `SubmissionsTable` | `onSelectSubmission` | `SubmissionDetailModal` (tab unchanged) |
| `StudentsTable` | `onSelectStudent` | `StudentDetail` (same tab) |
| `StudentsTable` | `onSelectSubmission` | `SubmissionDetailModal` |
| `StudentDetail` | `onBack` | `StudentsTable` (same tab) |
| `StudentDetail` | `<a target="_blank">` | `/students/:rollNo` — the public profile |
| `SubmissionDetailModal` | `onClose` / `onUpdated` / `onDeleted` | dismiss + `loadStats()` |

**15 terminal tabs** with no outbound navigation at all: `moderation`,
`event-registrations`, `voting`, `voting-results`, `communications`, `email-automation`,
`email-history`, `analytics`, `exports`, `storage`, `roles`, `audit-logs`, `activity`,
`settings`, and the `students` roster. Each is reachable **only** via the `Sidebar`.

**Tabs with no inbound shortcut** (Sidebar-only): `event-registrations`,
`voting-results`, `communications`, `email-automation`, `email-history`, `analytics`,
`exports`, `storage`, `roles`, `audit-logs`, `activity`.

### 13.3 Cross-application links

Only two exist:

1. `admin StudentDetail` → `/students/:rollNo` (public profile, new tab)
2. `web VideoPage` publish toggle → video appears on the public `HomePage` showcase

---

## 14. API surface reference

### 14.1 `web` — 55 methods

| Group | Methods |
|---|---|
| Auth/OAuth | `getOAuthAuthorizeUrl`, `getMe`, `logout` |
| Video | `submitVideo`, `submitVideoStream`, `getVideoBlobUrl`, `getVideoStreamUrl`, `getVideoDownloadUrl`, `setVideoPublic`, `deleteVideo` |
| Profile | `getProfile`, `updateProfile`, `uploadProfilePhoto`, `submitChangeRequest`, `updateSkills` |
| Projects | `getProjects`, `createProject`, `updateProject`, `deleteProject`, `reorderProjects`* |
| Achievements | `getAchievements`, `createAchievement`, `updateAchievement`, `deleteAchievement` |
| Certificates | `getCertificates`, `uploadCertificate`, `setCertificatePublic`, `deleteCertificate` |
| Resume | `getResume`, `uploadResume`, `deleteResume` |
| Events | `getEvents`, `getEvent`, `registerForEvent`, `getRegistrations`, `cancelRegistration` |
| Teams | `getMyTeams`, `createTeam`, `inviteToTeam`, `getTeamInvitations`, `acceptInvitation`, `declineInvitation`, `removeTeam` |
| Voting | `getVotingCampaigns`, `castVote` |
| Notifications | `getNotifications`, `markNotificationRead`, `markAllNotificationsRead` |
| Announcements | `getAnnouncement` |
| Public | `getPublicStudents`, `getPublicSkills`, `getPublicStudent`, `getPublicEvents`*, `getPublicEvent`, `getPublicVideos` |

\* declared but never called by any **live** page. Three more join `reorderProjects` on
that list: `submitVideo`, `getVideoStreamUrl`, and `getVideoDownloadUrl`.

Two further notes on this table:

- **`getPublicEvent(id)` is genuinely live** — it is the unauthenticated fallback in
  `EventDetailPage`'s `getEvent(id).catch(() => getPublicEvent(id))` chain, which is what
  lets a logged-out visitor read an event page. It is the only public API method not
  reached from the `/students` public section.
- **`getPublicEvents()` (the list, no id) is only called from dead code**
  (`EliteEventsSection`). No live page fetches the public event list; the live `/events`
  page is student-only, so an anonymous visitor has no reachable event *index* even
  though the per-event fallback exists.

### 14.2 `admin-client` — 65 methods

| Group | Methods |
|---|---|
| Auth | `login`, `logout`, `getMe` |
| Stats | `getStats` |
| Events | `getEvents`, `createEvent` |
| Submissions | `getSubmissions`, `getSubmission`, `updateReview`, `updateRating`, `updateStatus`, `deleteVideo`, `requestNewVideo`, `deleteSubmission`, `getMediaUrl` |
| Visibility | `setVideoPublic` |
| Students | `getStudents`, `getStudent`, `getStudentsExportUrl` |
| Student items | `requestItemChange`, `deleteStudentItem` |
| Moderation | `getModerationVideos`, `getModerationResumes`, `getModerationAchievements`, `getModerationCertificates`, `moderationDecision` |
| Voting | `getVotingCampaigns`, `createVotingCampaign`, `activateVotingCampaign`, `closeVotingCampaign`, `getVotingResults`, `finalizeVotingResults` |
| Announcements | `getAnnouncements`, `createAnnouncement`, `getAnnouncementAudiencePreview` |
| Registrations | `getRegistrations`, `getRegistration`, `updateRegistrationStatus`, `deleteRegistration`, `getRegistrationsExportUrl` |
| Teams | `getTeams`, `updateTeamStatus`, `removeTeamMember` |
| Analytics | `getAnalytics` |
| Storage | `getStorageStats`, `clearStorageCache`, `ensureDriveViewerPermissions` |
| Email | `getEmailAutomations`, `createEmailAutomation`, `toggleEmailAutomation`, `runEmailAutomation`, `getEmailHistory`, `getEmailTemplates` |
| Roles | `getRoles`, `createRole`, `updateRole`*, `assignRole` |
| Settings | `getSettings`, `updateSettings` |
| Exports | `getSubmissionsExportUrl`, `getActivityLogsExportUrl` |
| Change requests | `getChangeRequests`*, `approveChangeRequest`*, `rejectChangeRequest`* |

\* declared but never called by any page.

---

## 15. Function count master table

### 15.1 `web` — pages

| Page | Route | LOC | Fn | Inline | API | Total |
|---|---|---|---|---|---|---|
| HomePage | `/` | 249 | 3 | 1 | 1 | 4 |
| StudentDirectoryPage | `/students` | 440 | 2 | 27 | 2 | 29 |
| PublicStudentProfilePage | `/students/:rollNo` | 457 | 1 | 10 | 1 | 11 |
| PublicResumeViewerPage | `/students/:rollNo/resume` | 119 | 1 | 4 | 1 | 5 |
| DashboardPage | `/dashboard` | 642 | 3 | 6 | 10 | 9 |
| ProfilePage | `/profile` | 741 | 4 | 9 | 6 | 13 |
| EditProfilePage | `/profile/edit` | 602 | 9 | 20 | 5 | 29 |
| PortfolioPage | `/portfolio/*` | 70 | 1 | 0 | 0 | 1 |
| VideoPage | `/intro-video` | **970** | **16** | 16 | 4 | 32 |
| ResumePage | `/resume` | 320 | 4 | 7 | 3 | 11 |
| EventsPage | `/events` | 203 | 2 | 3 | 4 | 5 |
| EventDetailPage | `/events/:id` | 515 | 6 | 12 | 7 | 18 |
| RegistrationsPage | `/registrations` | 166 | 3 | 2 | 2 | 5 |
| TeamsPage | `/teams` | 512 | 7 | 16 | 8 | 23 |
| VotingPage | `/voting` | 255 | 4 | 6 | 2 | 10 |
| NotificationsPage | `/notifications` | 288 | 7 | 6 | 3 | 13 |
| AnnouncementDetailPage | `/announcements/:id` | 108 | 2 | 0 | 1 | 2 |
| ProjectsTab | `/portfolio` | 352 | 6 | 12 | 4 | 18 |
| AchievementsTab | `/portfolio` | 328 | 6 | 11 | 4 | 17 |
| CertificatesTab | `/portfolio` | 357 | 6 | 11 | 4 | 17 |

The four **public** pages alone total **49 functions across 4 files** — 4 components,
3 named handlers, and 42 inline arrows, spread over just 6 `useEffect` hooks. The
inline-arrow dominance is the story: this codebase leans heavily on anonymous render
callbacks and `.then`/`.catch`/`.finally` chains rather than named, testable functions.
There is not a single `useCallback` or `useMemo` in any of the four.

**Totals: 20 files · 93 named functions · 179 inline arrows · 272 functions**

### 15.2 `web` — components & utils

Dead files are marked ☠. The ☠ rows are dead code that still compiles, type-checks, and
ships in the production bundle.

| File | LOC | Fn | Status |
|---|---|---|---|
| `App.tsx` | 237 | 6 | live |
| `StudentLayout` | 44 | 1 | live |
| `StudentSidebar` | 83 | 1 | live |
| `StudentHeader` | 359 | 6 | live |
| `MobileBottomNav` | 163 | 1 | live |
| `PhotoCropModal` | 269 | 7 | live |
| `Navbar` | 252 | 15 | live — all 4 public pages |
| `Footer` | 25 | 1 | live — all 4 public pages |
| `PublicVideoShowcase` | 158 | 6 | live — `HomePage` only |
| `BrandedLoading` | 65 | 2 | live — 14 consumers |
| `ThemeContext` | 64 | 4 | live, but both providers are stubs |
| `StudentDashboard` | 665 | 13 | ☠ dead — 665 LOC |
| `StudentLogin` | 44 | 2 | ☠ dead |
| `HeroSection` | 156 | 2 | ☠ dead |
| `EliteEventsSection` | 160 | 8 | ☠ dead |
| `StudentShowcaseSection` | 182 | 9 | ☠ dead |
| `IntroVideoFeatureSection` | 114 | 2 | ☠ dead |
| `PortalFeaturesSection` | 113 | 2 | ☠ dead |
| `PortfolioArchitectureSection` | 150 | 2 | ☠ dead |
| `AboutSidebar` | 70 | 1 | ☠ dead |
| `GuidelinesSection` | 65 | 1 | ☠ dead |
| `notificationRouting` | 263 | 12 | live — 3 consumers |
| `socialLinks` | 156 | 4 | live — `EditProfilePage` |
| `cropImage` | 94 | 2 | live — `PhotoCropModal` |
| `photoStyle` | 38 | 1 | live — 3 public pages |

**Totals: 25 files · 97 named functions (55 live, 42 dead)** — of which
**1,719 LOC and 42 functions are dead weight shipped in the bundle.**

### 15.3 `admin-client` — all screens

| Screen | Tab | LOC | Fn | Inline |
|---|---|---|---|---|
| `App` | — | 308 | 6 | 19 |
| `Sidebar` | — | 202 | 2 | 3 |
| `AdminHeader` | — | 374 | 5 | 13 |
| `LoginPage` | — | 130 | 2 | 4 |
| `BrandedLoading` | — | 72 | 2 | 1 |
| `ThemeContext` | — | 105 | 5 | 0 |
| `StatsDashboard` | `dashboard` | 379 | 1 | 10 |
| `SubmissionsTable` | `submissions` | 391 | 4 | 12 |
| `StudentsTable` | `students` | 349 | 8 | 11 |
| `StudentDetail` | `students` ⤷ | **1110** | 6 | 22 |
| `Moderation` | `moderation` | 381 | 5 | 11 |
| `AdminEvents` | `events` | 317 | 7 | 20 |
| `EventRegistrations` | `event-registrations` | **1312** | **12** | 35 |
| `VotingManagement` | `voting` | 220 | 8 | 15 |
| `VotingResults` | `voting-results` | 211 | 2 | 4 |
| `Communications` | `communications` | 177 | 6 | 12 |
| `EmailAutomation` | `email-automation` | 413 | 5 | 13 |
| `EmailHistory` | `email-history` | 300 | 2 | 4 |
| `Analytics` | `analytics` | 400 | 2 | 2 |
| `Exports` | `exports` | 214 | 2 | 1 |
| `Storage` | `storage` | 395 | 5 | 5 |
| `RolesPermissions` | `roles` | 411 | 4 | 10 |
| `AuditLogs` | `audit-logs` | 296 | 4 | 8 |
| `ActivityLogView` | `activity` | 433 | 5 | 7 |
| `Settings` | `settings` | 306 | 4 | 13 |

**Totals: 26 files · 110 named functions · 253 inline handlers**

### 15.4 Grand totals

| | Files | Functions | of which dead | API methods |
|---|---|---|---|---|
| `web` | 45 | 369 | **42** (10 files, 1,719 LOC) | 55 |
| `admin-client` | 26 | 363 | 0 | 65 |
| **Total** | **71** | **732** | **42** | **120** |

Split for the 20 `web` **page** files (§15.1), where named and inline were tallied
separately: **93 named + 179 inline arrows = 272 functions**. The component and utility
files in §15.2 report a single combined figure, so per-column totals are not meaningful
across the whole repo — hence the combined column here.

**~1,700 LOC of the `web` bundle (10 files, 42 functions) is dead code that no import
ever reaches** — 10 of 45 component/util files, or 22% by file count. See §6.2 and §12.

---

## 16. Defects, gaps and risks

**41 issues** as originally recorded, ordered by section rather than severity. The three
that would actually be felt by a user were **#8** (a routed deep link that silently does
nothing), **#9** (three page titles showing the wrong text), and **#1** (a Rules-of-Hooks
violation that is one refactor away from crashing).

### 16.0 Status ledger

Sixteen of the 41 are now resolved. The rows below are left **as originally written** so
the original diagnosis stays auditable; this table is the authority on what still stands.

| # | Resolution |
|---|---|
| 1 | **Fixed.** Early return hoisted below the hooks in `SubmissionDetailModal` |
| 2 | **Fixed.** `originalSettings` is now a structural clone, so the dirty check sees a change |
| 3 | **Fixed.** `VotingResults` sorts a copy |
| 5 | **Fixed.** The hard-coded `{ count: 120 }` fallback is gone; `GET /admin/api/announcements/preview` returns a real count. This was masking the announcement-audience bug |
| 7 | **Resolved by deletion.** `AdminLayout` and its `useLocation()`-outside-a-`<Router>` throw went with the file |
| 8 | **Fixed.** `VotingPage` now reads its `:campaignId` param. Guarded by 51 tests in `notificationRouting.test.ts`, which also cover the N1 open-redirect fix |
| 9 | **Fixed.** The `'/video'` key typo is gone and the three sub-path titles resolve |
| 11 | **Resolved.** 3 of the 4 deleted. `EmailTemplateEditor` reclassified as **live** (reachable from the shell), not dead — see §12 |
| 14 | **Fixed.** `adminApi.getMe()` propagates instead of swallowing. This also un-deadened `App.tsx`'s "Retry" screen, which had been unreachable: a resolved promise means the caller's error branch can never run |
| 18 | **Resolved by deletion.** `StudentDashboard` removed |
| 19 | **Fixed.** `applicationsToday` is now the fifth KPI card on `AuditLogs` |
| 20 | **Resolved.** 9 of the 10 deleted, `GuidelinesSection` revived onto the landing page — see §6.2 and §18 |
| 21 | **Resolved by deletion.** The duplicate `MAX_VIDEO_MB = 25` went with `StudentDashboard`; 25 MB is now served from `limits.service.ts` |
| 23 | **Resolved by deletion.** `EliteEventsSection` and its `#login-section` anchor are gone |
| 26 | **Deliberately kept.** `PhotoCropModal.onCropSave` is dormant but functional, so it was left in place rather than deleted |
| 40 | **Fixed.** `@types/react-router-dom@^5.3.3` removed from **both** frontends. `react-router-dom@6.30.6` ships its own `./dist/index.d.ts`, so the v5 stub was a two-major shadow with no effect; `tsc --noEmit` stayed clean in both apps after removal, confirming it was inert |

**Two bugs found *while* fixing the load performance are not in the original 41** because
they post-date the audit. Both are now regression-tested:

- The OAuth callback path returned early after persisting the token and never called
  `getMe()`, which hung every SSO login on "Verifying Student Session". Self-inflicted,
  caught on re-read, fixed.
- `adminApi.getMe()` is the same class of bug as #14 but on the login path.

**Still open** — the remaining 25, unchanged: 4, 6, 10, 12, 13, 15, 16, 17, 22, 24, 25, 27,
28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 41. Defects **32-35** are all facets of the
admin app having no URLs, and clear together in Phase H. Defect **27** (both `web` theme
contexts are stubs, so the student portal has no working light/dark switch) is the largest
remaining single gap.

### 16.1 Correctness

| # | Issue | Where | Severity |
|---|---|---|---|
| 1 | `if (!submission) return null` sits **above 15 `useState` + 2 `useEffect`** — a Rules-of-Hooks violation, safe only because `App` never renders the modal with `null` | `SubmissionDetailModal.tsx:88` | High |
| 2 | `loadSettings` assigns the **same object reference** to `settings` and `originalSettings`, so the dirty-check cannot detect a change until the next load | `Settings.tsx:32` | Medium |
| 3 | `result.candidates` is sorted **in place during render** | `VotingResults.tsx:159` | Medium |
| 4 | AdminEvents row actions (Edit / Duplicate / View / Archive) have **no `onClick`** — inert buttons | `AdminEvents.tsx:302-305` | Medium |
| 5 | `getAnnouncementAudiencePreview` falls back to a **hard-coded `{ count: 120 }`**, so the "will reach N students" hint can silently lie | `admin-client/src/services/api.ts` | Medium |
| 6 | `createEvent`/`moderationDecision`/voting methods are called with defensive `?.` even though they always exist | 6 admin pages | Low |
| 7 | `AdminLayout` would **throw** if mounted — `useLocation()` with no `<Router>` ancestor | `AdminLayout.tsx:30` | Low (dead) |
| 8 | **`/voting/:campaignId` never reads its param.** `VotingPage` imports nothing from `react-router-dom` — no `useParams`, no `useNavigate`. The route exists, `notificationRouting` emits the deep link, and the page silently ignores it, so a student arriving from a "vote now" notification lands on the campaign list instead of their ballot | `VotingPage.tsx` | High |
| 9 | **Page-title lookup matches the wrong key on 3 of 15 paths.** `pageTitles` resolves via first-match `startsWith`, so `/profile/edit` shows "My Profile", the three `/portfolio/*` sub-tabs show "Portfolio Showcase", and `/intro-video` shows "Student Dashboard" (the map declares `'/video'`, which is not a live route — a plain key typo). All three correct titles are already written and simply unreachable | `StudentHeader.tsx:14-46` | Medium |

### 16.2 Duplication & dead code

| # | Issue |
|---|---|
| 10 | **Two independent implementations of the same endpoint** — `AuditLogs` and `ActivityLogView` both consume `GET /admin/api/activity-logs` with different scopes, filters, columns, and search behaviour (§11.17) |
| 11 | **4 orphaned components** — `Students`, `EventConfiguration`, `EmailTemplateEditor`, `AdminLayout` (101 lines of dead code) |
| 12 | `react-router-dom` is an **unused runtime dependency** in `admin-client/package.json` — its only import is in dead `AdminLayout` |
| 13 | `Sidebar` declares a `user` prop that `App` passes and the component never uses |
| 14 | `getMe()` swallows all errors, collapsing server faults into "not authenticated" |
| 15 | `adminApi.updateRole` and the three change-request methods are declared but never called |
| 16 | `RolePermissionItem` type exists; the RBAC matrix UI is a hard-coded array instead |
| 17 | `ActivityLogView` filters support 7 categories but offer 6 — `DATABASE` is missing from the dropdown while the badge map handles it |
| 18 | `StudentDashboard` (665 LOC, 13 functions) is superseded by the routed `VideoPage` but retained |
| 19 | `AuditLogs` stores `applicationsToday` and never renders it |
| 20 | **10 dead `web` components totalling 1,719 LOC** — the retired marketing landing page (§6.2). They still call `getPublicStudents`, `getPublicEvents`, and `getOAuthAuthorizeUrl`, so any `api.` audit over `web/src/components` over-reports the live surface |
| 21 | `StudentDashboard` hard-codes `MAX_VIDEO_MB = 25`, **conflicting with the limit `VideoPage` actually enforces** — the repo holds two different answers to "how large may an intro video be" |
| 22 | 4 API methods are declared with no caller: `submitVideo`, `getVideoStreamUrl`, `getVideoDownloadUrl`, `reorderProjects` |
| 23 | `EliteEventsSection.scrollToLogin` targets `#login-section`, **an anchor that does not exist anywhere in the codebase** |
| 24 | `NavbarProps.onNavigate` is declared but never destructured — dead prop |
| 25 | `MobileBottomNav` declares `useNavigate()` and never uses it |
| 26 | `PhotoCropModal`'s `onCropSave` prop is never called |
| 27 | **Both `web` theme contexts are stubs.** Each is typed `{ theme: 'light' }` with no setter, and each provider hard-codes `value={{ theme: 'light' }}`. `usePublicTheme`/`useStudentTheme` are indirection with no runtime effect — **the student portal has no working light/dark switch**, unlike the admin app. The providers' only real job is stripping any stray `dark` class from `<html>`/`<body>` |
| 28 | `CertificatesTab` is **read-only with no edit path**, while its siblings `ProjectsTab` and `AchievementsTab` both support full create/edit/delete — an inconsistency in the same tab strip |

### 16.3 Incomplete features

| # | Issue |
|---|---|
| 29 | `CreateEventWizard` step 3 (registration form builder) is placeholder text |
| 30 | `CreateCampaignWizard` steps 2–3 (eligibility rules, candidate selection) are placeholders |
| 31 | `EmailTemplateEditor` is read-only — no create/edit/save path exists in the API layer |

### 16.4 Navigation & UX

| # | Issue |
|---|---|
| 32 | The admin app has **no URLs, no deep links, and no browser history** — a refresh always returns to `dashboard` |
| 33 | **13 of 18 admin tabs are Sidebar-only**, with no in-content entry point |
| 34 | **15 admin tabs are terminal** — no outbound navigation whatsoever |
| 35 | Every `setActiveTab` clears `selectedStudentId`, collapsing `StudentDetail` back to the roster |
| 36 | `web`'s Vite dev proxy covers only `/api`; the backend also mounts admin academic-year routes under `/admin/api` and `/api/admin`, which have no dev proxy entry |
| 37 | `handleView` in `StudentsTable` has a fallback branch that is unreachable because `App` always supplies `onSelectStudent` |

### 16.5 Build & configuration

| # | Issue |
|---|---|
| 38 | `web/package.json` lacks an `allowScripts` entry for `esbuild@0.25.12` (admin-client has it) — builds work, but npm warns on every install |
| 39 | `backend`'s `postinstall` recursively installs both frontends, so `npm install` there is heavier than it looks |
| 40 | `admin-client` carries an unused `react-router-dom` dependency plus `@types/react-router-dom` |
| 41 | `AdminEvents` defines a local `EventItem` interface distinct from the shared one in `types/index.ts`; `EventConfiguration` uses `any[]`; `StudentDetail` types its whole state as `any` — 29 well-defined types in `types/index.ts` are largely unused |

### 16.6 Operational note

Starting the admin app or the backend in dev triggers Drive permission grants on a
**live** Google Workspace account. `Storage` exposes this as a manual "Sync Viewer
Access" button, and the backend performs the same grant automatically on boot. Dev
startup therefore has real external side effects.

---

## 17. Load performance

There is **no server-side rendering** anywhere in this project. Both frontends are
pure client-side SPAs: the backend serves a static `index.html` shell (1.1 KB) and a
JS bundle, and every page is rendered in the browser. A page therefore cannot be
"slow because the server rendered it" — the delay is always in what the browser must
fetch and execute before it can paint.

Four things stood between the shell and first paint. All four are fixed.

### 17.1 The auth gate blocked every page, including public ones

`AuthWrapper` in `web/src/App.tsx` gated the *entire* route tree on
`GET /student/me`. A visitor with no session cannot get anything but a 401 from that
call, so the public home page, the student directory, public profiles, public resumes
and public events all opened behind a full-screen "Verifying Student Session" loader
that lasted a full network round trip.

The gate now applies only to the protected subtree:

- **No stored token** → definitively signed out. The app renders immediately and
  **makes no request at all** (`planSessionBootstrap` returns
  `needsVerification: false`).
- **Stored token** → the protected routes wait behind the loader; public routes render
  straight away.
- **OAuth callback** (`?token=…`) → the token is persisted, stripped from the address
  bar, and then verified. It is *not* treated as already-verified.

The last point was a bug introduced by the first two and is the reason
`captureTokenFromUrl` and `planSessionBootstrap` are separate functions: returning
early after persisting the token left `authChecking` true forever and hung every SSO
login on the loading screen.

The decision logic lives in `web/src/utils/sessionBootstrap.ts`, deliberately outside
React so it can be tested directly. `App.tsx` only wires up the effects.

### 17.2 Render-blocking third-party fonts

Both `index.html` files linked the Google Fonts stylesheet from `<head>`:
`fonts.googleapis.com`, two families, ~14 weight/style variants. A stylesheet link in
`<head>` is render-blocking, so first paint waited on a third-party round trip — and
if that host was slow or unreachable (a realistic outcome on a campus network) the
page painted *nothing* until the request failed.

The fonts are now self-hosted and bundled by Vite:

- `tools/vendor-fonts.py` downloads the woff2 files and emits `src/fonts.css`.
- 6 files, 136 KB total, versus 22 `@font-face` rules. Google serves these families
  as **variable** fonts — one file per (family, style) covers the whole weight axis —
  so the naive "one file per weight" approach wrote 22 rules pointing at 6 identical
  files. The script keys on (family, style, subset) and declares the real weight range.
- Only the `latin` and `latin-ext` subsets are kept. `unicode-range` plus
  `font-display: swap` means a browser fetches only the subsets it renders.
- The built HTML now references **no external host at all**.

### 17.3 Every navigation flashed a full-screen loader

All portal pages are `React.lazy` chunks. The single `<Suspense>` boundary sat above
the route tree, so navigating anywhere replaced the whole viewport with
`<BrandedLoading>` — header, sidebar and all — for the duration of the chunk fetch.

`StudentLayout` now has its own boundary around its `<Outlet>`. The nearest boundary
wins, so the chrome stays put and only the content area swaps to a loading state.

### 17.4 Hashed assets were revalidated on every visit

`express.static` was mounted with no cache options, so the 238 KB main chunk and every
font file were revalidated with an `ETag` round trip on each page load. Vite
content-hashes everything in `assets/`, and a new build always produces new
filenames, so a cached copy cannot be stale. Those are now served
`max-age=31536000, immutable`; everything unhashed (`index.html`, favicons,
`public/` assets) revalidates so a deploy still takes effect.

The policy is in `backend/src/config/staticAssets.ts` and is covered by
`backend/tests/static.assets.cache.test.ts`.

> **Trap worth recording.** The obvious implementation is a `setHeaders` hook that sets
> `Cache-Control` by hand. It silently does nothing: the `send` module behind
> `express.static` emits its `headers` event *first* and then **overwrites**
> `Cache-Control` with a value derived from its own `maxAge` option. Only the
> `maxAge`/`immutable` options survive.

### 17.5 Admin: a swallowed error made the retry screen unreachable

Not a latency issue, but found while checking the auth paths. `adminApi.getMe()`
wrapped its request in `try/catch` and returned `{ authenticated: false }` on *any*
failure. Two consequences:

1. A 500 or a dropped connection became indistinguishable from being signed out, so a
   transient server error discarded a valid session.
2. Because the caller received a resolved promise, its error branch could never run —
   the "Unable to verify your session / Retry" screen in `admin-client/src/App.tsx`
   was dead code.

`getMe` now lets the rejection propagate. `admin-client/src/services/api.test.ts`
pins the contract.

### 17.6 What was already fine

Worth recording so these are not "fixed" later:

- **Data fetching is already parallel.** Pages with several requests use
  `Promise.all` (e.g. `TeamsPage` fetches teams, invitations and events together;
  `EventDetailPage` fetches the event and registrations together). The remaining
  sequential `await`s are mutations followed by a reload, which must be sequential.
- **In-page loading states already avoid the full-screen pattern.** 20 call sites use
  `<BrandedLoading fullScreen={false} />`, so data loading is scoped to the content
  area.
- **Compression is already on** (`compression` at level 1) for JSON, text, and static
  assets; video responses are correctly excluded.
- **Route-level code splitting is already in place** for every page.

### 17.7 Remaining known cost

The main chunk is 238 KB (80 KB gzipped) and must download and parse before first
paint. The practical next steps, in order of value:

1. **Prerender or inline the public home page's above-the-fold markup.** The public
   pages have no dynamic data, so their shell could ship as static HTML.
2. **Trim the main chunk.** React, React Router and axios are the bulk; axios alone
   could be replaced with `fetch` for the many simple GETs.
3. **Raise the compression level for `assets/` only.** Level 1 is a deliberate choice
   for shared cores; with a one-year immutable cache the extra CPU is spent once per
   unique asset, so level 6 is affordable now that assets are cached.

---

## 18. Public landing page design pass

The only genuine landing page in the monorepo is `/`. The student portal is product UI and
the admin app is a dashboard, so neither is a landing-page surface; this pass is scoped to
`HomePage`, its two section components, and the visible copy of the other three public
pages.

### 18.1 Design read and dials

| | |
|---|---|
| **Read** | Institutional public landing page for a department's self-introduction programme. Primary audience is the department's own students signing in; secondary is visitors, recruiters, and faculty |
| **Mode** | **Redesign — preserve.** The brand (rose `ELITE` wordmark, indigo primary), the Sora / Plus Jakarta Sans pairing, the token system in `index.css`, the routes, and the nav labels were all kept. Levers 1-4 plus a hero recomposition |
| **Dials** | `DESIGN_VARIANCE 4` · `MOTION_INTENSITY 3` · `VISUAL_DENSITY 5` |

`DESIGN_VARIANCE 4` sits just under the anti-centre-bias threshold, which is why the hero
moved to a split but the events band stayed centred. `MOTION_INTENSITY 3` means hover and
press states only, with no scroll choreography — and that is honest rather than a cop-out,
because claiming a higher value without shipping the motion is worse than not claiming it.
A `prefers-reduced-motion` block in `index.css` collapses every transition regardless.

**On design systems.** The skill's first instinct is to install an official package
(USWDS, GOV.UK, Carbon) rather than hand-roll component CSS. That was rejected here for a
concrete reason: `index.css` *is* a working design system, with a documented token set, an
8px card radius, a Bootstrap-grid compatibility layer, and three `elite-*` component
classes already consumed by roughly 200 files. Swapping the public surface to USWDS would
have put two design systems in one tree and violated the "one system per project" rule in
the other direction. The public pages now use those existing `elite-*` classes instead of
open-coding Tailwind.

### 18.2 What was actually wrong

The old `/` was a **login screen wearing a landing page's clothes**. Concretely:

| Defect | Evidence |
|---|---|
| **No value proposition** | `h1` was `ELITE STUDENT PORTAL` in all caps at `font-black`. The subtext was `Sasi Institute of Technology & Engineering (Autonomous)` — the institution *name*, which is a fact, not a reason to care. A first-time visitor could not tell what the site contained |
| **No visual in the hero** | The only real content, the video showcase, sat below the fold. The hero was text, a button, and a search box |
| **Everything centred** | `text-center` on `main`, then a single centred `max-w-xl` column |
| **A "or" hairline divider** | Separating the two CTAs with a rule and the word "or" — a dated pattern doing no work |
| **The search box competed with the CTA** | A full card inside the hero, pushing the primary action down |
| **The events link was an orphan button** | A lone centred `Link` floating under everything, which is not a section |
| **`min-h-screen`** | Fixed viewport units rather than `100dvh`, which jumps on mobile as the address bar collapses |
| **Unlabelled input** | The search field had a placeholder and no `<label>`, so it had no accessible name |
| **Em-dashes in rendered copy** | 5 instances of `—`/`–` on the public surface, including a bare `'—'` used as a "no value" placeholder in two `formatDate` helpers |
| **Spinner, not skeleton** | `Loader2` spinning in a bordered box where a video card would be |

### 18.3 What changed

**`HomePage.tsx`** — 132 → 244 LOC. Five sections, each a distinct layout family:

1. **Hero**, split `6/6`. Headline *"Meet the department, one student at a time."* (7
   words, 2 lines at `text-5xl`), an 18-word value proposition, `Student Sign In` +
   `Browse directory`, and the `@sasi.ac.in` note. No eyebrow — the navbar already carries
   the institution name, so repeating it above the fold was redundant. Right column holds
   the **first published video**, or a fallback with two working links when nothing is
   published yet (the normal pre-approval state, not an error).
2. **Search band**, its own section, with a real `<label for>` and a 13px helper line.
3. **Video showcase**, handed the hero's fetch result.
4. **Guidelines**, the revived section.
5. **Events band**, a real section rather than an orphan button.

**`usePublicVideos.ts`** (new) — lifts the `/public/videos` request out of
`PublicVideoShowcase` so the hero and the showcase can share it. Without this the landing
page would fire **two identical requests per load**, which is exactly the kind of regression
the load-performance work in §17 existed to prevent. Hook order is unconditional; the
`preloaded` argument only decides whether the effect owns the request, so a component
switching between owning and borrowing never reorders hooks.

**`PublicVideoShowcase.tsx`** — now accepts `videos` / `loading` / `failed`. Dropped its
`Public Showcase` eyebrow (eyebrow budget is 2 across 4 sections; it was the templated
small-caps tell). Spinner replaced with a skeleton matching the final card shape. Card
radius normalised from `rounded-2xl` to `rounded-lg`, matching the 8px token the rest of
the app uses — the showcase was the outlier. Subtitle em-dash removed.

**`GuidelinesSection.tsx`** — revived. Three cards in a row plus a full-width conduct band
instead of four equal cards, which is the banned template shape. Content was correct
already; only the composition and the `60–90` en-dash changed.

**Copy fixes** — `PublicResumeViewerPage` (`{name} — Resume` → `{name}, resume`),
`StudentDirectoryPage` (`1–50` range → `1 to 50`), and both `formatDate` helpers
(`'—'` → `'To be announced'`, which is also more honest: an event genuinely may not have a
date yet).

### 18.4 Verification

`tsc --noEmit` clean in all three workspaces. `vite build` clean. **324 tests pass** (230
backend / 87 `web` / 7 `admin`), up from 312. New coverage:

- `usePublicVideos.test.ts` (5) — pins the single-request invariant, the failure path, and
  the no-set-state-after-unmount guarantee.
- `HomePage.test.tsx` (7) — a jsdom render smoke test. With no browser attached to this
  session, this is the substitute for visual verification: it confirms the page renders
  without throwing, the headline is no longer the product name, the value proposition is
  present, the search input has an accessible name, the sign-in label appears exactly once,
  and the "or" divider is gone.

Contrast was checked by hand against WCAG: `#4F46E5` on white is **6.29:1** for primary
buttons, `#475569` on `#F7F8FC` is **7.26:1** for body copy, and the `#64748B` helper text
is **4.76:1** — all above AA.

### 18.5 What was deliberately not done

- **No image generation.** No image tool is available in this environment. The hero's real
  visual is student video content from the database, which is honest, but campus or
  department photography would improve it further at two placements: the hero right column
  (as a fallback beneath the video) and the events band. Nothing was faked to cover the gap
  — no CSS mockups, no hand-drawn SVG stand-ins.
- **No routing changes.** `GuidelinesSection` was revived *into* the existing `/` page
  rather than given its own route, because new routes and nav entries need sign-off.
- **No new dependencies.** `motion` / `framer-motion` are not installed and the dials did
  not call for them; `lucide-react` was kept since the project already depends on it.
- **No dark mode.** The site is light-only by design and was not made worse. The theme
  contexts are still stubs — that is defect #27, still open.
- **No sweep of the student-portal copy.** `VideoPage` and `ProfilePage` still contain
  em-dashes and bare `'—'` no-value placeholders. Those pages are product UI, explicitly
  out of scope for a landing-page pass, and rewriting signed-in screens would be an
  unreviewed change to a much larger surface. The one exception is fixed:
  `api.ts`'s upload error message (`Network error — check your connection`) is reachable
  from the public pages, so it was reworded. A portal-wide copy pass is worth scheduling
  alongside defect #27.

### 18.6 Remaining public-surface work

1. **Phase H** — real routing in `admin-client` (defects #32-35).
2. **Defect #27** — the stub theme contexts. The highest-value single fix left.
3. **Prerender the public routes** and trim the 238 KB main chunk, written up in §17.7.
