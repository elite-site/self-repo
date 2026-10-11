# Backend Architecture Skeleton
- `infrastructure/`: Prisma, Google Drive, email transport, github clients.
- `shared/`: Generic cross-cutting middleware, errors, utils, cache, and types.
- `modules/`: Feature modules. Each module follows routes -> controller -> service -> repository with its public API exported via `index.ts`.
