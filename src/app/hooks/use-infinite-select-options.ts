import { useMemo } from 'react';

import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';

export type InfiniteSelectOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
};

type PaginatedOptionResponse<TItem> = {
  data: TItem[];
  pagination: {
    currentPage: number;
    hasNextPage: boolean;
  };
};

type UseInfiniteSelectOptionsParams<TItem, TOption extends InfiniteSelectOption> = {
  queryKey: QueryKey;
  queryFn: (page: number) => Promise<PaginatedOptionResponse<TItem>>;
  mapItemToOption: (item: TItem) => TOption;
  selectedOptions?: TOption[];
  enabled?: boolean;
};

const EMPTY_OPTIONS: InfiniteSelectOption[] = [];

function dedupeOptions<TOption extends InfiniteSelectOption>(options: TOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

export function useInfiniteSelectOptions<TItem, TOption extends InfiniteSelectOption>({
  queryKey,
  queryFn,
  mapItemToOption,
  selectedOptions = EMPTY_OPTIONS as TOption[],
  enabled = true,
}: UseInfiniteSelectOptionsParams<TItem, TOption>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(Number(pageParam)),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    enabled,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data?.pages]
  );

  const options = useMemo(() => {
    const fetched = items.map(mapItemToOption);

    return dedupeOptions([...selectedOptions, ...fetched]);
  }, [items, mapItemToOption, selectedOptions]);

  return {
    items,
    options,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
  };
}
