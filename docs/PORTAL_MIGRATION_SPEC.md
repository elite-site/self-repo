# Portal rewrite — migration spec

Binding spec for the admin-client and student-portal UI rewrite. Every agent
working on the portal reads this file and follows it exactly. If this document
and a task prompt disagree, this document wins.

**STATUS: active.** Do not start page migration until §0 is green in both apps.

---

## 0. The design system is already built. Do not rebuild it.

| File | What it is |
|---|---|
| `shared/tokens.mjs` | **The single source of truth.** Palette, semantic themes, type, radius, motion, layers, elevation, brand metadata, and the contrast table. |
| `shared/tokens.css` | **GENERATED.** Do not edit. Regenerate with `npm run tokens`. |
| `shared/tailwind-preset.mjs` | The Tailwind `theme.extend` both apps spread into their config. |
| `tools/check-contrast.mjs` | Contrast gate. 21 pairs, all AA. Run it; do not lower a floor. |
| `tools/build-icons.mjs` | Icon/favicon generator. Run with `npm run icons`. |

Both `web/tailwind.config.js` and `admin-client/tailwind.config.js` are now
three-line wrappers over the shared preset. There is no per-app palette any
more. **If you need a colour that is not in the tokens, you do not need a
colour — you need a semantic token that already exists, or you need to add one
to `shared/tokens.mjs` and flag it.**

### 0.1 Where the palette came from

Measured from the shipped brand marks, not chosen by taste:

- `assets/sasi logo.png` → `#ED1E26` red — **primary**
- `assets/elite logo.png` → `#041030` navy — **accent / dark neutral**

The previous indigo `#4F46E5` primary has no basis in either logo and is gone.
`#4F46E5`, `#E11D48`, `#4338CA`, `#0F172A`, `#F7F8FC` and `#94A3B8` are all
**legacy**. If you see one in a file you own, it is a bug you are here to fix.

### 0.2 Two AA facts that will bite you

- `text-ink-muted` (`#6B7688`) is **4.59:1** on white. It is the *floor* for
  body text. The old `#94A3B8` was **2.42:1** and failed outright.
- `bg-brand` (`#CE1119`) is the solid-button fill, **not** `#ED1E26`. The pure
  brand red on white is 4.36:1 and fails for body-size text. `#ED1E26` is for
  large marks and borders only.

---

## 1. The token contract

### 1.1 Semantic colours — use these, and only these

Tailwind colour group → utility → CSS variable.

| Group | Utilities | Use for |
|---|---|---|
| `surface` | `bg-surface`, `bg-surface-canvas`, `bg-surface-raised`, `bg-surface-sunken`, `bg-surface-inset`, `bg-surface-inverse` | every background |
| `edge` | `border-edge`, `border-edge-strong`, `border-edge-inverse` | every border and divide |
| `ink` | `text-ink`, `text-ink-secondary`, `text-ink-muted`, `text-ink-inverse`, `text-ink-brand` | every text colour |
| `brand` | `bg-brand`, `bg-brand-hover`, `bg-brand-active`, `bg-brand-soft`, `bg-brand-soft-text`, `bg-brand-ring` | primary action fill, brand tint |
| `accent` | `bg-accent`, `bg-accent-hover` | the secondary emphasis (navy) |
| `status` / `status-bg` | `text-status-approved`, `bg-status-bg-approved`, … | the six workflow states |
| `focus` | `ring-focus`, `border-focus` | focus affordances |

Raw ramps `red-*`, `navy-*`, `neutral-*` exist for the rare case that needs one
specific step (a chart series, a brand asset). Prefer semantic tokens.

### 1.2 Component classes — prefer these over ad-hoc class strings

Defined in `shared/tokens.css`. They are real, they are themed, they have
hover/press/focus/disabled states already correct.

```
.surface                 card: surface + border + 8px radius
.surface-sunken          recessed panel

.btn                     base button: 8px radius, 600 weight, 14px, press-scale
.btn-primary             solid brand fill, white text
.btn-secondary           surface fill + border
.btn-ghost               transparent fill, low-emphasis action
.btn-danger              destructive fill

.input .select .textarea form controls: themed border, brand focus ring,
                         aria-invalid="true" state
.label                   13px/600 field label
.hint                    12px muted helper text
.error-text              12px validation message

.badge                   pill: 12px/600, full radius
.badge-draft .badge-pending .badge-review
.badge-approved .badge-rejected .badge-changes
.badge-brand             brand tint pill

.page-enter              route-change content entrance (280ms)
.skeleton                static-pulse loading placeholder
```

**Tailwind purges unused `@layer components` classes.** That is intentional
tree-shaking, but it means a component class only reaches the bundle once
something uses it. If you write `.btn-primary` into a page, it ships.

### 1.3 Non-colour scales

| Scale | Tokens |
|---|---|
| radius | `rounded-sm` 4px, `rounded` / `rounded-md` 6px, `rounded-lg` 8px (cards + buttons — the default), `rounded-xl` 12px (modals), `rounded-full` (pills + avatars only) |
| type | `text-headline-xl/lg/md/sm`, `text-body-lg/md/sm`, `text-label-lg/md/sm` |
| spacing | `p-header` (4rem), `p-rail`, `p-content`, `p-gutter`, `p-gutter-mobile` |
| width | `max-w-canvas` (1440px), `max-w-prose` (65ch) |
| elevation | `shadow-card`, `shadow-card-hover`, `shadow-raised`, `shadow-drawer`, `shadow-modal`, `shadow-focus` |
| layer | `z-base`, `z-raised`, `z-sticky`, `z-overlay`, `z-modal`, `z-toast`, `z-skip-link` |

**Shape lock:** `rounded-lg` (8px) for cards and buttons, `rounded-full` for
circular media affordances only, `rounded-xl` for modals. Do not introduce
`rounded-2xl`, `rounded-3xl`, or a bespoke radius. Do not introduce a bespoke
shadow.

### 1.4 Motion

`MOTION_INTENSITY: 3` — hover, press and state feedback. No scroll
choreography, no parallax, no looping ambient animation, no page-transition
theatre.

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 0ms | reduced-motion collapses here |
| `duration-fast` | 120ms | hover, colour |
| `duration-base` | 200ms | state change, small popovers |
| `duration-slow` | 280ms | page content enter, drawer |
| `duration-slower` | 360ms | full modal |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | colour, opacity |
| `ease-entrance` | `cubic-bezier(0.22, 1, 0.36, 1)` | things arriving |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | things leaving |
| `ease-press` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | active/press |

Rules:
- Animate **`transform` and `opacity` only**. Never `width`, `height`, `top`,
  `left`, `margin`, `box-shadow` on a hover.
- Replace `transition-all` with the specific property: `transition-colors`,
  `transition-transform`, `transition-opacity`.
- Press feedback is `active:scale-[0.98]` with `transition-none`, so it lands on
  the same frame as the touch.
- Gate hover transitions behind pointer capability where you would otherwise
  make touch devices sticky-hover.
- `shared/tokens.css` owns a global `prefers-reduced-motion` block that collapses
  every duration. **You do not need a JS guard for motion.**

### 1.5 Dark mode

Theming contract: **a component reads semantic tokens and never writes a
`dark:` variant.** That is the whole point — it is what lets the admin client
delete its `!important` override wall.

- `data-theme="dark"` on `<html>` (and `.dark` is also accepted, for
  compatibility with the admin pages still being migrated).
- If you find yourself wanting `dark:`, you want a semantic token instead.
- Do **not** add a hardcoded dark colour to "fix" a contrast issue.

---

## 2. Mechanical migration table

Left column is what exists today. Right column is what it becomes. This is the
bulk of the work — most files are a find-and-map, not a redesign.

### 2.1 Colours

| Legacy | Replace with |
|---|---|
| `bg-[#F7F8FC]`, `bg-[#F8FAFC]`, `bg-slate-50`, `bg-neutral-50` | `bg-surface-canvas` |
| `bg-white`, `bg-surface-card`, `bg-[#FFFFFF]` | `bg-surface` |
| `bg-[#F1F5F9]`, `bg-gray-50` (inset/panel) | `bg-surface-sunken` |
| `bg-[#F9FAFB]` (table header) | `bg-surface-inset` |
| `bg-[#0F172A]`, `bg-[#1E293B]` (navy chip) | `bg-surface-inverse` |
| `border-[#E4E7F2]`, `border-slate-200`, `border-neutral-200`, `border-gray-200` | `border-edge` |
| `border-[#CBD5E1]`, `border-gray-300` | `border-edge-strong` |
| `text-[#0F172A]`, `text-slate-900`, `text-neutral-900`, `text-gray-900` | `text-ink` |
| `text-[#475569]`, `text-slate-600`, `text-neutral-700` | `text-ink-secondary` |
| `text-[#94A3B8]`, `text-slate-400`, `text-gray-500` | `text-ink-muted` |
| `text-[#4F46E5]`, `text-indigo-600`, `text-[#4338CA]` | `text-ink-brand` |
| `bg-[#4F46E5]`, `bg-indigo-600` | `bg-brand` |
| `hover:bg-[#4338CA]`, `hover:bg-indigo-700` | `hover:bg-brand-hover` |
| `bg-[#E11D48]`, `bg-rose-600` | `bg-accent` |
| `bg-[#4F46E5]/10`, `bg-indigo-50`, `bg-primary-pale` | `bg-brand-soft` |
| `text-white` on any brand/accent fill | `text-on-primary` |
| `bg-emerald-50 text-emerald-700` | `badge badge-approved` |
| `bg-amber-50 text-amber-700` | `badge badge-pending` |
| `bg-purple-50 text-purple-700` | `badge badge-review` |
| `bg-rose-50 text-rose-700` | `badge badge-rejected` |
| `bg-orange-50 text-orange-700` | `badge badge-changes` |
| `bg-slate-100 text-slate-600` | `badge badge-draft` |
| `text-white` on `bg-slate-900` | `text-ink-inverse` on `bg-surface-inverse` |

### 2.2 Magic numbers

| Legacy | Replace with |
|---|---|
| `h-[65px]`, `h-16`, `65px` header height | `h-header` |
| `h-[calc(100vh-65px)]`, `pt-[65px]` | `pt-header` / `min-h-[calc(100vh-var(--header,4rem))]` |
| `min-h-screen` on a page wrapper | `min-h-[100dvh]` (mobile browser chrome) |
| `z-[60]`, `z-[70]`, `z-[9999]` | `z-modal`, `z-toast`, `z-skip-link` |
| `max-w-[1400px]` | `max-w-canvas` |
| `shadow-[0_8px_30px_rgba(0,0,0,0.12)]` | `shadow-modal` or `shadow-raised` |

### 2.3 Motion

| Legacy | Replace with |
|---|---|
| `transition-all duration-150` | `transition-colors duration-fast` |
| `duration-300` / `duration-500` on hover | `duration-fast` (120ms). Hover does not need 500ms. |
| `animate-in fade-in duration-200` | `animate-fade-in` |
| `animate-in zoom-in-95 duration-200` | `animate-scale-in` |
| `animate-in slide-in-from-bottom-4` | `animate-slide-in-up` |
| `animate-in slide-in-from-right-4` | `animate-drawer-in` |
| `animate-in slide-in-from-left-4` | `animate-slide-in-left` |

The `animate-in …` family was **dead CSS** — `tailwindcss-animate` was never
installed, so 20 modals and drawers were hard-cutting to open. That is fixed;
use the shared `animate-*` keyframes in `shared/tokens.css`.

### 2.4 Structure

| Legacy | Replace with |
|---|---|
| `bg-white border border-[#E4E7F2] rounded-lg shadow-card` | `surface` |
| a long button class string | `btn btn-primary` / `btn btn-secondary` / `btn btn-ghost` |
| `rounded-full` on a square-ish card | `rounded-lg` |

---

## 3. Rules that are not negotiable

1. **Never introduce a hex colour.** Not in a class, not in a `style` object,
   not in an SVG `fill`. If a token does not exist, say so in your report and
   move on — do not invent one.
2. **Never introduce a `dark:` variant.** Semantic tokens already re-theme.
3. **Preserve all behaviour exactly.** Same props, same API calls, same event
   handlers, same loading/error/empty states, same accessibility attributes,
   same `aria-*`/`role`. You are changing presentation, not logic. If you find
   a genuine logic bug, report it, do not fix it silently.
4. **Do not delete a feature.** No removing a button, a field, a filter, a
   column, or a route because it looks like cruft. If something is genuinely
   dead, report it in your findings with evidence.
5. **No em-dashes in visible copy.** Use a comma, a full stop, or parentheses.
   Also no `—` placeholders in date/empty strings: say `To be announced`.
6. **Loading, empty and error states are first-class.** Every async region
   needs all three, and they should look designed rather than accidental. A
   spinner is not an empty state. Prefer `.skeleton` shaped like the content it
   replaces.
7. **Accessibility is a requirement, not a polish item.** Every icon-only
   button needs an accessible name. Every form field needs a real `<label>`.
   Every modal needs `role="dialog"` + `aria-modal` + a label. Focus must stay
   visible on every interactive element (the global `:focus-visible` rule
   handles this if you do not override `outline`).
8. **Touch targets ≥ 44px** for anything a student taps on a phone.
9. **Do not commit, do not `git add`.** Leave everything in the working tree.
10. **Do not run `npm install`.** Dependencies are fixed.
11. **Do not edit any file outside your assigned list** (§6). Other agents are
    working in the same tree, concurrently, on disjoint files.
12. **Do not run `npm run build` or `vite build`.** Ten agents writing at once
    will fight over `dist/`. The orchestrator builds once at the end.

---

## 4. Verification

Run these **for your files only**:

```bash
# typecheck — NOTE: other agents are editing concurrently, so this WILL report
# errors in files you do not own. Verify only that YOUR files produce no errors.
cd web && npx tsc --noEmit          # or: cd admin-client && npx tsc --noEmit

# tests scoped to your files
cd web && npx vitest run src/pages/DashboardPage
```

`npx tsc --noEmit` exits non-zero while any sibling file is mid-edit. That is
expected during the migration and is **not** a failure of your work. Read the
error list, confirm every path it names is either yours or obviously another
agent's in-flight file, and report that.

Do **not** try to fix an error in a file you do not own. Report it.

---

## 5. Reporting

Finish with a compact report:

- **Files changed**, and for each: lines before → after.
- **Tokens adopted**: how many legacy hexes / arbitrary values you removed.
  Give the count, it is the headline number.
- **Component classes adopted**: which of `.btn-*`, `.surface`, `.badge-*`,
  `.input` you used and roughly how many times.
- **Motion**: which `animate-*` you added or repaired.
- **Blockers / findings**: dead code, logic bugs, missing states, a11y gaps,
  a token you needed that does not exist. Be specific and cite `file:line`.
  Do not fix out-of-scope things.
- **Verification**: what you ran and what it reported.

---

## 6. Ownership

| Agent | Owns |
|---|---|
| web-chrome | `StudentLayout`, `StudentHeader`, `StudentSidebar`, `MobileBottomNav`, `Navbar`, `Footer`, `BrandedLoading`, `PublicVideoShowcase` |
| web-profile | `DashboardPage`, `ProfilePage`, `ResumePage` |
| web-media | `EditProfilePage`, `VideoPage`, `PhotoCropModal` |
| web-events | `EventsPage`, `EventDetailPage`, `RegistrationsPage`, `VotingPage`, `TeamsPage` |
| web-portfolio | `NotificationsPage`, `PortfolioPage`, `AchievementsTab`, `CertificatesTab`, `ProjectsTab` |
| web-public | `HomePage`, `StudentDirectoryPage`, `PublicStudentProfilePage`, `PublicResumeViewerPage`, `PublicEventsPage`, `PublicEventDetailPage` |
| admin-shell | `App.tsx`, `AdminHeader`, `Sidebar`, `LoginPage`, `StatsDashboard` |
| admin-tables | `SubmissionsTable`, `StudentsTable`, `SubmissionDetailModal`, `ActivityLogView`, `StudentDetail` |
| admin-pages | `Moderation`, `AdminEvents`, `EventRegistrations`, `Communications`, `AuditLogs`, `VotingResults`, `Settings` |

---

## 7. The `!important` removal order

`admin-client/src/index.css` still contains a legacy theming shim: a set of
`#admin-root.dark …` rules that repaint light-mode Tailwind utilities with dark
values by force. It exists because the admin pages were written light-first and
dark mode was bolted on afterwards.

Each shim rule names the legacy classes it patches. As you migrate a page, those
classes disappear from it, and the rule becomes dead. **When you have removed the
last legacy class a rule patches, delete that rule** and note it in your report.

The shim is deleted entirely once `grep -rn 'bg-white\|text-neutral-900\|border-slate-200' admin-client/src`
returns nothing but the shim itself. `admin-shell` owns that final deletion,
because `App.tsx` and `Sidebar` are the last files holding the old classes.
