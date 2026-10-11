# Refactoring Baseline and Module Migration Log

## Baseline Checks (Branch: refactor/architecture at 38c8555)
- **Backend Typecheck (`backend npx tsc --noEmit`)**:
  - Status: PASSED (0 errors)
- **Backend Vitest (`backend npx vitest run`)**:
  - Test Files: 26 passed, 12 failed (38 total)
  - Tests: 310 passed, 28 failed (338 total)
  - Note: Baseline test failures in video/thumbnail/stream tests existed prior to refactoring on main.
- **Web Typecheck (`web npx tsc -b`)**:
  - Status: PASSED (0 errors)
- **Web Build (`web npm run build`)**:
  - Status: PASSED (built in ~5.07s)
- **Admin-Client Typecheck (`admin-client npx tsc --noEmit -p tsconfig.json`)**:
  - Status: PASSED (0 errors)
  - Note: `npx tsc -b` checks `tsconfig.node.json` (vite.config.ts) which has 2 pre-existing node typing references; `src` typecheck has 0 errors.
- **Admin-Client Build (`admin-client npm run build`)**:
  - Status: PASSED (built in ~3.26s)
- **Dependency Cruiser Initial Violation Count**:
  - Violations: 0

---

## Phase A Completion
- Branch `refactor/architecture` created.
- `@/` path alias added to `web` and `admin-client` (tsconfig and vite configs).
- Architecture skeleton directories and READMEs established.
- Target architecture and documentation written to `docs/architecture/ARCHITECTURE.md`.
- Dependency cruiser rules configured in `.dependency-cruiser.cjs`.
