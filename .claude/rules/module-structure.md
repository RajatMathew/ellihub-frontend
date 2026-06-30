---
alwaysApply: true
---

# Module Structure

## Project-root shared directories

Anything used across multiple modules lives at the **project root** (`src/`), not inside any module:

| Directory        | What goes here                                                                      |
| ---------------- | ----------------------------------------------------------------------------------- |
| `src/components` | Shared UI components (shadcn/ui in `ui/`, layout in `layout/`, custom in `common/`) |
| `src/schemas`    | Shared Zod schemas used by multiple modules (e.g., `uuid.schema.ts`)                |
| `src/hooks`      | Universal custom hooks shared across modules                                        |
| `src/constants`  | Global constants shared across modules                                              |
| `src/stores`     | Global Zustand stores for cross-cutting UI state                                    |
| `src/types`      | Global TypeScript types/interfaces                                                  |
| `src/lib`        | Shared utilities: `utils.ts`, `axios.ts`, `mock-server.ts`                          |

**Do not create a `modules/common` folder.** If something is used by more than one module, it belongs in one of the root-level directories above.

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
    routes/         — Module route definitions (exports RouteObject[])
```

## Rules

- **api/**: One file per resource/concern, named `{resource}.api.ts` (e.g., `projects.api.ts`, `tasks.api.ts`). All API calls for that resource live in a single file. Export the response types from the API file.
- **components/**: Components used by multiple pages/sections within the same module. If reusable across multiple modules, move to `src/components` at project root.
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
- **hooks/**: One file per section concern: `use-projects.ts`, `use-tasks.ts`, `use-members.ts`, etc. Universal hooks go in `src/hooks` at project root.
- **schemas/**: Zod schemas for validation and type extraction. Derive TypeScript types using `z.infer<typeof schema>` — do not duplicate type definitions manually. Schemas shared across modules go in `src/schemas` at project root.
- **constants/**: Module-scoped constants (query keys, enum-like objects). Shared constants go in `src/constants` at project root.
- **pages/**: Page-level components representing distinct sections/views of the module.
- **routes/**: Module route definitions. Each module exports a `RouteObject[]` that is composed into the global router.
