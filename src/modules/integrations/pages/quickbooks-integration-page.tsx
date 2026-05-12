import { useEffect } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Skeleton } from '@/app/components/ui/skeleton';
import { QuickBooksStatusCard } from '@/modules/integrations/components/quickbooks-status-card';
import {
  useDisconnectQuickBooksMutation,
  useQuickBooksStatusQuery,
  useStartQuickBooksConnectionMutation,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

function QuickBooksPageLoading() {
  return (
    <div className="container-fluid space-y-4 py-7.5">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export default function QuickBooksIntegrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusQuery = useQuickBooksStatusQuery();
  const startConnection = useStartQuickBooksConnectionMutation();
  const disconnect = useDisconnectQuickBooksMutation();

  useEffect(() => {
    const result = searchParams.get('quickbooks');
    if (!result) return;

    if (result === 'connected') {
      toast.success('QuickBooks connected.');
      void statusQuery.refetch();
    }

    if (result === 'disconnected') {
      toast.info('QuickBooks has been disconnected.');
      void statusQuery.refetch();
    }

    if (result === 'error') {
      toast.error(searchParams.get('reason') ?? 'QuickBooks connection failed.');
    }

    const next = new URLSearchParams(searchParams);
    next.delete('quickbooks');
    next.delete('reason');
    next.delete('realmId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, statusQuery]);

  if (statusQuery.isLoading) {
    return <QuickBooksPageLoading />;
  }

  if (statusQuery.isError || !statusQuery.data) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load integrations"
          onRetry={() => void statusQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container-fluid space-y-4 py-7.5">
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Integrations
            </div>
            <ToolbarPageTitle>QuickBooks Online</ToolbarPageTitle>
          </ToolbarHeading>
        </ToolbarWrapper>
      </Toolbar>

      <QuickBooksStatusCard
        status={statusQuery.data}
        isConnecting={startConnection.isPending}
        isDisconnecting={disconnect.isPending}
        onConnect={() => startConnection.mutate()}
        onDisconnect={() => disconnect.mutate()}
      />
    </div>
  );
}
