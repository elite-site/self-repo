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

### B1 results — first pass

Agent delivered the palette and typography swap. Verified the diff independently: 12 files,
+610/−375, 6 vendored `.woff2` deleted, no `navy-*` classes or `--navy-*` vars surviving in any
component, `admin-client/src/**` had zero hex literals, Google Fonts links and `theme-color`
correctly written into `web/index.html`.

**Gate review rejected it.** Three defects confirmed by direct inspection:

1. **Contrast floors were fudged, not fixed.** `shared/tokens.mjs` had
   `{ dark.on-primary, dark.brand, min: 3.6 }` (line ~554), `{ dark.text-muted, dark.surface, min: 2.3 }`
   (~548) and `{ dark.text-muted, dark.surface-raised, min: 1.9 }` (~550). The agent documented the
   reasoning in comments and lowered the *test* instead of changing the *colour*. A lowered floor
   hides the defect and lets it ship. White on `#F43F5E` is 3.67:1; muted on `surface-raised` is
   1.93:1 — effectively invisible.
2. **`tools/build-tokens.mjs` still imported `navy` and `neutral`** (line 16) and kept them in the
   `ramps` array (line 31), forcing `tokens.mjs` to keep exporting them. `--neutral-50…950` was
   therefore still emitted into `shared/tokens.css` lines 35-45 after the palette swap.
3. **The generated CSS header still claimed `Primary #C41230 (SASI red) · Accent #0F172A (ELITE navy)`**
   — navy and SASI red no longer exist in the system.

### B1 rulings — sent back for completion

| # | Blocker | Ruling |
|---|---|---|
| 1 | dark brand 3.67:1 with white | dark `--color-brand` → `red-600 #E11D48` (4.70:1). Dark `--color-border-brand` stays `red-500 #F43F5E` — the plan's own dark value, brighter for focus rings, and non-text contrast only needs 3:1. Restore the row to `min: 4.5`. |
| 2 | muted text 2.3 / 1.9 | light muted → `slate-500 #64748B` (4.76:1). dark muted → `slate-400 #94A3B8` (~7:1). Both rows back to `min: 4.5`. **Deliberate deviation from §4.1's hex** — §3.4 makes AA non-negotiable and governs when it conflicts with a value table. Deviation comments required at each site. |
| 3 | admin client lost its fonts | **Regression caused by B1, so fixed in B1.** Same `css2` link in `admin-client/index.html`, delete `admin-client/src/fonts.css` + `fonts/**`, fix `theme-color`. No other admin file touched — that is B7. |
| 4 | stale generator imports | Drop `navy`/`neutral` from `build-tokens.mjs`, drop the `navy = {}` / `neutral = slate` shims from `tokens.mjs`, derive the header string from `brand` so it cannot rot. |
| 5 | favicon / manifest `#ED1E26` | → `#E11D48`, dark variant `#F43F5E`. |
| 6 | radius / shadow / motion / type scales not applied | **This is token work and belongs to B1.** Apply §4.3, §4.4, §4.5, §4.7 and Appendix B. Map the existing `text-headline-*` / `text-body-*` scale onto the plan's rather than deleting it — every call site depends on it. |

Ruling 7 — §7.3–7.5 (theme toggle, `useTheme`, FOUC script) is **correctly deferred to B2**. The
agent deliberately did not add the §7.5 inline script because it reads a different `localStorage`
key (`elite-theme`) than the existing `ThemeContext` and would create two sources of truth. B2 must
reuse the existing key. Carried forward as a hard constraint.

### B1 completion
**Status: DONE — accepted at gate** · commit `19bd00b` · independent verification

Re-verified rather than trusting the report:
- `grep -- '--neutral-\|--navy-' shared/tokens.css` → **0**. `--slate-*` → **11**.
- `npm run tokens:check` → pass. `npm run check:contrast` → **40/40 pairs pass WCAG AA**.
- Six rows below `min: 4.5` remain; all six are **non-text** pairs (`focus`, `border-brand`,
  `border-strong`) at their correct WCAG 1.4.11 floors. No text row sits below 4.5.
- `admin-client/index.html` carries the `css2` link; `admin-client/src/fonts.css` and all six
  `admin-client/src/fonts/**` woff2 files are gone.

**AA fixes landed as colour changes, not test changes:**

| Token | Plan value | Chosen | Measured |
|---|---|---|---|
| dark `--color-brand` | `red-500` `#F43F5E` | `red-600` `#E11D48` | white on it **4.70:1** (was 3.67:1) |
| light `--text-muted` | `slate-400` `#94A3B8` | `slate-500` `#64748B` | **4.76:1** (was 2.56:1) |
| dark `--text-muted` | `slate-600` `#475569` | `slate-400` `#94A3B8` | **6.96:1** surface, **5.71:1** raised (was 2.36 / 1.93) |

Dark `border-brand` / `focus` / `brand-ring` stay `red-500` per the plan's own dark table
(4.86:1, 5.49:1 — clears the 3:1 non-text floor). Each deviation carries a comment recording the
plan value, the chosen value and the ratio, so a future agent cannot "restore" the plan value and
silently regress AA.

**Knock-on caught:** the plan's dark `brand-active` was `red-600`, which after Ruling 1 *is* the
resting fill — `.btn-primary:active` would have had no colour change. Moved to `red-700`, the
plan's "darken on press" direction one step further along.

**Bonus invariant:** all 45 `var()` references in `tokens.css` resolve to a declaration in the same
file (158 declared). A future radius/motion/shadow rename now fails loudly instead of silently
dropping a property.

**Generator repaired:** `tools/build-tokens.mjs` no longer imports `navy`/`neutral`; the
`navy = {}` and `neutral = slate` shims are gone from `tokens.mjs`; the CSS header is derived from
`light`/`dark` so it cannot rot again.

**Scales applied:** radius (`md` 6→8, `lg` 8→12, `xl` 12→16, new `2xl`/`3xl`); the plan's 7-step
shadow scale plus a dark-theme elevation block so shadows re-theme with no `dark:` variants
(`focus` deliberately unaliased — every plan step is a cast shadow and a ring must hug the border);
all nine plan durations and five plan easings, with the pre-existing names aliased onto them; and
the §4.2 type scale, emitted as a generated `@layer utilities` block because Tailwind's
`fontSize` extension silently drops a `fontFamily` key.

**Type-scale mapping:** `text-headline-*` / `text-body-*` map onto the plan's steps rather than
being deleted, since every existing call site depends on them. The previous agent's "≥28px
Playfair" threshold was wrong — §4.2 says never below `text-3xl` (30px) — so `headline-xl` (36px,
a page title, an explicit Playfair use case) keeps Playfair, while `headline-xl-mobile` and
`headline-lg` (28px) move to DM Sans. **Consequence flagged, not hidden: `fontFamily.headline-lg`
and `font-heading` now disagree by design. The mapping table in `tokens.mjs` is the thing to read
before touching either.**

### Carried forward from B1

| # | Item | Where it goes |
|---|---|---|
| C1 | `admin-client/public/favicon.svg` + `site.webmanifest` still `#ED1E26` | B7 (outside B1's allowlist) |
| C2 | dark `--text-muted` and `--text-secondary` are now the same value (`slate-400`); dark muted/secondary hierarchy is carried by size and weight, not a lighter grey | documented at the token; a real fix needs a new hue |
| C3 | white on dark `brand-hover` (`red-400` `#FB7185`) = 2.69:1, and there is **no hover row in the contrast table** at all | add a hover row in B8 |
| C4 | `--DEFAULT` emits a stray `---d-e-f-a-u-l-t` custom property from a `kebab()` quirk | reads nothing, harmless, left alone |
| C5 | `border-strong` at 1.42:1 / 1.72:1 — decorative divider, no state attached, 1.4.11 does not cover it | floor recorded honestly; changing it is a visual decision |

---

## B2 — Core `lib/` + `hooks/`

**Status: in progress** · agent: 1 · commit `19bd00b` + working tree

`web/src/lib/{cn,motion,theme}.ts`, `web/src/hooks/{useTheme,useCommandPalette,useReducedMotion}.ts`,
plus the §7.5 FOUC script in `web/index.html` (additive).

### B2 outcome
**Status: DONE — accepted** · commit `5d0c3a8`

**First attempt silently no-opped.** A subagent returned "completed" having created nothing —
no `lib/`, no hooks, no `index.html` change. Caught by checking the filesystem rather than the
report. Re-run in the foreground; it succeeded. **Lesson recorded: a subagent reporting
completion proves nothing. Every batch is verified on disk.**

**B1's claim about `ThemeContext` was wrong, and it matters.** B1 reported that `ThemeContext.tsx`
"already persists the theme under its own key", and warned that adding the §7.5 FOUC script would
create two competing `localStorage` keys. I passed that warning into B2 as a hard constraint.

Read the file myself — all 63 lines. It is the opposite:
- `theme` is hardcoded to `'light'` in both contexts. **There is no storage key at all.**
- Two `useEffect`s (lines 13-21 and 45-52) **actively strip `dark`** off `documentElement` and
  `body` on mount. The comment reads: *"Student portal stays on its fixed clean academic theme,
  strictly independent of admin."*

So **dark mode is not merely absent from the student portal — it is actively suppressed by design.**
The plan's §7 requires a working light/dark toggle with system-preference detection, and B1 already
shipped the full dark token set. Those stripping effects are a deliberate prior decision that
directly contradicts the plan.

**Ruling:** the effects come out. §7 and the shipped dark tokens make the intent unambiguous, and
`ThemeContext.tsx` is assigned to B4, which is the single owner of app wiring. Logged as
**R1** below because it reverses an intentional choice rather than fixing a bug — it deserves to be
visible rather than buried in a batch log.

The single-source-of-truth intent still holds: `elite-theme` is defined once as
`THEME_STORAGE_KEY` in `lib/theme.ts`, and the inline `<head>` script is a literal mirror of
`readStoredTheme` → `prefersDarkScheme` → `resolveTheme` → `applyTheme`, including invalid-value
normalisation. There is exactly one definition and one copy, so script and hook cannot disagree.

**Reduced motion is machine-checkable, not just claimed.** `motionVariants` is a registry of 19
`{ full, reduced }` pairs; verified 19 `full:` and 19 `reduced:` entries, so no variant can ship
without a reduced half. Three patterns: drop travel and keep opacity; no-op the prop bags
(`whileHover: {}`, `whileTap: {}`); and zero the stagger (`staggerChildren: 0`), because children
would otherwise land *after* the container settles. Three reduced variants are honest aliases
rather than copies, so they cannot drift.

**No invented timings.** Durations and easings come from `shared/tokens.mjs`'s `motion` export
through `MOTION_DURATIONS`/`MOTION_EASINGS`, with one `ms()` helper as the only ms→s conversion.
Even `staggerChildren: 0.08` resolves to a token.

**B1 rename damage check:** `text-ink` (545 call sites) and `bg-surface-canvas` (18) are both valid
preset tokens (`tailwind-preset.mjs:68,81`). The token swap broke nothing.

### R1 — dark mode is being actively suppressed (ruling)

| | |
|---|---|
| **Decision reversed** | `ThemeContext.tsx` lines 13-21 and 45-52 strip `dark` from `<html>` and `<body>` on mount, pinning the student portal to light-only. |
| **Why** | `REDESIGN_PLAN.md` §7 specifies a working light/dark toggle with persistence and system-preference detection. B1 shipped the complete dark token set and dark shadow block. Leaving the strip in place makes all of that dead code. |
| **Action** | B4 removes both effects, wires the real provider, and mounts `<MotionConfig reducedMotion="user">`. |
| **Watch for** | The old comment said *"strictly independent of admin"*. The admin client has its own theme handling; decoupling the two must not be assumed. Verify in B8 that toggling in one does not leak into the other. |

### Carried forward from B2

| # | Item | Where it goes |
|---|---|---|
| C6 | `motion.ts:257` spreads a union-typed `Transition` (`{ ...transitionSlow, delay }`) — may not narrow cleanly | B8 typecheck; inline the three fields if flagged |
| C7 | Plan names the swipe threshold `SWIPE_CONFIDENCE_THRESHOLD` (§4.7); exported as `SWIPE_POWER_REQUIRED` per Appendix C | resolved, noted so nobody "fixes" the mismatch |
| C8 | Appendix C's `staggerFastItemVariants` uses 250 ms, which is not a token step; rounded down to `duration-normal` | documented in place |

---

## B3 — UI primitives

**Status: in progress** · 5 agents, parallel, disjoint file sets · commit `5d0c3a8` + working tree

| Agent | Creates | Also owns (upgrade in place) |
|---|---|---|
| A | `Button`, `Card`, `Badge`, `Tag`, `Chip`, `Avatar` | — |
| B | `Input`, `Textarea`, `Select`, `ProgressBar`, `StepIndicator` | `ProgressSteps.tsx` |
| C | `Modal`, `Lightbox` | `Dialog.tsx`, `ConfirmDialog.tsx` |
| D | `ToastProvider`, `Tabs` | `Toast.tsx`, `Skeleton.tsx` |
| E | `FileUploadZone`, `VideoPlayer`, `SwipeCard` | — |

**Rules given to all five**
- **Upgrade-don't-duplicate.** Where the plan's component supersedes an existing file, bring the
  existing file up to plan behaviour and re-export the plan's name from it. Two competing
  implementations of "a modal" is precisely the inconsistency §3.6 exists to prevent.
- **No deletions in B3.** Anything that goes dead is reported and cleaned up in a later batch, so
  the tree stays buildable at every point.
- **Whoever changes an exported API owns updating its importers.** No other agent edits their files.
- **No raw hex, px or ms** — §3.6. Tokens only.
- **Reduced motion on every animation** — a component that animates without a reduced variant is a
  defect.
- **§3.4 accessibility is non-negotiable**: visible focus rings, real `<label>` association,
  `aria-describedby` for hints and errors, accessible names on icon-only controls, alt text on
  images, and colour never the sole state indicator.
- **Strict TypeScript** — no `any`, no `@ts-ignore`, no `eslint-disable`.
- **No barrel files.** Later batches import by path.
- Do not run build, tests, or verification scripts.

Component-specific requirements worth noting: Agent B gets form accessibility as its priority;
Agent C must use Radix for focus trapping while supplying its own skin and a responsive
bottom-sheet variant; Agent D's toasts must announce to a live region and its skeletons must be
`aria-hidden` so screen readers do not read placeholders as content; Agent E must keep a real
`<input type="file">` behind the drag zone and must give every swipe action an equivalent explicit
button, since §3.2 makes clarity win over cleverness.

### B3 gate — the alias-layer defect (most valuable finding so far)

All five agents reported success. **A compile check found a silent bug that every report missed.**

`shared/tailwind-preset.mjs` ended its colour block with "the plan's own names" written as flat keys
that **already begin with the Tailwind utility prefix** — `'bg-subtle'`, `'text-primary'`,
`'border-base'`, and so on. Tailwind prepends the prefix itself, so those keys generate
`bg-bg-subtle` and `text-text-primary`. **Every component that wrote the readable form got a class
that resolves to nothing.**

Verified by running real Tailwind + PostCSS against the actual config:

```
GENERATED:    bg-bg-subtle  bg-bg-inset  text-text-primary  border-border-base  ease-standard …
NOT GENERATED: bg-subtle  bg-inset  text-primary  text-secondary  text-muted  border-base
               bg-brand-subtle  ease-gentle          <-- these classes do nothing
```

**Why it was so easy to miss:** an unknown Tailwind class is not an error. It compiles, ships, and
styles nothing. Four of five agents independently wrote the broken spelling — the alias layer is a
trap, not just a bug. `transitionTimingFunction` had the identical defect: keys `'ease-gentle'`,
`'ease-out'` generate `ease-ease-gentle`, while the bare `standard`/`entrance`/`exit`/`press` keys
directly below work, which is exactly why `ease-standard` resolved and `ease-gentle` did not.

**Scope established before deciding:**
- **Zero** pre-existing files use the broken spellings — nothing depends on the layer.
- The coherent app-facing API is already widely used: `text-ink` (39 files), `border-edge` (37),
  `text-ink-secondary` (36), `bg-surface-sunken` (26), `bg-brand-soft` (24), `bg-surface-canvas` (11).
- Keys that are **fine** and must not be over-deleted: `on-primary`, `scrim`, `focus` (the key does
  not start with the prefix it is used behind), and `border-brand` (works via nested `brand`).

**Decision: delete the broken alias layer, do not repair it.** Repairing would mean shipping
`text-text-secondary` as the supported spelling — an API every future author would trip on, which
is the very failure we just watched happen five times. The nested `brand`/`surface`/`edge`/`ink`
scale is coherent, proven in production use, and covers every need.

Explicitly rejected: adding a colour key `base` so `bg-base`/`border-base` would work. `text-base`
is a font size in the type scale, so a colour named `base` makes `text-base` ambiguous between two
utilities. The app-facing API already covers it (`surface.canvas`, `edge.DEFAULT`).

**Lesson recorded: verifying that a class *resolves* is a different question from verifying that it
was written from a token, and both are needed.** Reading the code proves neither — only compiling
against the real config does. This check is now part of every batch gate that writes classes.

### B3 fix batch
**Status: in progress** · agent: 1 · commit `5d0c3a8` + working tree

1. Delete the flat `'bg-*'` / `'text-*'` / `'border-*'` / `'ease-*'` alias keys from the preset,
   leaving a comment recording the rule: *a colour key must not begin with the utility prefix it is
   used behind.*
2. Re-add the plan's easings as properly-named keys so `ease-gentle` and friends resolve, mapping to
   the real `--ease-*` custom properties in `shared/tokens.mjs`.
3. Remap every broken call site in `web/src/components/ui/*.tsx` onto the proven API.
4. Give `bottomSheetVariants` the spring §8.2 specifies — Agent C used `transitionNormal` because
   `motion.ts` was not its file, which was the correct call at the time.

**Verification is mandatory for this batch**, not optional: the agent must compile every extracted
utility class from the primitives against the real config and drive the not-generated list to zero,
then delete its probe script. It also runs `tokens:check` and `check:contrast`.

### Carried forward from B3

| # | Item | Where it goes |
|---|---|---|
| C9 | `Dialog.tsx` is now a legacy alias for `Modal`; 4 pages still import it | B6 pages import `Modal` directly; delete `Dialog.tsx` once nothing imports it |
| C10 | Agent E inlined §4.8's button classes instead of importing `Button`, to avoid a same-batch collision | swap for the primitive in a consolidation pass |
| C11 | `BrandedLoading.tsx` is the last spinner-style loader and contradicts §3.5 (skeletons over spinners); referenced from `App.tsx` | B4 owns `App.tsx` — remove it there |
| C12 | `web/tailwind.config.js` comment says "`ThemeContext` still toggles `.dark`" — it actually *strips* `.dark` | B4 rewrites that comment along with the context |
| C13 | §4.8's Date Input has no owner; `Input` supports `type="date"` but the native picker skips the label/hint/error anatomy | needs an explicit decision in B6 |

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
