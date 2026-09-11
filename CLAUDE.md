# elli-ui — agent entry point

Read this first. It orients you; the detail lives in `.claude/rules/*.md` and `AGENTS.md`, and
those are the source of truth for conventions. Do not duplicate them here.

## What this is

The web client for Elli, a construction-management app (projects, purchase orders, change orders,
invoices, monthly bills, vendors/GCs/contacts, HR, files, mail). It is a Vite + React SPA. The API
is a **separate repository**, `elli-core`, checked out alongside this one at `../elli-core`
(Hono + Bun + Prisma). There is no backend code in this repo.

Stack: Vite 7, React 19, TypeScript 5.9 (strict), Tailwind CSS v4 (CSS-first, no
`tailwind.config.js`), shadcn/ui on Radix, TanStack Query v5, TanStack Table v8 (behind a shared
kit), React Router v7 **declarative mode**, React Hook Form + Zod v4, Axios, Better Auth,
Recharts, Sentry, PostHog.

## Where things live

| Path | What |
| --- | --- |
| `src/main.tsx` | entry; mounts `<FrameWork />` |
| `src/index.tsx` | `<BrowserRouter>`, public + auth routes, `ProtectedLayout`, `app/*` |
| `src/app/` | the shell — providers, layouts, routing config, shared components/hooks/lib, styles |
| `src/app/components/` | **all shared components**, including `ui/` (shadcn — do not hand-edit) |
| `src/app/api/` | the axios client, auth client, access/permissions fetch |
| `src/app/routing/config/routes.tsx` | `routeTree` — the route registry |
| `src/app/styles/globals.css` + `styles/themes/*.css` | design tokens; four themes |
| `src/app/lib/utils.ts` | `cn()` — imported as `@/app/lib/utils` |
| `src/core/` | cross-cutting non-feature code: `auth/`, `pwa/`, `help/`, `ui/` (the dev UI kit) |
| `src/modules/{feature}/` | feature modules (`api/ components/ constants/ hooks/ pages/ routes/ schemas/`) |
| `tests/` | unit-ish `*.test.ts`; `tests/e2e/` is Playwright (`playwright.config.ts` → `testDir: './tests/e2e'`) |

There is **no** `src/components/`, `src/hooks/`, `src/stores/`, `src/types/`, `src/schemas/`, and
`src/lib/` holds only `fake-data.ts`. Shared code lives under `src/app/`. Older docs that say
otherwise are wrong; fix them if you hit one.

Path aliases (`tsconfig.app.json` + `vite.config.ts`): `@/*` → `src/*`, `@app/*` → `src/app/*`,
`@core/*` → `src/core/*`, `@modules/*` → `src/modules/*`. Both `@/app/...` and `@app/...` appear in
the codebase and both work — match the file you are editing.

## Commands

`bun.lock` is the lockfile that is actually maintained (the `Dockerfile` runs `bun install`);
`package-lock.json` is also committed but rarely updated. Install with `bun install`. The scripts
themselves behave the same under `npm run` or `bun run`.

- `npm run dev` — Vite dev server. `VITE_API_BASE_URL` must point at a running `elli-core`
  (`vite-elli-config.ts` records `http://localhost:9000` as the local API). Copy `.env.example`.
- `npm run lint` — ESLint. Must pass.
- `npm run build` — `tsc -b && vite build`. Must pass.
- `npm run format` / `format:check` — Prettier (it owns import order; do not hand-sort).
- `npm run test:e2e` — Playwright.

There is no unit-test script; the `tests/*.test.ts` files are not wired to a runner in
`package.json`. Do not claim "tests pass" from `npm run lint && npm run build`.

## Hard rules (the ones that cost the most rework)

1. **Routing is declarative mode.** `<BrowserRouter>` + `<Routes>`. There is no
   `createBrowserRouter` and no `RouteObject[]`. Register top-level routes in
   `src/app/routing/config/routes.tsx`; module routers live at
   `src/modules/{name}/routes/{name}.route.tsx` and render their own `<Routes>`. See
   `.claude/rules/routing.md`.
2. **Page headers come from `src/app/components/page-header`** via `ListPageHeader`,
   `DetailPageHeader` or `FormPageHeader`. The `Toolbar` primitives in `page-header/internal/` are
   blocked from `src/modules/**` by an ESLint rule in `eslint.config.js`. See
   `.claude/rules/page-headers.md`.
3. **Resource lists go through `src/app/components/data-table`** (`useListState`, `useListTable`).
   Importing `@tanstack/react-table` for values from `src/modules/**` is an ESLint error.
4. **No `!important` Tailwind utilities in `src/modules/**`** — also an ESLint error. Add a variant
   to the primitive instead.
5. **Money is a string on the wire.** `elli-core` stores money as Prisma `Decimal`, which
   `JSON.stringify` emits as a string. A client schema that parses it with `z.number()` throws and
   the page stops loading — this has already happened once (the general-contractors page). Use
   `z.string()` (or `z.coerce.number()` deliberately) and do arithmetic with `decimal.js` helpers
   such as `src/modules/project/lib/commercial-decimal.ts`. The authoritative per-column JSON types,
   nullability and enum values are pinned in `../elli-core/src/api/wire-format.snapshot.json`.
6. **Permissions are a fixed vocabulary.** Any `{ resource, action }` you write — in a `RouteDef`'s
   `access`, or an action's `enabled` — must exist in `../elli-core/src/lib/permissions.ts`
   (`statement`). Not every resource has every action (`leave` has only `create`/`approve`/`view`).
7. **Theme tokens live in `src/app/styles/`,** never as hex in a component. See
   `.claude/rules/styling.md`.
8. Never commit `.env`.

## Detail rules

`.claude/rules/` (each file also lists the globs it applies to):

| File | Covers |
| --- | --- |
| `module-structure.md` | module layout, where shared code goes |
| `routing.md` | declarative routing, `routeTree`, titles, breadcrumbs |
| `page-headers.md` | header presets, `ActionDef`, gating |
| `data-fetching.md` | TanStack Query v5, query keys, the list kit |
| `forms.md` | React Hook Form + Zod v4 |
| `components.md` | shadcn ownership, composition |
| `styling.md` | Tailwind v4 tokens and themes |
| `typescript.md` | strict mode, no `any` |
| `imports.md` | aliases and import order |
| `error-handling.md` | toasts, error states, typed catch |
| `accessibility.md` | keyboard, labels, Radix |
| `ui-quality.md` | anti-AI-aesthetic patterns |

`AGENTS.md` is the short cross-tool version of the same material.

## Running an agent from a parent directory (elli-monorepo)

This repo's agent context — `CLAUDE.md`, `.claude/rules/`, `AGENTS.md` — is written to be picked up
when the agent's working directory is the `elli-ui` checkout. Claude Code reads `CLAUDE.md` from the
working directory and its ancestors, and resolves `.claude/` against the project root, so starting
an agent one level up (in a monorepo wrapper that contains `elli-ui/` as a subdirectory) does **not**
pull this file in on its own.

If you work from a parent directory, do one of these — this is repo convention, not a tool feature:

- **Preferred: `cd` into `elli-ui` first.** Everything below is then automatic, including the ESLint
  and Prettier configs, which are also resolved from the working directory.
- **Or have the parent repo's own `CLAUDE.md` point here**, with lines such as:

  ```md
  ## Frontend
  Work in the `elli-ui/` checkout. Read @elli-ui/CLAUDE.md before touching it, and the rule
  files under `elli-ui/.claude/rules/` for whatever you are changing (routing, forms, styling…).
  Run `npm run lint` and `npm run build` from inside `elli-ui/`.
  ```

  `@path` references in a `CLAUDE.md` are how Claude Code pulls in another file's contents; a plain
  instruction to read the file works for any agent.
- **Or read this file explicitly** at the start of the session before editing anything under
  `elli-ui/`.

Do not copy the rule files up into a parent repo. A second copy goes stale and then contradicts this
one, which is exactly the failure this file exists to end.
