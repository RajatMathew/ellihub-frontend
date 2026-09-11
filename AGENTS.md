# Elli Frontend (AI Guide)

`CLAUDE.md` at the repo root is the entry point and covers orientation, commands and the hard
rules. This file is the short cross-tool version of the same material. The detail lives in
`.claude/rules/`.

This project uses Vite 7, React 19, TypeScript 5.9 (strict mode), Tailwind CSS v4, shadcn/ui
(Radix), TanStack React Query v5, TanStack Table v8, React Router v7, React Hook Form, Zod v4,
Axios, Better Auth, and Recharts.

The API is a separate repo, `elli-core` (Hono/Bun/Prisma), checked out at `../elli-core` and mounted
at `/api/v1`.

## Commands

`bun.lock` is the maintained lockfile (`Dockerfile` runs `bun install`); `package-lock.json` is also
committed but rarely updated. Scripts behave the same under `npm run` or `bun run`.

- `npm run dev` starts the dev server (Vite). Needs `VITE_API_BASE_URL` pointing at a running
  `elli-core` — see `.env.example` and `vite-elli-config.ts`.
- `npm run build` runs TypeScript type-check + production build (`tsc -b && vite build`).
- `npm run lint` runs ESLint and should pass before work is considered complete.
- `npm run format` / `npm run format:check` run Prettier, which also owns import ordering.
- `npm run test:e2e` runs Playwright against `tests/e2e/`. There is no unit-test script.
- `npm run preview` previews the production build locally.

## Architecture

- `src/main.tsx` is the entry; `src/index.tsx` mounts `<BrowserRouter>` and the top-level routes.
- `src/app/` contains the app shell: providers, layouts, routing config, theme, and **all shared
  code** — `components/` (including shadcn primitives in `components/ui/` — DO NOT EDIT),
  `hooks/`, `lib/`, `api/`, `styles/`.
- `src/core/` holds cross-cutting non-feature code: `auth/`, `pwa/`, `help/`, and `ui/` (the
  dev-only UI kit pages).
- `src/modules/` contains feature modules with `api/`, `components/`, `constants/`, `hooks/`,
  `schemas/`, `pages/`, and `routes/`.
- `src/app/api/client.ts` is the real Axios instance (`baseURL: ${VITE_API_BASE_URL}/api/v1`,
  `withCredentials`), with interceptors for the forced-PWA-update flow and sign-in redirect.
  Re-exported from `src/app/api/index.ts`.
- There is no `src/components/`, `src/hooks/`, `src/stores/`, `src/types/` or `src/schemas/`, and
  no mock server. `src/lib/` holds only `fake-data.ts`; `src/mock/` holds the AI-elements and
  email-agent-panel components that `src/modules/email/pages/mailbox-page.tsx` lazy-loads — it is
  not an API layer.

## Routing

The app uses React Router v7 **declarative mode** (`<BrowserRouter>` + `<Routes>`). There is no
`createBrowserRouter` and no `RouteObject[]`.

- **Top shell**: `src/index.tsx`. The application lives under `ProtectedLayout` at `app/*`.
- **Central registry**: `src/app/routing/config/routes.tsx` exports `routeTree: RouteDef[]`.
- **Module routers**: `src/modules/{name}/routes/{name}.route.tsx` exports a component rendering a
  nested `<Routes>`; `routeTree` delegates to it with a splat path (`'projects/*'`).

See `.claude/rules/routing.md`.

## Working Rules

- Use the `@/`, `@app/`, `@core/`, `@modules/` aliases instead of deep relative paths.
- Prefer named exports.
- Respect TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`
  are all on). Avoid `any`, `@ts-ignore`, and `@ts-expect-error` unless unavoidable and documented.
- Use shadcn/ui as the base for UI work. Add new primitives with `npx shadcn@latest add {name}`.
- Do not manually edit generated files in `src/app/components/ui/`.
- Keep components focused and under 200 lines when practical. Split oversized components.
- Every data-driven UI must handle loading, error, empty, and success states.
- Use TanStack React Query v5 for server state. Keep query keys in the module's `constants/`
  (`{resource}.keys.ts`).
- Put API access in module `api/{resource}.api.ts` files and query/mutation wrappers in module
  `hooks/{resource}.hooks.ts`.
- Build resource lists with `useListState` / `useListTable` from `@/app/components/data-table`.
  Importing `@tanstack/react-table` for values inside `src/modules/**` is an ESLint error.
- Get page headers from `@/app/components/page-header` presets. Its `internal/` Toolbar primitives
  are ESLint-blocked from `src/modules/**`.
- Use React Hook Form with Zod v4 for forms, and derive form types with `z.infer`.
- Use Tailwind utilities and `cn()` from `@/app/lib/utils` instead of inline styles or custom CSS.
- Do not introduce arbitrary colors or pixel values. Extend tokens in `src/app/styles/`.
- No `!important` Tailwind utilities in `src/modules/**` — ESLint blocks them.
- Match the existing design language and avoid generic AI-looking UI patterns.

## Important Notes

- Never commit `.env` files.
- Money columns arrive from `elli-core` as **strings** (Prisma `Decimal`). Never parse them with
  `z.number()`. The per-column wire types are pinned in
  `../elli-core/src/api/wire-format.snapshot.json`.
- Every `{ resource, action }` permission you reference must exist in
  `../elli-core/src/lib/permissions.ts`.

## Detailed References

For more specific conventions, see the rule files in `.claude/rules/`:

- `module-structure.md` — Module layout, where shared code goes
- `routing.md` — React Router v7 declarative mode, `routeTree`, titles and breadcrumbs
- `page-headers.md` — Header presets, `ActionDef`, permission gating
- `components.md` — shadcn/ui usage, component ownership
- `data-fetching.md` — TanStack Query v5, query keys, the list kit, wire format
- `forms.md` — React Hook Form + Zod v4
- `imports.md` — Path alias conventions and import order
- `error-handling.md` — Error patterns, toast usage, type-safe catch
- `styling.md` — Tailwind v4 CSS-first theming
- `typescript.md` — Strict mode, no `any`
- `ui-quality.md` — Anti-AI-aesthetic patterns
- `accessibility.md` — Keyboard, screen reader, semantic HTML
- `testing.md` — Ship a regression test with every change; how the suite runs
- `performance.md` — Earn every request: no loops, no waterfalls, reuse the cache
