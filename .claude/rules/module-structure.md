---
alwaysApply: true
---

# Module Structure

## Shared directories

Anything used across multiple modules lives under **`src/app/`**, not inside any module, and not at
`src/` itself. (`src/` has no `components/`, `hooks/`, `stores/`, `types/` or `schemas/` folder —
older docs that say otherwise are stale.)

| Directory                     | What goes here                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `src/app/components`          | Shared UI. shadcn primitives in `ui/`, layout in `layouts/`, the rest at this level |
| `src/app/components/page-header` | The header presets — see `page-headers.md`                                      |
| `src/app/components/data-table`  | The resource-list kit: `useListState`, `useListTable`, `DataTable`, filters     |
| `src/app/hooks`               | Universal custom hooks (`use-debounced-value`, `use-breadcrumb-label`, …)           |
| `src/app/lib`                 | Shared utilities: `utils.ts` (`cn`), `helpers.ts`, `toast-api-error.ts`, …          |
| `src/app/api`                 | The axios client (`client.ts`), `auth-client.ts`, `access.ts`, `bulk-delete.ts`     |
| `src/app/contexts`, `src/app/providers` | Cross-cutting React context (access, breadcrumbs, layout, query)         |
| `src/app/routing/config`      | `routes.tsx` (`routeTree`), `sidebar.tsx`, `header.tsx`, `route-lookup.ts`          |
| `src/app/styles`              | `globals.css` + `themes/*.css` — all design tokens                                  |
| `src/core`                    | Cross-cutting non-feature areas: `auth/`, `pwa/`, `help/`, `ui/` (dev UI kit)        |

**Do not create a `modules/common` folder.** If something is used by more than one module, it
belongs in one of the directories above.

---

## Feature module structure

Feature code lives in `src/modules/{feature-name}/`. Each module follows this structure:

```
modules/
  {feature-name}/
    api/            — API calls for this module (one file per resource)
    components/     — Components scoped to this module
    constants/      — Constants scoped to this module (query keys, etc.)
    hooks/          — React Query hooks and custom hooks
    schemas/        — Zod schemas + derived TypeScript types
    pages/          — Page-level section/view components
    routes/         — Module route components, each rendering its own <Routes>
    lib/            — (optional) module-local pure helpers
```

**The canonical module to imitate is `src/modules/directory/`.** It is the cleanest example of every
rule below: three resources (vendors, GCs, contacts) sharing one module, `api/{resource}.api.ts`,
`constants/{resource}.keys.ts`, per-resource sub-folders under `components/`, `constants/` and
`hooks/`, and `routes/{resource}.route.tsx`. `src/modules/project/` is the largest module and shows
how the same structure scales; do not copy its size, copy its layout.

## Rules

- **api/**: One file per resource/concern, named `{resource}.api.ts` (e.g., `projects.api.ts`, `tasks.api.ts`). All API calls for that resource live in a single file. Export the response types from the API file.
- **components/**: Components used by multiple pages/sections within the same module. If reusable across multiple modules, move to `src/app/components`.
  - **Sub-folder rule**: When a module has components belonging to more than two distinct pages or feature areas, group them into named subfolders inside `components/`. Example:
    ```
    components/
      overview/          — overview section components
      tasks/             — task-related components
      members/           — member-related components
      files/             — file-related components
      shared/            — components shared across multiple sections in the module
    ```
  - Subfolders should be named after the page or feature they serve (not generic names like `common` or `misc`).
  - A component that is used by only one section belongs in that section's subfolder. A component shared across two or more sections belongs in `shared/`.
- **hooks/**: One file per section concern: `use-projects.ts`, `use-tasks.ts`, `use-members.ts`, etc. Universal hooks go in `src/app/hooks`.
- **schemas/**: Zod schemas for validation and type extraction. Derive TypeScript types using `z.infer<typeof schema>` — do not duplicate type definitions manually. Schemas shared across modules go next to the module that owns the concept, or in `src/app` if genuinely global — there is no `src/schemas`.
- **constants/**: Module-scoped constants (query keys, enum-like objects). Shared constants go in `src/app` beside the code that uses them — there is no `src/constants`.
- **pages/**: Page-level components representing distinct sections/views of the module.
- **routes/**: One file per top-level route the module owns, `{resource}.route.tsx`, default-exporting a component that renders a nested `<Routes>`. **Not** a `RouteObject[]` — the app is on React Router declarative mode. Register the matching entry in `src/app/routing/config/routes.tsx`. See `routing.md`.
- **lib/**: Pure helpers used only by this module (`src/modules/directory/lib/utils.ts`, `src/modules/project/lib/commercial-decimal.ts`). Anything a second module needs moves to `src/app/lib`.

## Naming, as the codebase actually spells it

| Thing            | Pattern                              | Real example                                              |
| ---------------- | ------------------------------------ | --------------------------------------------------------- |
| API file         | `{resource}.api.ts`                  | `src/modules/directory/api/vendors.api.ts`                 |
| Query keys       | `{resource}.keys.ts`                 | `src/modules/directory/constants/vendors.keys.ts`          |
| Other constants  | `{resource}.constants.ts`            | `src/modules/directory/constants/vendors.constants.ts`     |
| Hooks            | `{resource}.hooks.ts`                | `src/modules/directory/hooks/vendors.hooks.ts`             |
| Zod schema       | `{resource}.schema.ts`               | `src/modules/directory/schemas/vendor.schema.ts`           |
| Route            | `{resource}.route.tsx`               | `src/modules/directory/routes/vendors.route.tsx`           |
| Page             | kebab-case, one per view             | `src/modules/directory/pages/vendor-detail.tsx`            |

Inside a sub-folder the convention loosens: component sub-folders (`components/vendors/`) carry an
`index.ts` barrel and are imported through it; hook and constant sub-folders are named for what they
serve (`hooks/vendors/use-save-vendor.ts`, `constants/vendors/vendor-list.constants.ts`).
