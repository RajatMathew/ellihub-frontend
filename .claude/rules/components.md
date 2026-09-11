---
paths:
  - "**/*.tsx"
---

# Component Rules

- Use **shadcn/ui** components as the foundation. Do not build custom components for things shadcn already provides.
- When adding a new shadcn component: `npx shadcn@latest add {component-name}`.
- shadcn/ui components live in `src/app/components/ui/` and are generated — **do not manually edit them**. Customize via wrapper components or `cn()` overrides (from `@/app/lib/utils`). A few carry comments explaining a deliberate local edit; read them before changing a primitive.
- Shared/global components live in `src/app/components/`. Module-scoped components live in `src/modules/{module}/components/`. See `rules/module-structure.md` for the sub-folder rule.

## Reach for the shared kit before building one

| Need | Use | Not |
| --- | --- | --- |
| A page header | `ListPageHeader` / `DetailPageHeader` / `FormPageHeader` from `@/app/components/page-header` | hand-assembled toolbars (ESLint-blocked in modules) |
| A resource list | `useListState` + `useListTable` + `DataTable` from `@/app/components/data-table` | `@tanstack/react-table` directly (ESLint-blocked in modules) |
| A create/edit form page | `FormPageShell` + `FormLayout`/`FormContent` + `FormSectionNav` in `@/app/components` | a bespoke form chrome |
| A query failure | `QueryErrorState` (`@/app/components/query-error-state`) | a local error `<div>` |
| A delete confirmation | `ResourceDeleteDialog` / `BulkDeleteDialog` | a bespoke `AlertDialog` |
| A status pill | `StatusBadge` (`@/app/components/status-badge`) + `status-tone.ts` | a `Badge` with hand-picked colors |
- One responsibility per component. If a component drifts into managing multiple concerns, split it.
- For the 200-line cap, required UI states (loading/error/empty/success), accessibility requirements, and design-system constraints, see `rules/ui-quality.md` — those rules apply to every component.
