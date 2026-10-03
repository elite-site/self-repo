# Delivery Process — shipping features without breaking production

Applies to `backend` (Render), `web` (Netlify), `admin-client` (built into the backend).
Goal: **main is always deployable, every change is small, and any deploy can be undone in minutes.**

---

## 1. The flow

```
Backlog -> Ready -> In progress -> In review -> Merged (deployed, flag OFF) -> Released (flag ON) -> Done
```

1. Pick a story from **Ready** (see Definition of Ready).
2. Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
3. Open a **draft PR early**. Keep it under ~400 changed lines; split bigger work.
4. CI runs automatically. The only required check is **`ci-ok`**.
5. One teammate reviews (never self-merge to `main`).
6. **Squash-merge.** Render and Netlify deploy `main` automatically, but only after CI passes.
7. The `Smoke (live)` workflow confirms the live API and web respond.
8. Turn the feature flag ON from admin when you are ready to release it.

Rule of thumb: **deploy is a technical event, release is a product decision.** Keep them separate with flags.

---

## 2. Environments

| Env | Backend | Database | Web | Purpose |
|---|---|---|---|---|
| Local | `npm run dev` | local/dev DB | Vite | development |
| PR preview | n/a | n/a | Netlify Deploy Preview (per PR) | UI review on a real phone |
| **Staging** (add this) | 2nd Render service, branch `main` | **separate** Supabase project | Netlify branch deploy | rehearse migrations and deploys |
| Production | Render | production Supabase | Netlify | real users |

Today there is only production, so every migration runs for the first time on real student data.
Staging is the single biggest risk reducer on this list; do it in the first sprint.
Staging must use its own `JWT` secrets, its own Drive folder, and **fake data only** (never import the real roster).

---

## 3. Branch protection (GitHub, Settings -> Branches -> `main`)

- Require a pull request before merging, 1 approval, dismiss stale approvals.
- Require status check **`ci-ok`**, and require branches to be up to date.
- Block force pushes and deletions. Allow squash merge only. Auto-delete merged branches.
- Include administrators (no "just this once" pushes).
- Also enable: Dependabot alerts, secret scanning, push protection (Settings -> Code security).

Platform settings (verify the wording in each dashboard):
- **Render:** Auto-Deploy -> *After CI Checks Pass*. Health check path `/ready`.
- **Netlify:** production branch `main`, Deploy Previews on for pull requests.
- Pick **one** web host. The repo has both `netlify.toml` and `vercel.json`; delete the one that is not production.

---

## 4. Database migrations (expand / contract)

Migrations run during the backend **build**, before the new code is live. For a short time the **old code runs on the new schema**. So every migration must be safe for the previous release.

**Release N (expand)**: additive only
- add nullable columns or columns with a `DEFAULT`; add tables; add indexes
- never `CONCURRENTLY` (Prisma runs migrations in a transaction)
- code still works if the new column is empty

**Release N+1 (switch)**: code starts reading/writing the new column, backfills if needed.

**Release N+2 (contract)**: only now drop/rename the old column. The CI gate requires
`-- migration-safety: reviewed (<reason>)` for these.

Never edit a migration that has been merged. CI blocks it. Add a new one.
Before any contract-step migration, take a manual backup and note the time in the PR.
A failed migration blocks all later deploys; fix forward with a new migration, do not hand-edit the ledger.

---

## 5. API compatibility (web and backend deploy separately)

- Backend deploys **first**, web second.
- API changes are **additive** within a release: add fields, do not rename/remove; web must ignore unknown fields.
- A removed field or endpoint follows the same N / N+1 / N+2 pattern as columns.
- Update `docs/openapi.yaml` in the same PR as the route change.

---

## 6. Feature flags

New user-facing features merge dark. Use the existing admin settings mechanism if it fits
(otherwise an env-driven boolean is enough to start). Requirements:
- default is **OFF**; the OFF path is the old behaviour,
- the flag is read server-side for anything that changes data,
- delete the flag within two sprints of full rollout.

---

## 7. Rollback and hotfix

| Problem | Action | Time |
|---|---|---|
| Bad feature | switch the flag OFF | seconds |
| Bad backend deploy | Render -> previous deploy -> *Rollback* | minutes |
| Bad web deploy | Netlify -> Deploys -> *Publish deploy* on the previous one | minutes |
| Bad migration | new corrective migration (forward fix); restore backup only for data loss | varies |

Hotfix: branch from `main`, smallest possible change, same PR + CI path (CI takes minutes; skipping it is how outages are made), merge, watch the Smoke run.

---

## 8. Agile cadence (small team)

- **Sprint:** 1 or 2 weeks. Planning on day 1, demo + retro on the last day (30 min each).
- **Daily:** async written update (done / doing / blocked); a call only if blocked.
- **WIP limit:** max 2 stories in progress per person. Finish before starting.
- **Bugs:** triage twice a week. P1 (login, upload, data loss) interrupts the sprint; everything else is queued.
- **Story size:** if it cannot merge in ~3 days, split it.
- **Ratio check:** in the retro, count `fix:` commits vs `feat:`. Sixteen of the last 25 commits on `main` were fixes; the target is a falling trend.

### Definition of Ready
Clear user outcome, acceptance criteria, mobile behaviour described for UI, data/migration impact noted, flag needed? (yes/no).

### Definition of Done
- CI green, reviewed, merged by squash
- deployed to staging and checked there (once it exists)
- flag state and manual steps recorded in the PR
- checked on a 390px phone for UI work
- `Smoke (live)` green after deploy
- demo-able in the sprint review

---

## 9. Observability (minimum)

- `/health` (liveness) and `/ready` (DB + Drive) already exist: keep them.
- Add error tracking (e.g. Sentry free tier) to backend and web; there is none today, so production errors are invisible.
- Add structured request logs (request id, route, status, ms) and alert on 5xx rate and slow `/ready`.

---

## 10. Adoption order

1. **Day 1:** merge these files; turn on branch protection with `ci-ok`; set `API_URL`/`WEB_URL` variables.
2. **Day 2:** fix what CI reveals on its first run (see the notes in `ci.yml`), then make `check-utilities` blocking.
3. **Week 1:** Render *After CI Checks Pass*; Netlify previews; remove the unused host config.
4. **Week 2:** staging backend + staging database; add error tracking.
5. **Week 3+:** feature flags on new work; replace mocked-Prisma tests with a few real-DB integration tests for upload, moderation and voting.
