import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState,
} from '@tanstack/react-table';

import { createSelectionColumn, type ListSelectionConfig } from './data-table-selection';
import type { AnyFilterDef } from './types';
import type { ListState } from './use-list-state';

/**
 * Filter values are always strings at the URL layer, but each `FilterDef` narrows
 * its own value type. Reading the predicate off the union collapses its parameter
 * to `never` through contravariance, so predicates are collected through this
 * widened shape — the schema guarantees the value belongs to that filter.
 */
type ClientPredicate<TData> = (row: TData, value: string) => boolean;

/**
 * The slice of a React Query result this hook needs. Kept structural so callers
 * can pass a query result directly without the kit depending on React Query.
 */
export interface ListQueryStatus {
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export interface UseListTableOptions<
  TData extends object,
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string,
> {
  state: ListState<TDefs, TField>;
  columns: ColumnDef<TData>[];
  /**
   * In `server` mode, the rows for the current page. In `client` mode, the whole
   * collection — sorting and pagination are then applied in memory.
   */
  rows: TData[];
  /** Server-reported total across all pages. Ignored in `client` mode. */
  totalCount?: number;
  /**
   * `server` (default): the API paginates and sorts; the URL drives the request.
   * `client`: the query returns everything at once and the table does the work.
   * Do not mix — a client-mode table must not send page/sort to its API.
   */
  mode?: 'server' | 'client';
  query: ListQueryStatus;
  /** Stable business id. Strongly preferred over the row index. */
  getRowId?: (row: TData) => string;
  /**
   * Controlled, not initial: a column's visibility often depends on the rows
   * themselves — hide a column no row on this page populates.
   */
  columnVisibility?: VisibilityState;
  /**
   * Another query the list cannot be rendered without — an integration's sync
   * status, say. Counted as initial loading so the header and the body agree,
   * rather than the body briefly rendering against data that is not ready.
   */
  extraLoading?: boolean;
  /**
   * Turns on row selection and prepends the kit's checkbox column. Omit it and
   * the table renders exactly as it did before — nothing about a list without
   * bulk actions changes.
   *
   * Keep the object and its callbacks stable (module scope, or `useCallback`).
   * A fresh object every render rebuilds the column list every render.
   */
  selection?: ListSelectionConfig<TData>;
}

export interface ListSelection<TData> {
  /** Whether the table is rendering checkboxes at all. */
  isEnabled: boolean;
  count: number;
  /**
   * The selected rows themselves, including rows on pages no longer loaded.
   * Snapshotted when checked, so a bulk action can name what it is about to act on.
   */
  rows: TData[];
  ids: string[];
  /**
   * The same rows as `{ id, label }`, labelled by the config's `getRowLabel`.
   * A confirm dialog can name what it is about to delete without the page
   * writing that mapping again.
   */
  items: { id: string; label: string }[];
  clear: () => void;
  /**
   * Unchecks specific rows, leaving the rest selected. For a bulk action that
   * partly succeeded: the records it handled leave the selection and the ones it
   * could not stay checked, so the user is looking at exactly what is left.
   */
  deselect: (ids: string[]) => void;
}

export interface ListTable<TData extends object> {
  table: Table<TData>;
  /** Total to display: the client-filtered count when a client filter is active. */
  totalCount: number;
  /** First load, or a refetch with nothing to show yet. Render skeletons. */
  isInitialLoading: boolean;
  /** Background refetch with rows already on screen. Keep the rows, show progress. */
  isRefreshing: boolean;
  isError: boolean;
  retry: () => void;
  selection: ListSelection<TData>;
}

/**
 * Wires a `useListState` schema to a TanStack table.
 *
 * Replaces the ~48 lines of pagination/sorting boilerplate currently repeated in
 * thirteen list pages. Everything it derives — page count, sorting state, both
 * change handlers, the loading flags, the page clamp — was previously hand-written
 * per page, with the inconsistencies that implies.
 */
export function useListTable<
  TData extends object,
  TDefs extends readonly AnyFilterDef<never>[],
  TField extends string,
>({
  state,
  columns,
  rows,
  totalCount = 0,
  query,
  getRowId,
  columnVisibility,
  extraLoading = false,
  mode = 'server',
  selection,
}: UseListTableOptions<TData, TDefs, TField>): ListTable<TData> {
  const isClient = mode === 'client';
  const { page, size, sortBy, sortOrder, setPage, setSize, setSort } = state;

  // Client-side filters run here rather than in the request. A filter opts in by
  // supplying `clientPredicate`; nothing else about it changes.
  const { rawValues } = state;

  const filteredRows = useMemo(() => {
    const active: { predicate: ClientPredicate<TData>; value: string }[] = [];

    for (const def of state.filters as readonly AnyFilterDef<TData>[]) {
      const value = rawValues[def.key];

      if (def.clientPredicate && value !== undefined) {
        active.push({ predicate: def.clientPredicate as ClientPredicate<TData>, value });
      }
    }

    if (active.length === 0) return rows;

    return rows.filter((row) => active.every(({ predicate, value }) => predicate(row, value)));
  }, [rawValues, rows, state.filters]);

  const hasClientFilter = filteredRows !== rows;
  const effectiveTotal = isClient || hasClientFilter ? filteredRows.length : totalCount;
  const pageCount = Math.max(1, Math.ceil(effectiveTotal / size));

  const sorting = useMemo<SortingState>(
    () => [{ desc: sortOrder === 'desc', id: sortBy }],
    [sortBy, sortOrder]
  );

  const isInitialLoading =
    extraLoading || query.isLoading || (query.isFetching && rows.length === 0);
  // Rows must actually be on screen for this to mean anything — otherwise the
  // "Refreshing" indicator would sit on top of an empty state.
  const isRefreshing = rows.length > 0 && query.isFetching && !isInitialLoading;

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { canSelect, getRowLabel, ineligibleReason, scope } = selection ?? {};

  // A column that declares nothing sorts if — and only if — the list declared its
  // id as a sort field. TanStack defaults `enableSorting` to true, and `setSort`
  // ignores a field the API cannot sort by, so the default used to render a sort
  // control that responded to clicks and changed nothing. A column that sets the
  // flag explicitly is left alone.
  const sortFields = state.sortFields;

  const resolvedColumns = useMemo(() => {
    const sortable = new Set<string>(sortFields ?? []);

    const withSorting = columns.map((column) => {
      if (column.enableSorting !== undefined) return column;

      const id = column.id ?? ('accessorKey' in column ? String(column.accessorKey) : undefined);

      return { ...column, enableSorting: id !== undefined && sortable.has(id) };
    });

    if (!getRowLabel) return withSorting;

    return [
      createSelectionColumn<TData>({ canSelect, getRowLabel, ineligibleReason }),
      ...withSorting,
    ];
  }, [canSelect, columns, getRowLabel, ineligibleReason, sortFields]);

  const table = useReactTable({
    columns: resolvedColumns,
    data: filteredRows,
    enableRowSelection: !getRowLabel ? false : canSelect ? (row) => canSelect(row.original) : true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
    getSortedRowModel: isClient ? getSortedRowModel() : undefined,
    manualPagination: !isClient,
    manualSorting: !isClient,
    onPaginationChange: (updater) => {
      const previous = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(previous) : updater;

      if (next.pageSize !== size) {
        setSize(next.pageSize);
        return;
      }
      if (next.pageIndex + 1 !== page) setPage(next.pageIndex + 1);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const column = next[0];

      if (!column) {
        state.resetSort();
        return;
      }

      setSort(column.id, column.desc ? 'desc' : 'asc');
    },
    // In client mode TanStack derives this from the row count itself.
    pageCount: isClient ? undefined : pageCount,
    state: {
      columnVisibility,
      pagination: { pageIndex: page - 1, pageSize: size },
      rowSelection,
      sorting,
    },
  });

  // Deleting the last row of the last page, or a filter shrinking the total,
  // can strand the user on a page that no longer exists.
  useEffect(() => {
    if (isInitialLoading || query.isError) return;

    const lastPage = effectiveTotal === 0 ? 1 : Math.ceil(effectiveTotal / size);
    if (page > lastPage) setPage(lastPage);
  }, [effectiveTotal, isInitialLoading, page, query.isError, setPage, size]);

  // Gated on selection being on at all: a list that turns it off — Files does,
  // in grid view, where there are no checkboxes to uncheck with — must report an
  // empty selection, not a count nothing on screen can clear.
  const selectedIds = useMemo(
    () => (getRowLabel ? Object.keys(rowSelection).filter((id) => rowSelection[id]) : []),
    [getRowLabel, rowSelection]
  );

  // TanStack keeps a selected id in `rowSelection` when the user pages away, but
  // `getSelectedRowModel()` only ever sees the page currently loaded. Cache each
  // row the moment it is checked so a bulk action can still name — and act on —
  // rows from earlier pages. Entries are dropped as soon as they are deselected,
  // so the cache never outgrows the selection.
  const snapshot = useRef(new Map<string, TData>());

  const pageRows = table.getRowModel().rows;

  const selectedRows = useMemo(() => {
    const cache = snapshot.current;

    for (const row of pageRows) {
      if (rowSelection[row.id]) cache.set(row.id, row.original);
    }

    for (const id of cache.keys()) {
      if (!rowSelection[id]) cache.delete(id);
    }

    return selectedIds.flatMap((id) => {
      const row = cache.get(id);
      return row ? [{ id, row }] : [];
    });
  }, [pageRows, rowSelection, selectedIds]);

  const selectedItems = useMemo(
    () => (getRowLabel ? selectedRows.map(({ id, row }) => ({ id, label: getRowLabel(row) })) : []),
    [getRowLabel, selectedRows]
  );

  const clearSelection = useCallback(() => setRowSelection({}), []);

  const deselect = useCallback((ids: string[]) => {
    if (ids.length === 0) return;

    setRowSelection((previous) => {
      const next = { ...previous };
      for (const id of ids) delete next[id];
      return next;
    });
  }, []);

  // Anything that changes *which* records the list is showing invalidates the
  // selection: the user would otherwise carry checked rows into a result set
  // they can no longer see and delete them blind. Paging deliberately does not
  // reset — that is the case selection is meant to survive.
  // Selection being switched off counts as a scope change, so the checked ids
  // are dropped rather than waiting silently to reappear.
  const selectionScope = [
    JSON.stringify(rawValues),
    sortBy,
    sortOrder,
    size,
    scope ?? '',
    getRowLabel ? 'on' : 'off',
  ].join('|');
  const scopeRef = useRef(selectionScope);

  if (scopeRef.current !== selectionScope) {
    scopeRef.current = selectionScope;
    // Read the raw state, not `selectedIds` — that is already empty when
    // selection is off, which is exactly the case that needs clearing.
    if (Object.keys(rowSelection).length > 0) setRowSelection({});
  }

  // Memoized as a whole: a page reads `list.selection` straight into effect and
  // callback dependencies, and a fresh object — or a fresh `rows` array — every
  // render would re-fire all of them.
  const selectionApi = useMemo<ListSelection<TData>>(
    () => ({
      clear: clearSelection,
      count: selectedIds.length,
      deselect,
      ids: selectedIds,
      isEnabled: Boolean(getRowLabel),
      items: selectedItems,
      rows: selectedRows.map(({ row }) => row),
    }),
    [clearSelection, deselect, getRowLabel, selectedIds, selectedItems, selectedRows]
  );

  return {
    isError: query.isError,
    isInitialLoading,
    isRefreshing,
    retry: query.refetch,
    selection: selectionApi,
    table,
    totalCount: effectiveTotal,
  };
}
