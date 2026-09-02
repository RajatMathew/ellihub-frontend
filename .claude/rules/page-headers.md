# Page Headers

Every list, detail, and form page gets its header from
[`src/app/components/page-header`](../../src/app/components/page-header). That directory's
`index.ts` is the only entry point — modules import from it and nowhere else.

See [`docs/page-header-plan.md`](../../docs/page-header-plan.md) for how the consolidation was done
and why each decision was taken.

## Pick a preset

| Preset | Use for | Fills |
| --- | --- | --- |
| `ListPageHeader` | a page listing records | title, summary, actions, tabs |
| `DetailPageHeader` | a single record | back link, entity title, status, meta, actions, panel |
| `FormPageHeader` | a create or edit form, inside `FormPageShell` | back link, title, cancel + submit |

Drop to `PageHeader` only for a header no preset describes. If you find yourself reaching for it
twice for the same shape, that shape wants a preset.

## Rules

- **Never import the `Toolbar` primitives.** They live in `page-header/internal/` and an ESLint rule
  blocks them from `src/modules/**`. Hand-assembling a header from them is what produced five
  competing header systems.
- **One `<h1>` per page, and the header owns it.** Do not write a page title as raw markup.
- **Actions are data, not markup.** Pass `ActionDef[]`; use `leadingActions` / `trailingActions`
  only for a control the model genuinely cannot express — an external `<a href>`, a component that
  owns its own visibility like `MockDataButton`.
- **Gate on the action, never on the page.**

  ```ts
  actions={[
    { label: 'Edit', icon: Pencil, to: 'edit', enabled: { resource: 'vendor', action: 'update' } },
    { label: 'Archive', icon: Trash2, placement: 'overflow', destructive: true,
      onClick: onArchive, enabled: [canArchive, isInactive] },
  ]}
  ```

  A boolean covers entity-scoped capabilities the server returns per record and record state; a
  `{ resource, action }` ref resolves through `useAccess().can()`; an array requires every
  condition. An action whose capability is unmet never renders, so a page cannot forget to gate one.
  Verify the resource and action against `elli-core/src/lib/permissions.ts` — `leave`, for one, has
  no `update` or `delete`.
- **Destructive actions belong in `overflow`** with `destructive: true`. The header sorts them last
  behind a separator.
- **Never render a breadcrumb trail in a page.** `HeaderBreadcrumbs` draws it once, globally, from
  the route tree. A page with a dynamic crumb registers it with `useBreadcrumbLabel`.
- **Never hand-type a back link.** `DetailPageHeader` resolves it from the route. Passing `backTo`
  is for a destination the route cannot express, and it is how "Vendors" ended up pointing at
  `/app/directory`.
- **Tabs go through the header's `tabs` prop**, which renders `PageTabs`. Radix `Tabs` is for tabs
  inside a card, not for page sections.
- **Loading states use `PageHeaderSkeleton`.** List pages skeleton the descriptor only — their title
  is known before the data. Detail pages skeleton the whole header, because the title is the
  record's name.

## Naming things

Page titles, back-link labels and crumb labels all come from the route tree
(`src/app/routing/config/routes.tsx`). Renaming a section is one edit there, not a search for the
string. `breadcrumb.entityLabel` declares the singular record name and drives the `Create X` /
`Edit X` titles, the placeholder crumb, and the back link together.
