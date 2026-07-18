# NexusHub Frontend (AI Guide)

This project uses Vite 8, React 19, TypeScript 6 (strict mode), Tailwind CSS v4, shadcn/ui (Radix Nova), TanStack React Query v5, React Router v7, React Hook Form, Zod v4, Zustand v5, Axios, and Recharts.

## Commands

- `npm run dev` starts the dev server (Vite).
- `npm run build` runs TypeScript type-check + production build.
- `npm run lint` runs ESLint and should pass before work is considered complete.
- `npm run preview` previews the production build locally.

## Architecture

- `src/app/` contains the app shell: root component, providers, global router, and `globals.css` (now `index.css`).
- `src/components/` contains shared components: `ui/` (shadcn/ui primitives — DO NOT EDIT), `layout/` (shell, sidebar, header), `common/` (PageHeader, EmptyState, etc.).
- `src/modules/` contains feature modules with `api/`, `components/`, `constants/`, `hooks/`, `schemas/`, `pages/`, and `routes/`.
- `src/hooks/`, `src/constants/`, `src/lib/`, `src/stores/`, `src/types/` contain shared app-level code.
- `src/lib/mock-server.ts` provides the in-memory mock API layer.

## Routing

- **Global router**: `src/app/router.tsx` composes module-level route arrays.
- **Module routes**: Each module exports a `RouteObject[]` from `modules/{name}/routes/index.tsx`.
- Use `react-router-dom` v7 Data Mode APIs (`createBrowserRouter`, `RouteObject`, `Outlet`).

## Working Rules

- Use `@/` imports instead of deep relative paths.
- Prefer named exports.
- Respect TypeScript strict mode. Avoid `any`, `unknown`, `@ts-ignore`, and `@ts-expect-error` unless unavoidable and documented.
- Use shadcn/ui as the base for UI work. Add new primitives with `npx shadcn@latest add {component-name}`.
- Do not manually edit generated files in `src/components/ui/`.
- Keep components focused and under 200 lines when practical. Split oversized components.
- Every data-driven UI must handle loading, error, empty, and success states.
- Use TanStack React Query v5 for server state. Keep query keys in module `constants/`.
- Put API access in module `api/` files and query/mutation wrappers in module `hooks/`.
- Use Zustand only for client-side UI state, not API responses.
- Use React Hook Form with Zod v4 for forms, and derive form types with `z.infer`.
- Use Tailwind utilities and `cn()` from `@/lib/utils` instead of inline styles or custom CSS.
- Do not introduce arbitrary colors or arbitrary pixel values. Extend tokens in `src/index.css`.
- Match the existing design language and avoid generic AI-looking UI patterns.

## Important Notes

- Never commit `.env` files.
- All API calls go through the mock server during development.

## Detailed References

For more specific conventions, see the rule files in `.cursor/rules/` or `.claude/rules/`:

- `components.md` — shadcn/ui usage, component ownership
- `data-fetching.md` — TanStack Query v5, Zustand v5
- `error-handling.md` — Error patterns, toast usage, type-safe catch
- `forms.md` — React Hook Form + Zod v4
- `imports.md` — `@/` alias conventions
- `module-structure.md` — Module layout, sub-folder rule
- `routing.md` — React Router v7 Data Mode, module routing
- `styling.md` — Tailwind v4 CSS-first theming
- `typescript.md` — Strict mode, no `any`
- `ui-quality.md` — Anti-AI-aesthetic patterns
- `accessibility.md` — Keyboard, screen reader, semantic HTML
