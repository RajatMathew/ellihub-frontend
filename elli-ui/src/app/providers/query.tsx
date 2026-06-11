import { useState, type ReactNode } from 'react';

import { activityLogKeys } from '@/app/hooks/activity-log.keys';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const defaultOptions = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
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
