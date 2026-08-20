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
