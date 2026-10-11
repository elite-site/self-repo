# ADR 0002: Layered Modular Monolith Architecture

- **Status**: Accepted
- **Date**: 2026-10-11
- **Governing Rules**: `ARCH-1` through `ARCH-10`

---

## Context

The backend previously intermixed routing logic, raw database queries, filesystem calls, and business rules across arbitrary controllers and monolithic services. Legacy routes directly invoked Prisma queries, while domain boundaries (such as public submissions, administrative controls, student portfolios, and external syncs) leaked internal concerns across folders. This caused:
1. High risk of cyclic dependencies.
2. Inability to unit test business logic without mocking the entire HTTP request or database instance.
3. Leaking database implementation details (such as column formats and query performance) into API controllers.
4. Duplicate query logic across multiple endpoints.

## Decision

We adopt a **strictly layered modular monolith** architecture in `backend/src/`:
- **Unidirectional layer hierarchy**:
  ```text
  Route  -->  Controller  -->  Service  -->  Repository  -->  Database
  ```
  Dependencies point strictly downward. Reverse dependencies or skipping layers (e.g. controllers calling repositories, or services handling `req`/`res`) are strictly prohibited.

### 1. Domain Module Structure (`modules/<name>/`)
Each distinct business domain lives under `backend/src/modules/<name>/` with dedicated files:

| File | Primary Responsibility | Constraints |
|---|---|---|
| `<name>.routes.ts` | Map HTTP paths to controller handlers, attach validation and auth middleware | No business or query logic |
| `<name>.controller.ts` | Unpack HTTP requests, delegate to service methods, format HTTP responses | Never touch Prisma or execute business rules |
| `<name>.service.ts` | Business orchestration, domain validation, transaction boundaries | Never import `express` or access `req`/`res` |
| `<name>.repository.ts` | All Prisma queries, relational joins, and projections for the domain | No business rules; encapsulated database calls |
| `<name>.schemas.ts` | Input validation schemas and payload normalizers | Never import services or repositories |
| `<name>.types.ts` | Shared domain TypeScript interfaces and parameter contracts | Pure types, zero runtime logic |
| `index.ts` | Public module interface (re-exports service and route surfaces) | Never re-export internal repositories |

Sub-areas with multiple distinct functional surfaces (such as `admin`, `public`, `students`) organize sub-components under `controllers/`, `services/`, and `repositories/` while preserving the layered boundary.

### 2. Module Isolation and Cross-Module Calls
- Modules expose public APIs strictly via their root `index.ts`.
- Direct imports into another module's internals (e.g. `import from '../x/x.repository'`) are forbidden (`ARCH-3`).
- Inter-domain communication occurs service-to-service via public module exports (`ARCH-5`).

### 3. External Infrastructure Encapsulation (`infrastructure/`)
- External providers (Database client, Prisma, Google Drive, GitHub API, Resend Email) are wrapped in adapter interfaces located under `backend/src/infrastructure/` or dedicated domain adapters (`modules/media/drive/`).
- Database client instantiation is unified into a single Prisma client instance (`infrastructure/prisma.ts`), eliminating multiple client singletons (`ARCH-10`).

### 4. Application Composition (`server.ts`)
`backend/src/server.ts` is strictly reserved for application composition: mounting middleware in explicit order, registering domain route trees, and managing startup/shutdown lifecycles (`ARCH-6`). It contains zero business logic.

---

## Consequences

### Positive
- **High Cohesion & Low Coupling**: Domains maintain clear functional boundaries and can be understood or modified in isolation.
- **Testability**: Services can be thoroughly tested with mocked repositories, and repositories with unit/integration tests without HTTP overhead.
- **Database Safety**: Prisma queries are concentrated entirely within repository files, making query optimization, indexing, and audits straightforward (`ARCH-4`).
- **Architectural Clarity**: New developers can immediately locate where a requirement belongs based on the layer and domain.

### Trade-offs
- Writing simple CRUD operations requires touching distinct route, controller, service, and repository files. This small boilerplate ensures boundaries remain intact as logic expands.
