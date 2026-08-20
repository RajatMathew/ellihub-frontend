# Table Unification — Working Checklist

Collapsing six competing table systems into one shared kit at
[`src/app/components/data-table/`](../src/app/components/data-table).

**Status: 12 of 17 list tables migrated.** `DataGridSection` consumers: 16 → 4.

## Legend

| Mark | Meaning |
| --- | --- |
| `- [x]` | Done — builds, typechecks, lints, and behaviour checked against the original |
| `- [ ] 🔄` | In progress |
| `- [ ]` | Not started |
| `- [ ] ⛔` | Blocked — reason inline |

Only tick `[x]` after the page has been diffed against its original for behaviour,
not just compiled.

---

## The kit — done

938 LOC across 8 files. Every capability below was added because a real page
needed it, never speculatively.

- [x] `types.ts` — `FilterDef` union, typed `FilterValues` mapping
- [x] `filters.ts` — `f.*` builders, URL read/write
- [x] `use-list-state.ts` — all URL state derived from the schema
- [x] `use-list-table.ts` — TanStack wiring, page clamp, loading flags, client filters
- [x] `data-table-filters.tsx` — schema → header controls
- [x] `data-table.tsx` — card + header + body + pagination
- [x] `constants.ts`, `index.ts`
- [x] `mode: 'client'` — for lists whose query returns everything at once
- [x] `replaceBody` — for states where the list cannot exist (unconnected integration)
- [x] `extraLoading` — a dependency query the list cannot render without
- [x] Required `ariaLabel` on `DataTable`
- [x] `f.infiniteSelect` — a picker backed by its own paginated query
- [x] `onClear` on every filter — resets companion local state the URL cannot see
- [x] `filters` render override on `DataTable` — same keys, live data attached, for
      controls whose options depend on the query results
- [x] `f.hidden` — a filter with no control, arriving by deep link
- [x] Controlled `columnVisibility` — a column's visibility can depend on the rows
- [x] `toApiValue` — URL values are strings; a request may want a boolean or number
- [x] `setSort` ignores column ids that are not declared sort fields

### Defects killed by construction

- [x] **Sort-order rule** — was written with hardcoded literals on 11 of 13 pages.
      Now compared against each list's configured defaults, so changing a default
      cannot silently break its URLs.
- [x] **Loading semantics** — initial-load vs background-refresh were derived
      differently per page. One derivation now.
- [x] **Page-size options** — `parseSizeParam` and `DataGridPagination` each
      hardcoded `[5,10,25,50,100]`. Single `PAGE_SIZE_OPTIONS` in `helpers.ts`.
- [x] **Debounce cancellation** — a pending keystroke could reinstate a search the
      user cleared via browser back. `useCancellableDebouncedCallback`.
- [x] **Table had no accessible name** — violated `rules/accessibility.md`, affected
      all 16 tables. `tableAriaLabel` threaded through the grid stack.
- [x] **Cost codes' sorting was decorative** — headers were built with
      `DataGridColumnHeader` but no sorting state was ever wired.
- [x] **Filter value types** — `toApiValue` converts a URL string into whatever the
      request wants. Applied to invoices' `isPaid`, which the frontend schema
      declares as a boolean. **Not a live defect:** verified against the API, which
      accepts either form (`invoice/service.ts`: `isPaid === 'true' || isPaid === true`),
      and both serialise identically over a query string. The conversion is correctness
      against the declared type, not a fix.
- [x] **Clearing all filters left picker search boxes populated** — `onClear` lives
      on the schema copy carrying live data, but `clearFilters` walked the copy held
      in state. The rendered schema now drives clearing.
- [x] **Refetch showed no feedback** — the cards the kit replaced redrew the whole
      grid as skeletons on every background refetch; the first migrations then
      reported only the initial load, so a refetch showed nothing. Both replaced by
      the shared inline indicator.

---

## Migrations

### Done — 8

| Page | Before | After | Notable |
| --- | ---: | ---: | --- |
| [departments](../src/modules/hr/pages/departments/department-list.tsx) | 165 | 119 | pilot |
| [pto](../src/modules/hr/pages/pto/pto-list.tsx) | 202 | 143 | |
| [contacts](../src/modules/directory/pages/contacts.tsx) | 209 | 159 | first query-driven filter options |
| [prime-change-order](../src/modules/project/pages/prime-change-order/prime-change-order-list.tsx) | 221 | 177 | `f.custom` ×2, `replaceBody`, `extraLoading` |
| [lookup](../src/modules/lookup/pages/lookup-list.tsx) | 145 | 178 | first `mode: 'client'`; filters gained URL state |
| [cost-codes](../src/modules/catalog/pages/cost-codes.tsx) | 164 | 141 | first `apiKey` remap |
| [vendors](../src/modules/directory/pages/vendor-list.tsx) | 192 | 135 | `limit` not `size` |
| [gc](../src/modules/directory/pages/gc-list.tsx) | 188 | 145 | `limit` not `size` |

Lookup grew because its inline column definitions moved to their own file, matching
every other module. Across both files it still shrank, 317 → 259.

**24 files deleted:** 7 table cards, 9 list params hooks, 8 filter/table components.

### Next — the project group

These four share two dependencies, so they move together rather than each bending
around an escape hatch.

- [x] **`f.infiniteSelect`** — `InfiniteSearchSelect` appears in invoice and
      purchase-order filters. Four `f.custom` calls would have tripped the health
      signal below, so it became a first-class kind.
- [x] **Selected-option label cycle** — a picker's trigger shows a name rather than
      a raw id by looking the label up in the rows on screen, which put the picker
      after the query and the query after the schema. Solved by declaring the picker
      keys up front with no live data: `useListState` only reads `key`/`apiKey`, so
      the request params and `clearFilters` work from the shell, and the loaded
      options are attached afterwards via `DataTable`'s `filters` prop.
- [ ] **Merge the two tab components** — `ProjectFilterTabs` and
      `TableCardHeaderTabs` render near-identically (same mono/xs/uppercase/tracking,
      same active underline); they differ only in mobile wrapping. Four project pages
      use one, three use the other.
- [x] [invoice](../src/modules/project/pages/invoice/invoice-list.tsx) — tabs + 2 infinite pickers · 202 → 190
- [x] [purchase-order](../src/modules/project/pages/purchase-order/purchase-order-list.tsx) — tabs + picker + mobile card + `columnVisibility` · 246 → 232
- [x] [sub-change-order](../src/modules/project/pages/sub-change-order/sub-change-order-list.tsx) — tabs + mobile card · 170 → 110
- [x] [rfq](../src/modules/project/pages/rfq/rfq-list.tsx) — scroll-arrow tabs in the title slot + client-side `track` · 222 → 205

⚠️ One mobile card left inline in a component due for deletion:
`employees-table-card.tsx:93`. Purchase order's and sub change order's are already
extracted to their own files.

### Then — the remainder

- [ ] [employees](../src/modules/hr/pages/employees/employee-list.tsx) — search only, mobile card
- [ ] [members](../src/modules/settings/pages/members-page.tsx) — 3 selects
- [ ] [activity-log](../src/modules/activity-log/pages/activity-log-list.tsx) — 2 selects; calls `useResourceListParams` directly, no wrapper hook
- [ ] [categories](../src/modules/catalog/components/categories-table-card.tsx) — self-contained, search only

### Last — files

Deliberately last. Needs `renderRows`, `onRowClick`, sectioned grouping,
`motion/react` row animation, a date-range popover and a list/grid toggle at once.
Only consumer of the `DataGridTableBase` sub-primitives and the only direct
`flexRender` caller.

- [ ] `renderRows` hatch
- [ ] `onRowClick` hatch
- [ ] `f.dateRange` — removed from the kit until something implements it; files is that something
- [ ] [files-explorer](../src/modules/files/components/files-explorer.tsx) + [use-files-table](../src/modules/files/hooks/use-files-table.tsx) + [files-list-table](../src/modules/files/components/files-list-table.tsx)

⛔ **If a third hatch is needed, stop.** Leave files on its custom render and
document it as a sanctioned exception. Bending the kit for one screen is how kits die.

---

## Cleanup — after the last migration

All verified zero-consumer today.

- [ ] [`section-table.tsx`](../src/core/ui/components/sections/section-table.tsx) — 287 LOC, demo page only
- [ ] Its exports in [`sections/index.ts`](../src/core/ui/components/sections/index.ts)
- [ ] Its usage in [`core/ui/pages/page.tsx`](../src/core/ui/pages/page.tsx) — replace with a `DataTable` demo
- [ ] [`data-grid-table-dnd.tsx`](../src/app/components/ui/data-grid-table-dnd.tsx) — 194 LOC, 0 importers
- [ ] [`data-grid-table-dnd-rows.tsx`](../src/app/components/ui/data-grid-table-dnd-rows.tsx) — 158 LOC, 0 importers
- [ ] `expandedContent` in `ColumnMeta` — declared, never read
- [ ] Duplicate `XListParamPatch` aliases
- [ ] `useResourceListParams` — once the last consumer moves
- [ ] `no-restricted-imports` for `@tanstack/react-table` scoped to `src/modules/**`
      (must still allow `type { ColumnDef }` until column factories land)
- [ ] Rewrite [`table-card-header-pattern.md`](./table-card-header-pattern.md) — it
      documents the pattern this kit replaces

---

## Parallel tracks

### Track A — column and cell factories

Not started. **1,814 LOC across 11 `*-column-cells.tsx` files**, mostly identical
dropdown scaffolds and name/skeleton pairs. Largest single dedup target left.
Deliberately deferred until more real cell files have been read, so the shared
dropdown is designed against evidence.

- [ ] `columns/row-actions.tsx` — ghost icon button, `stopPropagation`, aria-label,
      `align="end"`, permission-conditional items, destructive separator
- [ ] `columns/column-factories.tsx` — `col.text` / `currency` / `date` / `badge` /
      `link` / `actions` / `custom`
- [ ] Skeleton presets replacing inline `<Skeleton>` markup
- [ ] Retrofit across every migrated page

### Track B — detail line tables

Independent of the list kit. 5 copy-paste raw `<table>` blocks sharing identical
markup. Static, unpaginated, unsorted — the list kit is the wrong tool.

- [ ] `<DetailTable columns rows />` (~80 LOC)
- [ ] `purchase-order-detail-line-items-card.tsx:117`
- [ ] `rfq-detail-deliverables-card.tsx:68`
- [ ] `rfq-vendor-desktop-table.tsx:28`
- [ ] `sub-change-order-detail.tsx:826` and `:969`

Leave alone — both justified: `line-items.tsx:521` (editable RHF grid),
`file-preview-dialog.tsx:431` (CSV/XLSX preview).

### Track C — monthly-bills 🚫 keep separate

12 files, own column-key system, grouped by project, inline-editable, bulk save.
It is a matrix editor, not a list. Share only `TableCardHeader` and the filter schema.

### Track D — project-list

Hand-rolled 6-column CSS grid, no TanStack, most-used screen in the app.

- [ ] **Decide:** port to the kit (uniform, loses the custom row design) or keep as
      a deliberate card list. Do not leave undecided.

---

## Open items

- [ ] ⛔ **Runtime verification.** Nothing has been clicked through. The dev server
      boots clean with no React errors, but the sign-in wall needs real credentials.
      Search, sort, pagination and the delete flows on the 8 migrated pages are
      unverified.
- [ ] **Test coverage.** No unit tooling; 17 Playwright specs exist and none touch a
      list table. Worth adding before the remaining 9 migrations, not after.
- [ ] **Branch history.** `feat/data-table-kit` carries a malformed commit titled `@`
      plus a merge commit, from a push that happened before the message was fixed.
      Content is correct (identical trees). Cleaning it needs a force-push.

---

## Verified against the API

Checked in `elli-core` rather than inferred from the frontend Zod schemas.

**Confirmed correct:**

- `apiKeys: { size: 'limit' }` for vendors and GCs — their API layer remaps
  `limit` → `size` on the wire, which is what `paginationMiddleware` reads.
- `apiKey: 'costCodeCategoryId'` for cost codes — matches the module's query schema.
- `f.hidden({ key: 'rfqId' })` for purchase orders — an accepted service filter.
- Prime change order's eight sort fields match `primeChangeOrderSortFields` exactly.
- The paginated response shape (`totalItems`, `totalPages`, `hasNextPage`) comes from
  the shared middleware, so it is uniform by construction.

**✅ Fixed on `elli-core` branch `fix/list-sort-fields`.** Originally reported as:

**Pre-existing product bug — server-side sorting was inert on most lists.**

`paginationMiddleware` validates the requested sort field against `allowedSortFields`:

```ts
const sortBy = query.sortBy && allowedSortFields.includes(query.sortBy)
    ? query.sortBy
    : defaultSortBy;
```

`allowedSortFields` defaults to `[]`, and `[].includes(x)` is always false — so any
module that omits the option pins every request to its `defaultSortBy`.

Only **vendor** and **prime-change-order** declared it. Nine endpoints now do:
gc, contact, department, pto, cost-code, invoice, po, sco and rfq. Every field was
checked against its Prisma model first, since an unknown key reaches `orderBy`
directly and throws. Deliberately excluded: `po.documents` and
`rfq.estimatedBudget` (not columns). `pto.employee.name` gained a nested
special-case in its service instead, matching how GC handles `type` and departments
handle `employeeCount`.

Activity-log and employee were left alone — neither has a sorting UI.

Vendor has a narrower version of the same issue: the frontend lists `type` as a sort
option while the API allows `typeId`. Dormant, because that column sets
`enableSorting: false`, so it cannot be triggered.

## Rules the kit enforces

- Filters are **data, not JSX**. A `FilterDef` owns its URL key, API key, parser and
  what counts as unset, so `hasActiveFilters` and `clearFilters` are derived.
- Declare schemas at **module scope**. A fresh array every render churns every memo
  downstream. When options come from a query, memoize.
- No module imports `@tanstack/react-table` except through a hatch.
- **Health signal:** if `f.custom` or `renderRows` is reached for more than twice,
  the schema is too narrow — widen it rather than accumulating exceptions.
  (This is what moved `InfiniteSearchSelect` to a first-class kind.)
- Prettier only the files you touched. Running it across a whole module tree once
  swept 111 files into a 9-file commit.
- `DataTable` composes `DataGridSection`; it does not override it. Body changes
  belong in `DataGridSection` itself.

## Not in scope

Theme and visual changes, bulk actions, row selection. A table refactor that edits
the sign-in page has lost the plot.
