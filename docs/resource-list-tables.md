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
| `f.dateRange` | From/to pair owning two URL keys. |
| `f.hidden` | No control. Arrives by deep link, still reaches the request and `clearFilters`. |
| `f.custom` | Anything else. If you reach for this more than twice across the app, widen the schema instead. |

Options shared by every kind: `apiKey`, `parse`, `serialize`, `toApiValue`,
`defaultValue`, `clientPredicate`, `onClear`.

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
