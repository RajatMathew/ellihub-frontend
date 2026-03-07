# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server

# Build
npm run build        # Type-check (tsc -b) then Vite build

# Linting & formatting
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier write
npm run format:check # Prettier check
```

No test runner is configured in this project.

## Environment

Requires a `.env` file with:
```
VITE_API_BASE_URL=http://localhost:<port>
```

## Architecture

This is a **React 19 + Vite + TypeScript** SPA for a construction ERP ("Elle Hub"). It is a PWA.

### Source layout

```
src/
  app/       # Framework-level: routing, layouts, API client, global hooks, shared UI primitives
  core/      # Cross-cutting concerns: auth pages, help system, UI kit demo page
  modules/   # Feature modules (business logic lives here)
```

### Path aliases

| Alias | Maps to |
|---|---|
| `@app/*` | `src/app/*` |
| `@core/*` | `src/core/*` |
| `@modules/*` | `src/modules/*` |

### Module structure

Every feature module (`src/modules/<name>/`) follows this internal layout:

```
api/          # Axios calls — parse responses with Zod, throw on parse failure
constants/    # Query key factories (*.keys.ts) and UI constants (*.constants.ts)
hooks/        # TanStack Query hooks wrapping the api layer
schemas/      # Zod schemas + inferred TypeScript types
components/   # React components scoped to the module
pages/        # Page-level components
routes/       # React Router route components for the module
```

Current modules: `catalog`, `directory`, `files`, `project`.

### Data fetching pattern

1. **Schema** (`schemas/`): Zod schema defines the shape and inferred type.
2. **API** (`api/`): Uses the shared `api` Axios instance from `@app/api`. Calls `schema.safeParse()` on every response; logs and throws on failure.
3. **Query keys** (`constants/*.keys.ts`): Typed factory functions (e.g. `projectKeys.detail(id)`).
4. **Hooks** (`hooks/`): TanStack Query `useQuery`/`useMutation` hooks. Mutations invalidate related queries via `queryClient` and show `sonner` toasts on error.

### Routing

Routes are defined declaratively in `src/app/routing/config/routes.tsx` as a `RouteDef[]` tree. The `RouteDef` type supports `layout`, `title`, `breadcrumb`, and `children`. All page components are lazy-loaded via `React.lazy`.

- `layout: 'app'` (default): full sidebar + header shell
- `layout: 'minimal'`: no chrome (used for auth pages)

The `AppRoutingSetup` and `HeaderRoutingSetup` in `src/app/routing/setup/` consume the route tree and render the appropriate React Router elements.

To add a new top-level route, add an entry to `routeTree` in `routes.tsx` and add the corresponding sidebar entry in `src/app/routing/config/sidebar.tsx`.

### Authentication

Uses `better-auth` via `src/app/api/auth-client.ts`. The `ProtectedLayout` component (`src/app/components/layouts/protected.tsx`) guards all app routes using `useSession()` — unauthenticated users are redirected to `/sign-in?next=<current-path>`.

### UI components

`src/app/components/ui/` contains shadcn/ui-style primitives (Radix UI + Tailwind). Use these building blocks rather than installing new component libraries. Styling uses **Tailwind CSS v4** (configured via `@tailwindcss/vite` plugin — no `tailwind.config.js`).

The sidebar and header configs are separate from routes: `mainSidebarMenu`, `projectSidebarMenu`, etc. in `src/app/routing/config/sidebar.tsx`; header configs in `src/app/routing/config/header.tsx`.

### Forms

Forms use **react-hook-form** with **@hookform/resolvers** + Zod schemas for validation. The same Zod schema used for API response parsing may define a separate `*FormSchema` variant for the form shape when the shapes diverge.
