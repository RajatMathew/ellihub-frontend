import { useState, type ReactNode } from 'react';

import { activityLogKeys } from '@/app/hooks/activity-log.keys';
import { shouldRetryQuery } from '@/app/lib/query-retry';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const defaultOptions = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      // Not a bare `retry: 1`, which retried a 401, 403 and 404 too — see
      // query-retry.ts for which failures can actually change on a second ask.
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
  },
};

function createQueryClient() {
  const queryClient = new QueryClient({
    ...defaultOptions,
    mutationCache: new MutationCache({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: activityLogKeys.all });
      },
    }),
  });

  return queryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
