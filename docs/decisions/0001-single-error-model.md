# ADR 0001: Single Error Model and Centralized Error Handling

- **Status**: Accepted
- **Date**: 2026-10-11
- **Governing Rules**: `ERR-1` through `ERR-14`, `ERR-15` through `ERR-21`

---

## Context

Prior iterations of the codebase suffered from fragmented error reporting:
1. Controllers frequently handled errors inconsistently, manually catching failures and invoking `res.status(500).json(...)` or using divergent helper abstractions (e.g. deprecated `httpError`).
2. Error shapes differed across endpoints, hindering reliable client-side consumption and creating fragile parsing logic in `web` and `admin-client`.
3. Unhandled asynchronous rejections could escape express request lifecycles.
4. Internal runtime errors, SQL/Prisma details, and raw stack traces risked leaking sensitive implementation internals to public API callers.
5. Inability to trace errors back to server logs due to missing correlation identifiers (`requestId`).

## Decision

We establish **one uniform error model end-to-end**: thrown once at the source, translated once at the HTTP boundary, and rendered once by client boundaries.

### 1. Unified Backend Hierarchy (`AppError`)
All operational errors are modeled as typed subclasses of `AppError` defined in `backend/src/utils/appError.ts`:
- `ValidationError` (HTTP 400, code `VALIDATION_ERROR`): Invalid user input, carries structured `details` array.
- `UnauthorizedError` (HTTP 401, code `UNAUTHORIZED`): Missing or invalid authentication token.
- `ForbiddenError` (HTTP 403, code `FORBIDDEN`): Authenticated user lacks permission or domain restriction.
- `NotFoundError` (HTTP 404, code `NOT_FOUND`): Target resource does not exist.
- `ConflictError` (HTTP 409, code `CONFLICT`): Duplicate resource or state conflict (including Prisma `P2002`).
- `RateLimitError` (HTTP 429, code `RATE_LIMITED`): Operation exceeded rate limits.
- `UpstreamError` (HTTP 502/503, code `UPSTREAM_FAILURE`): Failures from external integrations (Drive, Resend, GitHub).

Domain-specific codes (`ALREADY_VOTED`, `EVENT_CLOSED`) use `UPPER_SNAKE_CASE` constants declared in module-scoped error files.

### 2. Upstream Propagation
- Services, repositories, and domain helpers throw typed errors.
- Controllers do not catch errors just to reformat or log them.
- All async route handlers and middleware are wrapped in `asyncHandler`.

### 3. Centralized `errorHandler` Middleware
A single Express error handler (`backend/src/middleware/errorHandler.ts`) catches all propagated errors and renders the standard envelope (`ERR-5`):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Human-readable message safe for display.",
  "details": [{ "field": "email", "message": "Must be a valid email" }],
  "requestId": "req_c3a9..."
}
```
- In production, internal infrastructure errors are masked as generic `INTERNAL_SERVER_ERROR`.
- Detailed error messages, original causes, and stack traces are logged securely using structured JSON (`logger.error`) correlated via `requestId`.

### 4. End-to-End Correlation
Every request is stamped with a unique `requestId` (accepted from incoming header or generated via `uuid`/crypto) by `requestId` middleware, echoed in response headers, JSON payloads, and log lines.

### 5. Frontend Normalization (`ApiError`)
The shared API client translates network and HTTP failure envelopes into a consistent `ApiError` type `{ code, message, status, details?, requestId? }`. UI views route field validation to inline form cues and system errors to accessible toasts.

---

## Consequences

### Positive
- **Predictable API contracts**: Clients consume a stable error shape across all endpoints without custom heuristics.
- **Security**: Zero leakage of database queries, stack traces, or credentials in production.
- **Traceability**: Seamless log correlation between frontend bug reports and backend structured logs via `requestId`.
- **Clean layers**: Controllers and services remain free of boilerplates for response serialization on error.

### Trade-offs
- Developers must instantiate standard `AppError` subclasses rather than ad-hoc string throws or inline `res.status().json()`.
- External provider errors must be mapped at infrastructure adapters before reaching domain services.
