# CLAUDE.md — elli-core API

## Project Overview

Construction project management API built with **Bun + Hono + Prisma + PostgreSQL**. Uses Better Auth for authentication with organization-based RBAC.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono (TypeScript web framework)
- **ORM:** Prisma 7 with `@prisma/adapter-pg` (native PostgreSQL adapter)
- **Database:** PostgreSQL 17
- **Auth:** Better Auth with organization plugin (ACL-based permissions)
- **Validation:** Zod
- **API Docs:** OpenAPI via `@hono/zod-openapi`, served with Swagger UI
- **IDs:** ULID format
- **Cache:** Redis (ioredis)
- **File Storage:** S3-compatible

## Quick Commands

```bash
bun install                # Install dependencies
bun run dev                # Dev server with hot reload (port 3000)
bun run build              # Production build to dist/
bun run start              # Run production build
bun run typecheck          # Type check
bun run lint               # ESLint
bun run format             # Prettier
bun run db:migrate         # Prisma migrate dev
bun run db:generate        # Regenerate Prisma client
bun run db:studio          # Open Prisma Studio
bun run test               # Run tests
```

## Project Structure

```
src/
├── index.ts               # App entry point
├── api/
│   └── V1.ts              # v1 router — all module routes mounted here
├── modules/               # Domain modules (each has index, models, routes, services)
│   ├── cost-code/
│   ├── user/
│   ├── hr/employee/
│   ├── file/
│   └── ...
├── lib/
│   ├── auth.ts            # Better Auth config
│   ├── prisma.ts          # Prisma client setup
│   ├── redis.ts           # Redis client
│   ├── permissions.ts     # Permission statements (ACL)
│   └── db/                # Generated Prisma client
├── middleware/
│   ├── auth.ts            # Auth + permission middleware
│   ├── pagination.ts      # Pagination query parser
│   ├── performance.ts     # Request timing
│   └── s3-upload.ts       # File upload
├── handler/
│   └── error.ts           # Global error handler
└── utils/
    ├── error.ts           # Custom error classes
    ├── response.ts        # success()/failure() helpers
    └── zod.ts             # Zod validator wrapper
```

## Module Pattern

Every module follows a **4-file structure**:

1. **`index.ts`** — re-exports routes
2. **`models.ts`** — Zod schemas for request/response validation
3. **`routes.ts`** — Hono router with middleware + handlers
4. **`services.ts`** — Business logic, Prisma queries

### Adding a new module

1. Create `src/modules/{name}/` with the 4 files above
2. Mount in `src/api/V1.ts`: `app.route('/name', nameRoutes)`

## Key Conventions

### REST Endpoints
- `GET /api/v1/{resource}` — list (paginated)
- `GET /api/v1/{resource}/:id` — get by ID
- `POST /api/v1/{resource}` — create
- `PUT /api/v1/{resource}/:id` — update
- `DELETE /api/v1/{resource}/:id` — soft delete

### Responses
```typescript
// Success: success(c, data, 200)
{ success: true, message: "OK", data, pagination?, path, timestamp, timeElapsed }

// Error (thrown from services, caught by global handler)
{ success: false, message, details, path, timestamp }
```

### Error Classes (src/utils/error.ts)
`NotFoundError`, `ConflictError`, `BadRequestError`, `ForbiddenError`, `UnauthorizedError`, `TooManyRequestsError`

### Soft Deletes
All entities use `deletedAt: DateTime?`. Delete operations set `deletedAt = new Date()`. Services filter with `deletedAt: null`.

### Tenant Isolation
Queries filter by `tenantId` (currently hardcoded `TENANT_ID = 'default'`).

### Pagination
Middleware parses query params: `page`, `size`, `sortBy`, `sortOrder`, `search`, `filter`. Defaults: page=1, size=25, max=100.

### Auth & Permissions
- All routes require auth session (except `/api/v1/auth/*` and `/api/v1/file/read`)
- Permission middleware: `requirePermission({ resource: ['action'] })`
- Permissions defined in `src/lib/permissions.ts`

## Path Aliases (tsconfig)

```
@api/*       → src/api/*
@db/*        → src/lib/db/*
@lib/*       → src/lib/*
@middleware   → src/middleware
@modules/*   → src/modules/*
@utils       → src/utils
@handler/*   → src/handler/*
```

## Database

- **Schema:** Multi-file Prisma schema in `prisma/schema/` (auth, project, hr, directory, file)
- **Client output:** `src/lib/db/client`
- After schema changes: `bun run db:migrate` then `bun run db:generate`

## Code Quality

- **Husky + lint-staged:** Auto-runs ESLint + Prettier on staged files at commit
- **Prettier:** Single quotes, 4-space indent, 100 char width, trailing commas
- **ESLint:** TypeScript strict mode, import ordering
