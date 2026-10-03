## What and why
<!-- One or two sentences. Link the issue/story. -->

## Type
- [ ] feat  - [ ] fix  - [ ] perf  - [ ] chore/refactor

## How I tested
<!-- Commands run, screens checked. Mobile (390px) for any UI change. -->

## Release safety  (delete rows that don't apply)
- [ ] **Migration**: additive only (expand step). No `CONCURRENTLY`. Destructive change? Signed off with `-- migration-safety: reviewed (...)` and the matching code already shipped in a previous release.
- [ ] **API**: response changes are additive; `docs/openapi.yaml` updated; old web build still works against this API.
- [ ] **Deploy order**: backend first, then web. Anything that must be done by hand (env var, Drive setting) is listed below.
- [ ] **Feature flag**: user-facing feature ships OFF and is enabled from admin after deploy.
- [ ] **Rollback**: reverting this PR (or redeploying the previous build) is safe.
- [ ] **Data/privacy**: no student data, secrets or `.env` in the diff or logs.

## Manual steps after merge
<!-- e.g. set ACTIVE_EVENT_ID on Render. "None" if none. -->

## Screenshots / recording (UI changes)
