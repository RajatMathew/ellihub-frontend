# Elle Core Developer Guide

This guide helps developers set up, extend, and contribute to Elle Core. Study the `example` module for best practices in modular architecture, route/service separation, middleware, validation, error handling, and utility usage. All extension patterns are demonstrated in `src/modules/example/`.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [API Structure](#api-structure)
- [Database & Prisma](#database--prisma)
- [Testing & Linting](#testing--linting)
- [Documentation](#documentation)
- [Contribution & Support](#contribution--support)

---

## Project Overview

Elle Core is a modular backend API for the Zubble application, built with [Hono](https://hono.dev/) and [Bun](https://bun.sh/). It uses Prisma for database ORM and VitePress for documentation. The project is designed for scalable, maintainable APIs with clear separation of concerns and robust developer experience.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Documentation:** VitePress
- **Linting:** ESLint, Prettier
- **Type Checking:** TypeScript

## Getting Started

1. **Install dependencies:**
   ```sh
   bun install
   ```
2. **Run development server:**
   ```sh
   bun run dev
   ```
   The API will be available at [http://localhost:3000](http://localhost:3000).
3. **Generate Prisma client:**
   ```sh
   bun run db:generate
   ```
4. **Run migrations:**
   ```sh
   bun run db:migrate
   ```
5. **Start documentation server:**
   ```sh
   bun run docs:dev
   ```

## Project Structure

See `src/modules/example/` for the canonical module structure:

```
├── src/
│   ├── api/           # API version routers (V1, V2)
│   ├── handler/       # Error handlers
│   ├── lib/           # Prisma, Redis, DB logic
│   ├── middleware/    # Middlewares (pagination, performance)
│   ├── modules/       # Feature modules (see example)
│   ├── utils/         # Utility functions
│   └── index.ts       # Main entry point
│
│   # Example module structure:
│   ├── example/
│   │   ├── index.ts      # Exports routers for each route pattern
│   │   ├── routes/       # Route definitions (pagination, service, validation)
│   │   ├── models/       # Zod schemas for query, params, body
│   │   ├── service/      # Business logic (DB queries, calculations)
│
├── prisma/
│   ├── schema/        # Prisma schema files
│   └── migrations/    # Migration history
├── docs/
│   ├── index.md       # Documentation home
│   ├── api-guide.md   # API writing guide
│   ├── middleware.md  # Middleware documentation
│   ├── response.md    # Response handling
│   ├── utils.md       # Utility functions
│   ├── error-handling.md # Error handling
│   └── developer-guide.md # Developer workflow
├── package.json       # Project scripts & dependencies
├── tsconfig.json      # TypeScript config
├── eslint.config.mts  # ESLint config
└── README.md          # Quickstart
```

**Module best practices (see updated `example` module):**

- Keep each module focused on a single feature/domain.
- Use route files for all route definitions and middleware usage (see `example/routes/`).
- Organize route patterns by feature (e.g., `pagination_example.route`, `service_example.route`).
- Place validation schemas in `models/` for clarity and reuse (see `example/models/example.ts`).
- Put business logic (DB queries, calculations) in `service/` (see `example/service/example.ts`).
- Export routers from `index.ts` for easy mounting in API version routers (see `example/index.ts`).
- Use utility functions (`@utils`) for validation, error handling, and responses (see `example/routes/`).

**Example of binding a module:**

```typescript
// src/api/V1.ts
import {
  paginationExampleModule,
  routePatternExampleModule,
  serviceExampleModule,
} from '@modules/example';
const app = new Hono();
app.route('/example/pagination', paginationExampleModule);
app.route('/example/pattern', routePatternExampleModule);
app.route('/example/service', serviceExampleModule);
export default app;
```

For more, see the [API Guide](./api-guide.md) and the updated `example` module source code.

## Configuration

- **TypeScript:** See `tsconfig.json` for strict settings and path aliases.
- **ESLint:** See `eslint.config.mts` for lint rules and plugin setup.
- **Prisma:** See `prisma.config.ts` for schema and migration paths.
- **VitePress:** See `docs/.vitepress/config.mts` for documentation site config.

## Scripts

Common scripts (run with `bun run <script>`):

- `dev`: Start development server
- `build`: Build the API
- `lint`: Run ESLint
- `format`: Run Prettier
- `db:migrate`: Run Prisma migrations
- `db:generate`: Generate Prisma client
- `db:studio`: Open Prisma Studio
- `docs:dev`: Start VitePress docs server
- `docs:build`: Build VitePress docs
- `docs:preview`: Preview VitePress docs

## API Structure

- Main entry: `src/index.ts`
- API versions: `src/api/V1.ts`, `src/api/V2.ts`
- Example module: `src/modules/_example_`
- Error handling: `src/handler/error.ts`
- Middlewares: `src/middleware/`
- Utilities: `src/utils/`

## Database & Prisma

- Schema files: `prisma/schema/`
- Migrations: `prisma/migrations/`
- Prisma client: `src/lib/prisma.ts`
- Example DB usage: see `src/modules/_example_/service/`

## Testing & Linting

- **Testing:** `bun test`
- **Linting:** `bun run lint`
- **Formatting:** `bun run format`
- **Type Checking:** `bun run typecheck`

## Documentation (VitePress)

## Documentation

- Docs root: `docs/`
- Config: `docs/.vitepress/config.mts`
- Start docs server: `bun run docs:dev`
- Build docs: `bun run docs:build`
- Preview docs: `bun run docs:preview`
- See [Documentation Home](./index.md) for navigation and section links.

## Contributing

## Contribution & Support

1. Fork and clone the repository.
2. Create a new branch for your feature or fix.
3. Follow code style and linting rules.
4. Add or update documentation as needed.
5. Submit a pull request.

For questions or feedback, contact the Elle Core maintainers.

```

```
