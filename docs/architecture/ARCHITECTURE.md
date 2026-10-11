# Target Architecture & Refactor Guide

## 1. Overview
The monorepo is organized into modular architectures for backend and frontend packages.

### Backend: Modular Monolith with Strict Layers
```
backend/src/
  server.ts                  thin entry: create app, mount module routers, start
  config/                    env, constants
  infrastructure/            prisma client, google drive client, email transport, github http client
  shared/
    middleware/              auth, errorHandler, rateLimiter, upload
    errors/                  AppError + codes
    cache/ utils/ types/     generic helpers only (no feature logic)
  jobs/                      schedulers; each job calls a module service
  modules/
    auth/        student SSO + sessions, admin auth
    students/    profile, directory
    portfolio/   projects, achievements, certificates
    github/      oauth, account, sync, scheduler hooks, repos, skills, readme
    events/      events, registrations, teams
    voting/
    media/       drive, uploads, video, resume, thumbnails/proxy
    email/       automation, logs, templates
    moderation/
    announcements/
    admin/       roles, permissions, settings, activity logs, stats, export, storage
    public/      public directory + public profile + public media
```

#### Module Layers
Inside each module `backend/src/modules/<module>/`:
1. `<module>.routes.ts`: URL + middleware wiring only.
2. `<module>.controller.ts`: Parse req, call service, shape res.
3. `<module>.service.ts`: Business logic & rules.
4. `<module>.repository.ts`: All Prisma database calls for that module.
5. `<module>.schemas.ts`: Validation schemas.
6. `<module>.types.ts`: Domain & DTO types.
7. `index.ts`: Public module interface.

#### Dependency Rules
1. `routes` -> `controller` -> `service` -> `repository` -> `infrastructure`. Never skip or reverse a layer.
2. Controllers never import prisma. Services never touch `req`/`res`. Repositories contain no business rules.
3. A module imports another module ONLY through that module's `index.ts`. No deep imports across modules.
4. `shared/` and `infrastructure/` never import from `modules/`.
5. No circular imports between modules.
6. Files target under 300 lines (hard cap 500 lines).

### Frontends (`web` & `admin-client`): Feature Folders
```
src/
  app/                 App.tsx, router, providers, route table (lazy imports)
  features/<feature>/
    pages/             thin route components (under ~150 lines)
    components/        feature UI (under ~300 lines each)
    hooks/             data + state (React Query hooks, form logic)
    api/               this feature's API calls on top of shared client
    types.ts
    index.ts           public surface
  shared/
    ui/                generic components (Button, Dialog, Toast, VideoPlayer, FileUploadZone)
    layout/            AppLayout, TopBar, Sidebar, CommandPalette
    api/client.ts      axios instance + interceptors
    hooks/ lib/ utils/ types/
```

## 2. How to Add an Endpoint (Backend)
1. In `modules/<module>/<module>.schemas.ts`, define request validation schemas.
2. In `modules/<module>/<module>.repository.ts`, define database access queries using Prisma.
3. In `modules/<module>/<module>.service.ts`, implement business rules and invoke the repository.
4. In `modules/<module>/<module>.controller.ts`, parse parameters, call the service, and send HTTP response.
5. In `modules/<module>/<module>.routes.ts`, attach route method, path, validation middleware, and controller method.
6. Export router or public service via `modules/<module>/index.ts`.

## 3. How to Add a Page / Feature (Frontend)
1. In `features/<feature>/api/`, add typed API functions calling shared client.
2. In `features/<feature>/hooks/`, add query / mutation hooks using React Query.
3. In `features/<feature>/components/`, create reusable UI blocks for the feature.
4. In `features/<feature>/pages/`, assemble components into a thin page.
5. Export page and components in `features/<feature>/index.ts`.
6. Mount route lazily in `app/routes.tsx`.
