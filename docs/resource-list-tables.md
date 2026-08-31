# Resource List Tables

Every resource list in the app is built with the shared kit in
[`src/app/components/data-table`](../src/app/components/data-table). Do not hand-roll
another one, and do not import `@tanstack/react-table` from a module for anything
but a `ColumnDef` type — an ESLint rule enforces that.

## The shape

A list page declares its filters as data, hands them to `useListState`, runs its own
query, and passes both to `useListTable`. `DataTable` renders the result.

```tsx
const VENDOR_FILTERS = [
  f.tabs({ key: 'type', options: typeTabs, isLoading: isTypesLoading }),
  f.search({ placeholder: 'Search vendors...' }),
  f.select({ key: 'status', placeholder: 'All Statuses', options: STATUS_OPTIONS }),
];

const state = useListState({
  filters: VENDOR_FILTERS,
  pageSize: VENDORS_DEFAULT_PAGE_SIZE,
  sort: { by: 'name', fields: VENDORS_SORT_BY_OPTIONS, order: 'asc' },
  apiKeys: { size: 'limit' },
});

const query = useVendorsQuery(state.apiParams as ListVendorsParams);

const list = useListTable({
  columns,
  getRowId: (vendor) => vendor.id,
  query,
  rows: query.data?.data ?? [],
  state,
  totalCount: query.data?.pagination?.totalItems ?? 0,
});

<DataTable
  ariaLabel="Vendors"
  empty={{ icon: <Package />, title: 'No vendors yet', description: '…' }}
  error={{ title: 'Failed to load vendors' }}
  list={list}
  state={state}
/>;
```

Because the schema owns each filter's URL key, API key, parser and what counts as
unset, `hasActiveFilters`, `clearFilters` and the request params are all derived. No
module hand-maintains them.


## Filter kinds

| Builder | Control |
| --- | --- |
| `f.search` | Debounced search box. Draft text is local; the URL holds the committed value. |
| `f.select` | Single select. `isLoading` renders a skeleton while options load. |
| `f.tabs` | Tab strip in the header's title slot. |
| `f.infiniteSelect` | Picker backed by its own paginated query. |
| `f.dateRange` | From/to date pair behind one trigger. Two typed bounds. |
| `f.hidden` | No control. Arrives by deep link, still reaches the request and `clearFilters`. |
| `f.multiSelect` | Several values from a fixed option set. Searched in the browser. |
| `f.infiniteMultiSelect` | Several values from a paginated query. The infinite twin of the above. |
| `f.dateRangePopover` | The same trigger, with presets and a calendar. For picking dates visually. |
| `f.toggleGroup` | Segmented single choice — a view mode, a short option set. |
| `f.numberRange` | Min/max pair behind one trigger. Takes a `prefix` (`$`) and a `formatValue`. |
| `f.sortSelect` | Sorts from the header rather than a column header. Owns no key; writes through `setSort`. |
| `f.custom` | Anything else. If you reach for this more than twice across the app, widen the schema instead. Currently unused. |

Options shared by every kind: `apiKey`, `parse`, `serialize`, `toApiValue`,
`defaultValue`, `clientPredicate`, `onClear`, `label`, `persistent`.

## Multi-value filters

A multi filter's URL value is a **comma-separated string**, not an array — and
so is the value it sends. Two constraints force it and they meet in the middle:
`useUrlParamPatch` writes with `URLSearchParams.set`, one value per key, so a
repeated param cannot be written; and the API reads through Hono's
`c.req.query()`, which returns only the *first* value of a repeated key, so a
repeated param could not be read either.

Keeping the value a string is also what lets the kinds drop into the schema
untouched: `rawValues`, `clearFilters`, `hasActiveFilters` and the chips all keep
working on `string | undefined`.

Read the selection as a list off `state.listValues[key]`, and write it with
`state.setFilterListValue(key, ids)` — the kit serializes:

```tsx
const vendorPicker = useVendorMultiFilterOptions({
  search: vendorSearch,
  selectedIds: state.listValues.vendorId ?? [],
});
```

On the API side, name the key in `paginationMiddleware`'s `multiValueFields` and
build the `where` with `idFilter` / `enumFilter` from `@utils/filters`. A single
value still compiles to a scalar equality, so existing links keep working.

**Selected labels come from the source, not the rows.** A single-value picker can
recover its label from the rows on screen — the one vendor being filtered on owns
every row. A multi-value one cannot: filter by three vendors and the third may own
no row on this page, so its badge would read as a raw id, and on a deep link every
badge would. Resolve them with `useOptionsByIds` against an endpoint that takes an
`ids` filter, and pass the result as `selectedOptions`.

Its chip names the first selection and counts the rest (`Acme Steel +2`), and
removing it clears the filter. Per-value removal already exists on the badges
inside the control's own trigger.

`persistent` marks a control that lives in the filter row and the URL without
being a filter — a view toggle, a sort select. `clearFilters` skips it and
`hasActiveFilters` ignores it, so clearing filters cannot switch the user back to
list view or reset the sort.

`f.search` also takes `scope`: a segmented control inside the input narrowing
what the search covers. The scope key is owned by the search and cleared with it.

## Ranges

All three range kinds — `numberRange`, `dateRange`, `dateRangePopover` — render through
one `RangePopover`: a trigger that reads as the applied range, a titled panel,
and a Clear/Apply footer. Only the fields inside differ. Build a new range on
that shell rather than putting bare inputs in the header, which is what the
first two used to do and what cost the header two slots per range.

Values are pending until Apply, so typing a bound does not fire a request per
keystroke, and there is somewhere to catch a minimum above its maximum before it
becomes a query that can only return nothing.

**A filter owning more than one key must commit through `setFilterValues`.** Two
`setFilterValue` calls in a tick lose the first: each starts its own navigation,
and the second reads a location the first has not landed in yet.

## Columns

Columns are declared as data too. Each kind owns alignment for the header *and*
the cell, its width, its skeleton, and whether it sorts.

```tsx
const columns = [
  col.link({ key: 'name', title: 'Vendor', to: (v) => v.id, label: (v) => v.name, width: 'xl' }),
  col.status({ key: 'status', title: 'Status', value: (v) => v.status }),
  col.currency({ key: 'balance', title: 'Balance', value: (v) => formatCurrency(v.balance) }),
  col.actions({ label: (v) => v.name, items: (v) => [{ label: 'Edit', to: `${v.id}/edit` }] }),
];
```

| Builder | Cell |
| --- | --- |
| `col.text` | Text, optionally with a quieter second line. |
| `col.link` | The cell that opens the record — a real `<Link>`, so it is keyboard- and middle-click-friendly. |
| `col.currency` | Right-aligned and tabular. |
| `col.date` | Tabular, optionally muted. |
| `col.status` | `StatusBadge`, resolved through the shared tone vocabulary. |
| `col.actions` | The `⋯` menu. Pass `items`, or `cell` when the actions depend on a query. |
| `col.custom` | Anything else. Still gets width, align and skeleton. |

**Never set alignment through `headerClassName`.** `text-align` does not reach a
sortable header, which renders a flex row. Use `align` on the column; the kit
applies `justify-*` to the head and `text-*` to the cell.

**Do not set `enableSorting`.** `useListTable` derives it from the list's declared
`sort.fields`, so a column can never render a sort control that does nothing.

**Widths come from `COLUMN_WIDTHS`** — `xs` through `xl`, plus a fixed `actions`.

## Queries

List queries go through `useListQuery`, which pins
`placeholderData: keepPreviousData`. Without it a filter change empties the body
and the whole table redraws as skeletons. Everything `useQuery` takes still
passes through.

Not for `mode: 'client'` lists: their query key never changes.

## Detail tables

A static table on a detail page — line items, deliverables — uses `DetailTable`,
not the list kit and not a raw `<table>`. It takes the same spacing and colour
tokens as the data grid, so a line-item table and a resource list read as the
same kind of object.

## Bulk selection and bulk delete

A list with a delete action can offer bulk delete. Pass `selection` to `useListTable`
and `bulkActions` to `DataTable`; the kit supplies the checkbox column, the bar that
takes over the header, the count and the Clear control.

```tsx
const DEPARTMENT_ITEM_LABEL = { many: 'departments', one: 'department' };

const DEPARTMENT_SELECTION: ListSelectionConfig<Department> = {
  canSelect: canDeleteDepartment,
  getRowLabel: (department) => department.name,
  ineligibleReason: DEPARTMENT_DELETE_BLOCKED_REASON,
};

const list = useListTable({
  /* … */
  selection: canDelete ? DEPARTMENT_SELECTION : undefined,
});

const bulkDelete = useBulkDeleteDepartmentsMutation(
  useCallback(() => {
    list.selection.clear();
    setBulkDeleteOpen(false);
  }, [list.selection])
);

<DataTable
  bulkItemLabel={DEPARTMENT_ITEM_LABEL}
  bulkActions={
    <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
      <Trash2 className="size-3.5" />
      Delete
    </Button>
  }
  /* … */
/>

<BulkDeleteDialog
  failures={bulkDelete.failures}
  isPending={bulkDelete.isPending}
  itemLabel={DEPARTMENT_ITEM_LABEL}
  items={list.selection.items}
  open={isBulkDeleteOpen}
  onConfirm={() => bulkDelete.run(list.selection.ids)}
  onOpenChange={(open) => {
    setBulkDeleteOpen(open);
    if (!open) bulkDelete.reset();
  }}
/>;
```

`list.selection` gives `count`, `ids`, `rows`, `items` (`{ id, label }` pairs for the
dialog) and `clear()`.

### The module side

Two small pieces per resource, following the usual layering:

```ts
// api/{resource}.api.ts
bulkRemove(ids: string[]): Promise<BulkDeleteResult> {
  return bulkDeleteRequest(`${BASE}/bulk-delete`, ids);
},

// hooks/{resource}.hooks.ts
export const useBulkDeleteDepartmentsMutation = (onDeleted?: (ids: string[]) => void) => {
  const qc = useQueryClient();
  return useBulkDelete({
    itemLabel: { many: 'departments', one: 'department' },
    mutationFn: departmentsApi.bulkRemove,
    onDeleted,
    onInvalidate: () => {
      void qc.invalidateQueries({ queryKey: departmentsKeys.all });
    },
  });
};
```

### Rules for bulk delete

- **A batch can come back half-done.** `POST /{resource}/bulk-delete` runs the
  single-record delete per id — same guards, same activity log — and is deliberately
  not one transaction, so a record blocked by its own rules cannot roll back the
  rest. Never collapse the result to a single success: the dialog lists what failed
  and why.
- **`canSelect` must be the row menu's rule, and the same function.** Extract the
  predicate once and use it in both, or the checkbox will offer what the menu
  refuses. Ineligible rows render disabled with `ineligibleReason` as the tooltip.
- **Gate `selection` on the permission**, not just the button. Without the
  permission there is no checkbox column at all.
- **`getRowLabel` is required.** Twenty checkboxes labelled "Select row" is not a
  table anyone can use with a screen reader, and the confirm dialog names what it is
  about to delete from the same function.
- **Select-all is page-scoped and stays that way.** Selection survives paging, so
  selecting each page works; "select all 240" on a destructive action does not,
  because the user cannot see what they are agreeing to.
- **Selection resets when the result set changes** — any filter, the sort, or the
  page size. It deliberately survives paging. A list that navigates by state the
  filter schema does not hold names it in `scope`: Files passes its folder and
  search scope, or checked rows would follow the user into another folder.
- **`ineligibleReason` may be a function** when the reason belongs to the row —
  a file names the record holding it, rather than only saying something does.
- **Turning selection off clears it.** Passing `selection: undefined` — Files
  does in grid view, where there are no checkboxes — drops the checked ids
  rather than leaving a count nothing on screen can clear.
- **Keep the config object at module scope.** A fresh object every render rebuilds
  the column list every render.

## Rules

- **Declare schemas at module scope.** A fresh array each render gives `values` and
  `apiParams` new identities every render and churns every memo downstream. When
  options come from a query, memoize.
- **`toApiValue` when the request wants a non-string.** URL values are always
  strings; a boolean or number needs converting.
- **`clientPredicate` for filters the API cannot do.** They narrow the rows already
  on screen, and never reach the request.
- **`mode: 'client'`** when a query returns the whole collection at once. Sorting and
  pagination then happen in memory, while the URL still drives them so the view stays
  shareable. Never mix that with a paginated request.
- **Sort fields must match the API.** `allowedSortFields` on the endpoint decides
  what actually sorts; a field the API rejects silently falls back to its default.
- **`ariaLabel` is required.** Every table needs an accessible name.
- **`getRowId`** should be a stable business id, never a row index.

## Escape hatches

Each exists because a real screen needed it. In order of preference:

| Hatch | Use |
| --- | --- |
| `list.table` | Raw TanStack instance. |
| `columnVisibility` | Controlled — a column's visibility may depend on the rows. |
| `extraLoading` | Another query the list cannot render without. |
| `filters` prop | Render definitions with live data attached, when options depend on query results. |
| `replaceBody` | The list cannot exist at all (an unconnected integration, say). Not for an empty result. |

## What this kit is not for

It covers **paginated resource lists**. Two screens sit outside it deliberately:

- **`project-list`** loads by infinite scroll with a kanban board as a second view
  mode. It has no pagination at all, so `useListTable` has nothing to drive.
- **`monthly-bills`** is a matrix editor — grouped by project, inline-editable, with
  bulk save. It is not a list.

Neither is a gap to close. Adding an infinite-scroll mode for one consumer would be
the same mistake as bending `DataTable` around `files`.

## The one exception

`files` uses the kit for state only and renders its own body. Its body swaps between
a sectioned table and a card grid, rows navigate on click, its error state renders
outside the grid, and its header shares no controls with the schema — a date popover
with presets, sorting via a select, a view toggle, and search in the page toolbar.
Going through `DataTable` would have cost three render hatches, so it stops at
`useListState` / `useListTable`. See
[`use-files-list-params.ts`](../src/modules/files/hooks/use-files-list-params.ts).

That is the layering working, not a workaround. If another list needs the same, take
the same route rather than bending `DataTable`.

Bulk selection still reaches it: its body maps `row.getVisibleCells()` generically, so
the injected checkbox column renders there with no special case, and it composes
`DataTableBulkBar` into the same header slot `DataTable` uses. What it needs beyond the
usual wiring is the `scope` key above, and `selection: undefined` in grid view.

Files also carries the one rule the other lists do not: **deleting a folder does not
delete what is in it.** The API refuses a folder that still has items, exactly as the
single delete does, so a bulk selection reports those back rather than emptying them.
Files are deleted before folders so that emptying a folder and removing it in one
selection works; a folder nested inside another selected folder still fails, and says
why.
