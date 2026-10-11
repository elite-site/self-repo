/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // 1. Controller cannot import Prisma directly
    {
      name: 'no-prisma-in-controllers',
      comment: 'Controllers must not import prisma directly; use repositories instead.',
      severity: 'warn',
      from: { path: '^backend/src/modules/.+\\.controller\\.ts$' },
      to: { path: '(backend/src/infrastructure/prisma|backend/src/lib/prisma|@prisma/client)' },
    },
    // 2. Services must not touch req/res or express
    {
      name: 'no-express-in-services',
      comment: 'Services must not import express or manipulate HTTP req/res.',
      severity: 'warn',
      from: { path: '^backend/src/modules/.+\\.service\\.ts$' },
      to: { path: 'express' },
    },
    // 3. Repositories must not import services or controllers
    {
      name: 'repositories-independent-of-services',
      comment: 'Repositories must not depend on service or controller layers.',
      severity: 'warn',
      from: { path: '^backend/src/modules/.+\\.repository\\.ts$' },
      to: { path: '^backend/src/modules/.+\\.(service|controller|routes)\\.ts$' },
    },
    // 4. No deep cross-module imports
    {
      name: 'no-deep-cross-module-imports',
      comment: 'Modules must only import other modules through their index.ts barrel.',
      severity: 'warn',
      from: { path: '^backend/src/modules/([^/]+)/.+' },
      to: {
        path: '^backend/src/modules/([^/]+)/.+',
        pathNot: ['^backend/src/modules/$1/.+', '^backend/src/modules/[^/]+/index\\.ts$'],
      },
    },
    // 5. Shared and Infrastructure cannot import from modules
    {
      name: 'shared-and-infra-no-modules',
      comment: 'shared and infrastructure must not import from modules.',
      severity: 'warn',
      from: { path: '^backend/src/(shared|infrastructure)/.+' },
      to: { path: '^backend/src/modules/.+' },
    },
    // Frontend: shared never imports features
    {
      name: 'frontend-shared-no-features',
      comment: 'Frontend shared code must not import features.',
      severity: 'warn',
      from: { path: '^(web|admin-client)/src/shared/.+' },
      to: { path: '^(web|admin-client)/src/features/.+' },
    },
    // Frontend: no deep cross-feature imports
    {
      name: 'frontend-no-deep-cross-features',
      comment: 'Features must only import other features through their index.ts public interface.',
      severity: 'warn',
      from: { path: '^(web|admin-client)/src/features/([^/]+)/.+' },
      to: {
        path: '^(web|admin-client)/src/features/([^/]+)/.+',
        pathNot: [
          '^(web|admin-client)/src/features/$2/.+',
          '^(web|admin-client)/src/features/[^/]+/index\\.ts$',
        ],
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './backend/tsconfig.json',
    },
  },
};
