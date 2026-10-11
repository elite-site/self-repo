# ADR 0003: Cohesion-First File Organization and Size Standards

- **Status**: Accepted
- **Date**: 2026-10-11
- **Governing Rules**: `SIZE-1` through `SIZE-8`

---

## Context

Codebases often suffer from two failure modes regarding file sizing:
1. **Unbounded God Objects**: Files that grow indefinitely because developers find it easier to append logic than create a dedicated module, mixing transport parsing, domain validation, database access, and formatting.
2. **Dogmatic Line Limits**: Arbitrary line count cutoffs (e.g. "no file over 200 lines") that incentivize mechanical fragmentation into meaningless files like `helpers2.ts`, `part1.ts`, or generic `utils.ts` buckets. This hurts readability by forcing readers to navigate across multiple trivial files to follow a single cohesive flow.

## Decision

We adopt a **cohesion-first standard** across the entire monorepo (`backend`, `web`, `admin-client`, `shared`):

### 1. The Single Reason to Change (`SIZE-1`)
There is no arbitrary line limit. Files are judged entirely by cohesion and single responsibility. A file should have one reason to change. If describing a file's purpose requires the word "and", it is likely two files and should be split.

### 2. When to Split a File (`SIZE-2`)
A file MUST be split when at least one of the following criteria is met:
- **Mixed Layers**: The file intermixes HTTP serialization, business logic orchestration, and database access.
- **Multiple Independent Concepts**: It manages multiple concepts that change for independent reasons (e.g. auth validation combined with profile image cropping).
- **Extracted Reuse**: Portions of the logic are needed by or relevant to other callers.
- **Cognitive Load & Navigation**: Understanding a core feature requires scrolling past hundreds of lines of unrelated helpers.
- **Test Fragility**: Testing a simple method requires extensive mock setups for unrelated concerns housed in the same file.

### 3. When NOT to Split a File (`SIZE-3`)
A file MUST NOT be split when:
- It forms a cohesive, single-purpose unit: an integrated state machine, a specialized parser, an exhaustive schema catalogue, or an immutable lookup table.
- Splitting would create tiny coupled fragments that always change together, fragmenting locality of reference and increasing indirection.
- The sole motivation is an arbitrary line count feeling "too long".

### 4. Prohibition on Generic Dumping Grounds (`SIZE-4`, `SIZE-8`)
- Mechanical naming conventions (`part1.ts`, `helpers2.ts`, `temp.ts`, `v2.ts`) are forbidden.
- Catch-all buckets (`common.ts`, `misc.ts`, `helpers.ts`, `utils.ts`) are forbidden. Extracted utilities must be grouped by specific subject (`dates.ts`, `pagination.ts`, `rangeParser.ts`).
- Every extracted file and function must be named precisely after the capability it provides (`computeProfileCompletion.ts`, `mediaUrl.ts`).

### 5. Frontend Component Cohesion (`SIZE-7`, `UI-2`)
- Route-level page components stay thin: they compose feature components and hooks (`ARCH-11`).
- Sub-components are extracted when they hold their own state, offer independent reuse, or represent a distinct visual/functional concept worth naming.
- Extracting components solely to shorten JSX line counts without conceptual boundary is discouraged.

---

## Consequences

### Positive
- **High Readability**: Modules and components are straightforward to navigate and reason about because their filenames accurately represent their single responsibility.
- **Ease of Refactoring & Deletion**: Isolated, cohesive units can be safely deleted or refactored with minimal unintended side effects on unrelated features (`QUAL-2`).
- **Targeted Testing**: Unit and integration tests mirror cohesive functional boundaries, minimizing mock complexity.

### Trade-offs
- Developers must exercise thoughtful architectural judgment rather than relying on a blind line-counting linter rule.
- Code reviews must actively evaluate cohesion during pull requests.
