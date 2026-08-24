import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';

/**
 * The query behind a paginated list.
 *
 * Exists for one option. Without `placeholderData: keepPreviousData`, every
 * filter, sort, page or page-size change mints a query key with no cached data,
 * so `isLoading` is true, so `useListTable` reports an initial load, so the
 * whole table body is replaced by skeleton rows and then replaced again. Only
 * one of the fifteen server-paginated lists had set it, which made a filter
 * change look like a page load on the other fourteen.
 *
 * The kit could not fix this from the inside: it owns the URL state and the
 * rendering, but each module writes its own `useQuery`. So it owns the query
 * too — thinly, and only for lists.
 *
 * Everything `useQuery` accepts still passes through, including `enabled` for a
 * list that cannot run until its parent id resolves.
 *
 * @example
 * export const useVendorsQuery = (params?: ListVendorsParams) =>
 *   useListQuery({
 *     queryKey: [...vendorsKeys.list(), params],
 *     queryFn: () => vendorsApi.list(params),
 *   });
 *
 * Not for lists that fetch everything once and filter in memory — a `client`
 * mode table's query key never changes, so there is nothing to keep.
 */
export function useListQuery<TData, TError = Error>(
  options: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'placeholderData'>
): UseQueryResult<TData, TError> {
  return useQuery({ ...options, placeholderData: keepPreviousData });
}
