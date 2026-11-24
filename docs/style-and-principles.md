# Style and engineering principles

`AGENTS.md` is the authoritative rulebook; this page is the short version for daily work. Rules are cited by ID there. When a habit here conflicts with `AGENTS.md`, `AGENTS.md` wins.

## Principles

1. **One direction of dependencies.** Backend: `route → controller → service → repository → database`, with config and infrastructure at the edges (`ARCH-1`, `ARCH-7`). Frontend: `page → component → hook → API → shared client/UI`. `shared/` never imports a feature; modules import each other only through `index.ts`. Cycles are defects.
2. **Cohesion over line count.** One reason to change per file (`SIZE-1`). Split when layers or unrelated concepts are mixed, not because a file feels long. Keep cohesive parsers, state machines and large UI components whole (`SIZE-3`). Never split into `part1.ts`, `helpers2.ts` or a `utils.ts` dump.
3. **Find it before you write it.** Search the same module, then `shared/`/`utils/`, then neighboring modules, and only then add new code (`DRY-1`). Extend the canonical implementation (API client, error model, query keys, UI primitives, tokens) instead of making a variant. Extract on the third copy, not the first; a wrong abstraction is worse than duplication.
4. **KISS/YAGNI.** The smallest design that is also the right one. No speculative options, no mock data in production paths, no dead code. Delete unused exports/files after proving they are unused in source, tests, docs, CI and dynamic strings (`DEAD-2`).
5. **Invert at boundaries, not everywhere.** Business code depends on adapter interfaces (Drive, email, GitHub, SSO) so providers can be replaced or mocked. Do not introduce a second Prisma client, API client or error format.
6. **Strict TypeScript.** No `any`, `as any`, `@ts-ignore` or unjustified non-null assertions; narrow `unknown` instead (`STYLE-3`). Export types for public contracts. Constants, limits and status strings live in one place — no magic values.
7. **Short, flat functions.** Early returns, `async/await`, `const`, immutable updates. Names say what a thing is or does: verbs for functions, nouns for types/components, `is/has/can/should` for booleans. Flag—but do not mechanically split—files over ~300 lines and functions over ~40 lines.
8. **Explicit errors.** Throw typed `AppError` subclasses at the source, translate once in the central handler, show once in the UI (`ERR-1`, `ERR-15`). No empty catches, no swallowed failures, no raw provider/SQL text in responses. Config comes only from validated `config/env.ts` (frontend: one `import.meta.env` contract per app); secrets stay server-side.
9. **Security is not a UI feature.** Authorize on the server with ownership checks in services; validate input at the boundary; honor visibility in the query; keep storage ids and student personal data out of clients, logs, tests and fixtures (`SEC-1`, `SEC-4`, `SEC-5`, `SEC-8`).
10. **Tests travel with behavior.** Business rules get unit tests, API/DB behavior gets integration tests, UI gets component/hook tests, critical journeys get e2e (`TEST-1`). Every fixed bug gets a regression test that fails without the fix. Test authorization failures, invalid input, empty data, boundaries and concurrency. Synthetic data only. Verify with real commands and report actual output (`TEST-5`, `TEST-6`).
11. **Scope and honesty.** Change what the task requires and what the change makes wrong; do not reformat or restructure neighbors (`WORK-6`). Never invent files, endpoints, env vars, APIs or test results (`WORK-8`). Never mark unfinished work as done.

## Files and names

| Kind | Convention |
|---|---|
| React components | `PascalCase.tsx`, named export unless lazy routing needs `default` |
| Hooks | `useThing.ts`, named export |
| Backend module files | `<module>.<role>.ts` (`students.service.ts`, `public.repository.ts`) |
| Other files | `camelCase.ts` or kebab-case, consistent with neighbors |
| Helpers | named by subject (`dates.ts`, `mediaUrl.ts`), never a grab-bag |
| Imports | external, then `@/` alias, then relative; no cycles |

Prefer many small pure functions over deep branching. `TODO`/`FIXME` need an owner or issue reference. Do not leave commented-out code, unused barrels or `console.log` in committed code; use the structured logger.

## Comments

Comments explain **why**: constraints, non-obvious decisions, trade-offs and invariants. They do not narrate the code (`// loop over users`) and do not repeat the name of the function below them. Delete stale comments in the same change that invalidates them. No emoji in code.

## Hard limits

- **No color gradients anywhere** — UI, tokens or inline styles. Flat, solid color fills only. This is absolute (`AGENTS.md` §16).
- **Portfolio is frozen** — `web/src/features/portfolio/` and `backend/src/modules/portfolio/` are untouched unless the task is exclusively about portfolio.
- **No git heroics** — no commit to `main`, push, force-push, reset, rebase or branch switch unless explicitly instructed.
- **No secrets, rosters or `.env*` values** in code, logs, tests or docs; no DB migrations applied by agents; no weakening of auth, CORS, rate limits, validation or security headers to make something work.

## Cleanup rule

A cleanup task preserves behavior and is verified in phases (baseline → dead code → duplication → errors → structure → naming), with checks after each phase (`CLEAN-*`). If a change would alter observable behavior, stop and report it. If an unused symbol might be a public contract, a database change needs a migration, or a security-sensitive flow needs a product decision, **leave it in place and put it in the human-review list** with the evidence. Documented uncertainty is better than a silent deletion.
