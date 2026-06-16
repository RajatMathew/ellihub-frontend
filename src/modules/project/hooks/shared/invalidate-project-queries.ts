import type { QueryClient, QueryKey } from '@tanstack/react-query';

export async function invalidateProjectQueries(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
) {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: 'all' }),
    ),
  );
}
