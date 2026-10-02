# REDESIGN PROGRESS

Append-only execution log for implementing `REDESIGN_PLAN.md`.

**Rules for this file**
- Written by the orchestrator only. Subagents never append here (parallel appends race).
- One section per batch, appended in order. Never edit a past entry except to correct a factual error.
- Every subagent gets an explicit file allowlist and an explicit "edit nothing else" instruction.
- One owner per file, ever. If two batches need the same file, they run serially.

---

## Decisions (locked with user before B0)

| # | Decision | Choice | Consequence |
|---|---|---|---|
| 1 | Palette conflict | **Plan palette exactly** — ELITE red `#C41230` → rose scale, brand `red-600` `#E11D48`, slate neutrals | SASI red `#ED1E26` and **ELITE navy `#041030` are removed**. Navy filled `--text`, `--accent`, `--surface-inverse`, `--border-inverse`; those roles become slate. Full visual shift in `web` **and** `admin-client`. |
| 2 | Fonts | **Google Fonts CDN**, 4 families | `web/src/fonts/**` (Sora, Plus Jakarta Sans) and `web/src/fonts.css` retired for `web` only. `tools/vendor-fonts.py` still used by `admin-client`. 10 faces over CDN. |
| 3 | Dependencies | **All 6 approved** | `react-image-crop` replaces `react-easy-crop` → `PhotoCropModal.tsx` + `utils/cropImage.ts` migrate in B6-W2. `react-pdf` needs pdfjs worker wiring. |
| 4 | Uncommitted WIP | **Committed as baseline** | `43f7f83` — clean diff for everything after. |
| 5 | Progress log | **This file, in repo** | Survives restarts, reviewable in PRs. |

**Overridden AGENTS.md rules, by explicit user instruction:** §6.4 "do not change fonts or
vendored font files" (decision 2), §2.1 "no new dependencies without asking" (decision 3).
All other AGENTS.md rules remain in force.

---

## Batch map

| Batch | Scope | Agents | Depends on |
|---|---|---|---|
| B0 | Baseline commit, deps, this log | orchestrator | — |
| B1 | Tokens + typography swap | 1 | B0 |
| B2 | `lib/` + `hooks/` core | 1 | B1 |
| B3 | UI primitives | 5 parallel | B2 |
| B4 | App shell / navigation | 1 | B3 |
| B5 | Data layer → React Query | 1 | B4 |
| B6 | 14 pages, 4 waves | 3+3+3+2 parallel | B5 (previous wave) |
| B7 | Admin client token sync | 1 | B1 |
| B8 | Verification | orchestrator, on request only | all |

---

## B0 — Baseline, dependencies, log

**Status: in progress**

### B0.1 — Baseline commit — DONE
- Verified the 47-file working set contained no `.env`, `backend/storage/`, roster, or key material.
- Staged explicit paths only: `AGENTS.md`, `REDESIGN_PLAN.md`, `shared/tokens.css`,
  `tools/build-tokens.mjs`, `admin-client/src`, `admin-client/tailwind.config.js`,
  `web/src`, `web/tailwind.config.js`.
- Commit `43f7f83` — "chore: baseline UI redesign pass before REDESIGN_PLAN implementation".
- Rollback point established. Nothing from B1 onward touches this commit.

### B0.2 — Dependency install — DONE
Approved set installed into `web/`:

| Package | Version | Note |
|---|---|---|
| `framer-motion` | `^13.5.0` | peer `react ^18 \|\| ^19` — satisfied |
| `@radix-ui/react-dialog` | `^1.1.23` | |
| `@radix-ui/react-dropdown-menu` | `^2.1.24` | |
| `@radix-ui/react-progress` | `^1.1.16` | |
| `@radix-ui/react-switch` | `^1.3.7` | |
| `@radix-ui/react-tabs` | `^1.1.21` | |
| `@radix-ui/react-tooltip` | `^1.2.16` | |
| `@tanstack/react-query` | `^5.104.0` | |
| `cmdk` | `^1.1.1` | |
| `canvas-confetti` | `^1.9.4` | |
| `react-image-crop` | `^11.1.2` | replaces `react-easy-crop` in B6-W2 |
| `react-pdf` | `^9.2.1` | **pinned from `^11`** — see blocker 1 |

`react-pdf@11` declares `peer react@^19`; the repo is on `react@18.3.1`, so the first install
ERESOLVE'd. Upgrading to React 19 is out of scope (it would ripple through `react-router-dom@6`,
`react-easy-crop` and every component). `react-pdf@9.x` is the React 18 line and pulls
`pdfjs-dist@4.8.69`.

`react-easy-crop` is **retained** until B6-W2 migrates `PhotoCropModal.tsx`; removing it early
would break the build.

**Known latent risk — `canvas`:** `pdfjs-dist@4.8.69` lists `canvas@^3.0.0-rc2` as an
**optional** dependency, used only for Node-side rendering and guarded out of browser bundles by
pdfjs itself. Its native install script was blocked by npm's `allowScripts`, so no binding is
built. Should be inert for Vite. If the B6-W2 build complains about `canvas`, the fix is a Vite
resolve alias to an empty module — do **not** run `node-gyp`.

**Not acted on:** `npm audit` reports 7 vulnerabilities in `web` (1 critical, 1 high, 5 moderate).
Remediation requires `npm audit fix --force`, which breaks the dependency tree. Out of scope,
flagged only.

### B0.3 — This log — DONE

---

## B1 — Tokens + typography swap

**Status: in progress** · agent: 1 · commit: `43f7f83` + working tree

**Why this blocks everything:** every later batch renders on these tokens.

**File allowlist:** `shared/tokens.mjs`, `shared/tokens.css` (generator output only),
`shared/tailwind-preset.mjs` (generator output only), `web/tailwind.config.js`,
`web/index.html`, `web/src/index.css`, `web/src/fonts.css` (delete), `web/src/fonts/**` (delete).

**Hard constraints given to the agent**
- `shared/tokens.css` is a generated file (source `shared/tokens.mjs`). Never hand-edit; use
  `npm run tokens`.
- Preserve every token name the plan does not define — `status-{draft,pending,review,approved,rejected,changes}`
  plus `-bg` and `-solid`, `award-{gold,bronze}`, `overlay-scrim`, `brand-ring`, `brand-soft-text`,
  `surface-inverse`, `border-inverse`, `text-inverse`. Deleting one breaks moderation UI.
- Dark mode: `:root` light + `[data-theme='dark']` and `.dark` overrides, generated from `tokens.mjs`,
  values taken from the plan's two semantic tables rather than invented.
- Do not run build, tests, or verification scripts — that is B8.

**Audit requested (report-only, no fixes in this batch):** hardcoded hex in class strings;
references to the removed navy ramp; references to the retired Sora / Plus Jakarta stack; and
`dark:` Tailwind variants, which violate the repo's documented contract that components read
semantic tokens and never branch on theme.

**Gate:** orchestrator reviews the token diff before B3–B7 start.

### B1 results
_pending_

---

## B2 — Core `lib/` + `hooks/`

**Status: pending**

`web/src/lib/{cn,motion,theme}.ts`, `web/src/hooks/{useTheme,useCommandPalette,useReducedMotion}.ts`.
`motion.ts` carries the named variants from `REDESIGN_PLAN.md` Appendix C. `cn.ts` wraps the
already-installed `clsx` + `tailwind-merge`.

---

## B3 — UI primitives

**Status: pending** · 5 agents, fully parallel, disjoint file sets

| Agent | Files |
|---|---|
| A | `Button`, `Card`, `Badge`, `Tag`, `Chip`, `Avatar` |
| B | `Input`, `Textarea`, `Select`, `ProgressBar`, `StepIndicator` |
| C | `Modal` (desktop + mobile bottom-sheet), `ConfirmDialog`, `Lightbox` |
| D | `Toast`, `ToastProvider`, `Skeleton`, `Tabs` |
| E | `FileUploadZone`, `VideoPlayer`, `SwipeCard` |

Every component: all states, all variants, reduced-motion variant, focus-visible ring, no raw hex.
Existing `web/src/components/ui/{Dialog,ConfirmDialog,Skeleton,EmptyState,ErrorState,ProgressSteps}.tsx`
are superseded — the agent owning that slot migrates rather than duplicates.

---

## B4 — App shell / navigation

**Status: pending** · 1 agent

`Sidebar`, `BottomTabBar`, `TopBar`, `ThemeToggle`, `CommandPalette`, `NavItem`, `PageTransition`,
`AppLayout`, `MoreSheet`, plus `web/src/App.tsx` route wiring and route-level code splitting (§9.2).

`App.tsx` and `StudentLayout.tsx` are single-owner files — never written in parallel.

---

## B5 — Data layer → React Query

**Status: pending** · 1 agent, serial

`QueryClientProvider` in `main.tsx`; migrate `web/src/services/*` and `hooks/usePublicVideos.ts`
off raw axios to stale-while-revalidate. Touches every page, so it runs alone, after the shell.

---

## B6 — Pages

**Status: pending** · 4 waves, parallel within wave

| Wave | Agent 1 | Agent 2 | Agent 3 |
|---|---|---|---|
| W1 | `DashboardPage` | `ProfilePage` + public profile | `PortfolioPage` |
| W2 | `EditProfilePage` (+ `react-image-crop` migration, drop `react-easy-crop`) | `VideoPage` | `ResumePage` (+ `react-pdf`) |
| W3 | `EventsPage` + `EventDetailPage` + `RegistrationsPage` (+ confetti) | `TeamsPage` | `VotingPage` (+ `SwipeCard`) |
| W4 | `NotificationsPage` | `SettingsPage` + `LoginPage` | — |

`web/src/pages/public/**` (`PublicStudentDirectoryPage`, `PublicEventsPage`,
`PublicEventDetailPage`, `PublicAnnouncementPage`) are split by directory, not by the plan's
page list — assigned per wave to whichever agent owns the matching private page.

`REDESIGN_PLAN.md` §2.4 puts backend changes out of scope. If a page needs an endpoint that does
not exist, the agent stops and reports it as a blocker rather than inventing one.

---

## B7 — Admin client token sync

**Status: pending** · 1 agent

`admin-client/tailwind.config.js` + hardcoded hex → token classes. **No layout, UX, animation or
navigation change** (`REDESIGN_PLAN.md` §12). The rose palette lands here too, which is a larger
colour shift than the plan's "add the red tonal scale" wording implies.

---

## B8 — Verification

**Status: pending** · orchestrator, **only on explicit request**

`npm run build:web`, narrow vitest files, `npm run verify:tokens`, `check:contrast`,
`check:utilities`, Lighthouse. Not run automatically after any batch.

---

## Open blockers

| # | Blocker | Status |
|---|---|---|
| 1 | `react-pdf@11` needs React 19 | **resolved** — pinned `react-pdf@^9.2.1` |
| 2 | `canvas` native binding unbuilt (optional pdfjs dep) | open, low risk — only bites if the Vite build tries to bundle it |
| 3 | 7 `npm audit` vulnerabilities in `web` | open, out of scope — needs `--force`, would break the tree |
